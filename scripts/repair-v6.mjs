import assert from 'node:assert/strict'
import path from 'node:path'
import {mkdir,readFile,appendFile} from 'node:fs/promises'
import {chromium} from 'playwright'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,instant} from '../core/io.mjs'
import {guardRequests} from '../core/chrome.mjs'
import {pageBlock} from '../core/access.mjs'
import {proposeCoverageNames} from '../core/agent.mjs'
import {categories,coverageRule,detectLanguage,observeCoverage} from '../core/coverage.mjs'
import {forbiddenJourneyAction} from '../core/task.mjs'
import {match} from '../core/engine.js'
import {frozen,input,read,save} from './freeze-v6.mjs'
import {sha256} from './scout-v4.mjs'

const freeze=await frozen()
const registrationInput=await input('registration.json')
const registration=await read('registration.json')
assert.equal(registration.frozenCommit,freeze.frozenCommit)
assert(registration.tasks.every(row=>row.access.status==='pass'))
const scratch=path.join(ROOT,'.curbcut/v6')
await mkdir(scratch,{recursive:true})
const runtime=await readFile(path.join(ROOT,'extension/runtime.js'),'utf8')
const names=registration.tasks.filter(row=>row.task.evaluation.role)
const proposedFile='naming.json'
const priorNames=await read(proposedFile).catch(error=>{if(error.code!=='ENOENT') throw error})
const batches=priorNames?.batches??[]
const proposals=new Map(batches.flatMap(batch=>batch.entries.map(entry=>[entry.id,entry])))
let failures=batches.filter(batch=>batch.error).length

async function propose() {
  const pending=names.filter(row=>!proposals.has(row.task.id))
  for(let index=0;index<pending.length && failures<2;index+=8) {
    const cases=pending.slice(index,index+8)
    let result
    try {result=await proposeCoverageNames(cases)}
    catch(error) {failures++;result={writer:'codex exec',error:error.message,entries:cases.map(()=>({name:null,basis:'Proposal execution failed.'}))}}
    const entries=result.entries.map(({name,basis},i)=>({id:cases[i].task.id,name:name?.trim()??null,basis,
      cropSha256:sha256(Buffer.from(cases[i].crop,'base64'))}))
    for(const entry of entries) proposals.set(entry.id,entry)
    batches.push({...result,entries})
    await save(proposedFile,{registration:registrationInput,batches})
  }
}

const browser=await chromium.launch({channel:'chromium',headless:true})
const journal=path.join(scratch,'repair-'+registrationInput.blob+'.ndjson')
const previous=await readFile(journal,'utf8').catch(error=>{if(error.code!=='ENOENT') throw error;return ''})
const results=new Map(previous.trim().split('\n').filter(Boolean).map(line=>{const row=JSON.parse(line);return [row.id,row]}))
let writes=Promise.resolve()
async function repair(entry) {
  const {detail}=entry
  const {category,role}=entry.task.evaluation
  const proposal=role?proposals.get(entry.task.id):null
  const language=category==='missing-language'?detectLanguage(detail.sample):null
  const name=proposal?.name??language?.tag
  if(role && (name===undefined || (!name && role!=='img') || (role!=='img' && forbiddenJourneyAction(name)))) {
    return {status:'no-grounded-name',proposal}
  }
  if(category==='missing-language' && !name) return {status:'language-uncertain'}
  const controlTask=role?'Use the normal visual page. Identify this '+role+' with a single pointer click: '+(name||'the decorative picture')+'. The harness records the click and suppresses activation.':
    category==='low-contrast'?'Read the selected text in the normal visual page. Report it exactly.':undefined
  const task={...entry.task,...(controlTask?{controlTask}:{}),evaluation:{...entry.task.evaluation,...(name!==undefined?{name}:{})}}
  if(role) task.task='In Reading view, find the '+role+' identified by “'+(name||'decorative image')+'” and choose its row to report it. If no row conveys that name, report that the task failed.'
  const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:false})
  try {
    await guardRequests(context,task)
    await context.addInitScript({content:runtime})
    const page=await context.newPage()
    const response=await page.goto(task.url,{waitUntil:'domcontentloaded',timeout:10000})
    const blocked=await pageBlock(page,response)
    if(blocked) return {status:'unavailable',reason:blocked}
    await delay(450)
    const before=await observeCoverage(page,task)
    if(before.status!=='fail') return {status:'baseline-'+before.status,before}
    if(category==='missing-language') {
      const current=await page.evaluate(()=>CurbCut.discoverCoverage().language?.sample)
      if(!current || detectLanguage(current)?.tag!==name) return {status:'language-changed',before,language}
    }
    const rule=coverageRule(task,before.measurement,detail)
    if(!rule) return {status:'no-rule',before}
    const url=new URL(task.url)
    const barrier=category==='low-contrast'?'Text contrast is below WCAG AA for the rendered size and weight.':
      category==='missing-language'?'The document element omits the primary language.':role==='img'?'The visible image has no text alternative.':
      'The visible '+role+' has no accessible name.'
    const patch={...task,site:url.hostname,match:url.origin+url.pathname,barrier,rules:[rule],status:'candidate',evidence:{},history:[]}
    if(!match(patch,page.url())) return {status:'invalid-candidate',patch}
    await page.evaluate(patch=>{
      globalThis.__curbcutCoverageUndo=CurbCut.apply(patch)
    },patch)
    const after=await observeCoverage(page,task,{enabled:true})
    await page.evaluate(()=>globalThis.__curbcutCoverageUndo())
    const restored=await observeCoverage(page,task)
    if(after.status!=='pass' || restored.status!=='fail') return {status:'replay-failed',patch,before,after,restored,proposal,language}
    return {status:'locally-fixed',patch,before,after,restored,proposal,language}
  } catch(error) {return {status:'unavailable',reason:error.message.split('\n')[0]}}
  finally {await context.close()}
}

async function work(entries) {
  const remaining=entries.filter(row=>!results.has(row.task.id))
  async function worker() {
    while(remaining.length) {
      const entry=remaining.shift()
      const result=await repair(entry)
      const row={id:entry.task.id,category:entry.task.evaluation.category,checkedAt:instant(),...result}
      results.set(row.id,row)
      writes=writes.then(()=>appendFile(journal,JSON.stringify(row)+'\n'))
      await writes
      if(results.size%15===0) console.log('Measured',results.size,'/',registration.tasks.length)
      await delay(900)
    }
  }
  await Promise.all(Array.from({length:2},worker))
}

try {
  await work(registration.tasks.filter(row=>!row.task.evaluation.role))
  await propose()
  await work(names)
} finally {await browser.close()}

const rows=registration.tasks.map(({task})=>results.get(task.id))
const byCategory=Object.fromEntries(categories.map(category=>{
  const entries=rows.filter(row=>row.category===category)
  return [category,{fixed:entries.filter(row=>row.status==='locally-fixed').length,total:entries.length}]
}))
await save('local-summary.json',{runner:'playwright',registration:registrationInput,frozenCommit:freeze.frozenCommit,
  byCategory,finishedAt:instant(),rows})
console.log(JSON.stringify(byCategory))
