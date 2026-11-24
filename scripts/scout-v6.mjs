import assert from 'node:assert/strict'
import {appendFile,mkdir,readFile} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
import path from 'node:path'
import {chromium} from 'playwright'
import {ROOT,instant} from '../core/io.mjs'
import {guardRequests} from '../core/chrome.mjs'
import {pageBlock} from '../core/access.mjs'
import {normalizeTask,taskNavigation} from '../core/task.mjs'
import {preflight} from '../core/preflight.mjs'
import {frozen,read,save} from './freeze-v6.mjs'
import {git,hostExclusion,sha256} from './scout-v4.mjs'

const scratch=path.join(ROOT,'.curbcut/v6')
const objective={
  'missing-alt':'Find the pictured information and report its alternative text in Reading view.',
  'empty-link':'Find the visually indicated link by its purpose in Reading view.',
  'empty-button':'Find the visually indicated button by its purpose in Reading view.',
  'low-contrast':'Read the selected passage at WCAG AA contrast.',
  'missing-language':'Check that the document declares the primary language of its visible text.'
}
const persona=category=>category==='low-contrast'?'low-contrast-simulation':
  category==='missing-language'?'document-language':'screen-reader-view'

const freeze=await frozen()
const sample=await read('sample.json')
const receipt=freeze.inputs['sample.json']
assert.equal(await git(['hash-object','--no-filters','proof/heldout-v6/sample.json']),receipt.blob)
const runtime=await readFile(path.join(ROOT,'extension/runtime.js'),'utf8')
const pool=await chromium.launch({channel:'chromium',headless:true})
const journal=path.join(scratch,'scout-'+receipt.blob+'.ndjson')
await mkdir(scratch,{recursive:true})
const previous=await readFile(journal,'utf8').catch(error=>{if(error.code!=='ENOENT') throw error;return ''})
const results=new Map(previous.trim().split('\n').filter(Boolean).map(line=>{const row=JSON.parse(line);return [row.site,row]}))
const remaining=sample.sites.filter(row=>!results.has(row.site))

async function titleFor(context,base,href) {
  if(!href || !taskNavigation(new URL(base),new URL(href))) return null
  const page=await context.newPage()
  try {
    const response=await page.goto(href,{waitUntil:'domcontentloaded',timeout:5000})
    if(await pageBlock(page,response)) return null
    return (await page.title()).slice(0,180)
  } catch {return null}
  finally {await page.close()}
}

async function discover(entry) {
  const base=new URL(entry.url)
  const context=await pool.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:false})
  try {
    await guardRequests(context,entry)
    await context.addInitScript({content:runtime})
    const page=await context.newPage()
    const response=await page.goto(entry.url,{waitUntil:'domcontentloaded',timeout:9000})
    const url=page.url()
    if(!taskNavigation(base,new URL(url)) || hostExclusion.test(new URL(url).hostname)) return {status:'out-of-scope',url}
    const blocked=await pageBlock(page,response)
    if(blocked) return {status:'blocked',url,reason:blocked}
    await delay(450)
    const {names,contrast,language}=await page.evaluate(()=>CurbCut.discoverCoverage())
    const chosen=[names[0],contrast,language,...names.slice(1)].filter(Boolean).slice(0,3)
    const candidates=[]
    for(const detail of chosen) {
      let crop
      if(detail.role) {
        const bytes=await page.locator(detail.selector).screenshot({timeout:1800,animations:'disabled'}).catch(()=>null)
        if(!bytes) continue
        crop=bytes.toString('base64')
        detail.targetTitle=await titleFor(context,url,detail.href)
      }
      const id='v6-'+sha256([url,detail.category,detail.selector].join('\n')).slice(0,20)
      const task=await normalizeTask({id,url,persona:persona(detail.category),task:objective[detail.category],
        observedSelector:detail.selector,evaluation:{category:detail.category,text:detail.text,role:detail.role}})
      candidates.push({task,detail,...(crop?{crop}:{})})
    }
    return {status:'scouted',url,candidates}
  } catch(error) {return {status:'unavailable',reason:error.message.split('\n')[0]}}
  finally {await context.close()}
}

let writes=Promise.resolve()
try {
  async function worker() {
    while(remaining.length) {
      const entry=remaining.shift()
      const record=await discover(entry)
      const laneCache=new Map()
      for(const candidate of record.candidates??[]) {
        const key=candidate.task.persona
        if(!laneCache.has(key)) laneCache.set(key,await preflight(candidate.task,{navigationTimeout:9000}).catch(error=>({status:'inconclusive',reason:error.message.split('\n')[0]})))
        candidate.access=laneCache.get(key)
      }
      const row={...entry,...record,checkedAt:instant()}
      results.set(entry.site,row)
      writes=writes.then(()=>appendFile(journal,JSON.stringify(row)+'\n'))
      await writes
      if(results.size%10===0) console.log(results.size+'/'+sample.count,'sites processed')
      await delay(sample.pauseMillis)
    }
  }
  await Promise.all(Array.from({length:sample.concurrency},worker))
} finally {await pool.close()}

const rows=sample.sites.map(({site})=>results.get(site))
const tasks=rows.flatMap(row=>(row.candidates??[]).filter(candidate=>candidate.access.status==='pass'))
await save('scouting.json',{sample:receipt,frozenCommit:freeze.frozenCommit,attempted:rows.length,
  rows:rows.map(({candidates,...row})=>({...row,candidates:candidates?.map(({task,access,crop})=>({id:task.id,category:task.evaluation.category,access:access.status,
    ...(crop?{cropSha256:sha256(Buffer.from(crop,'base64'))}:{})}))}))})
await save('registration.json',{sample:receipt,frozenCommit:freeze.frozenCommit,registeredAt:instant(),
  capPerSite:3,capPerCategoryPerSite:1,tasks})
console.log('Registered',tasks.length,'preflight-passing tasks across',rows.length,'sites')
