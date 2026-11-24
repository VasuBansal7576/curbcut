import assert from 'node:assert/strict'
import {appendFile,mkdir,readFile} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
import {chromium} from 'playwright'
import path from 'node:path'
import {ROOT,instant} from '../core/io.mjs'
import {sha256} from './scout-v4.mjs'
import {frozen,input,read,save} from './freeze-v7.mjs'
import {visit,collect,captureNames} from './jev-v7-browser.mjs'

const freeze=await frozen()
const receipt=await input('sample.json')
assert.deepEqual(receipt,freeze.inputs['sample.json'])
const sample=await read('sample.json')
const scratch=path.join(ROOT,'.curbcut/v7')
await mkdir(scratch,{recursive:true})
const journal=path.join(scratch,'scout-'+receipt.blob+'.ndjson')
const prior=await readFile(journal,'utf8').catch(error=>{if(error.code!=='ENOENT') throw error;return ''})
const rows=new Map(prior.trim().split('\n').filter(Boolean).map(line=>{const row=JSON.parse(line);return [row.site,row]}))
const queue=sample.sites.filter(row=>!rows.has(row.site))
const browser=await chromium.launch({channel:'chromium',headless:true})
let writing=Promise.resolve()
const objectives={button:'Find the selected unnamed button by its purpose in Reading view.',
  link:'Find the selected unnamed link by its destination in Reading view.',
  img:'Find the selected picture and report the information it conveys in Reading view.'}

async function scout(entry) {
  return visit(browser,entry.url,async page=>{
    const state=await collect(page)
    if(!state) return {status:'sensitive'}
    const url=page.url()
    const id=(category,selector)=>'v7-'+sha256([url,category,selector].join('\n')).slice(0,20)
    const selected=Object.values(Object.groupBy(state.targets,row=>row.role)).map(rows=>rows[0])
    const crops=await captureNames(page,{...state,targets:selected})
    const candidates=crops.map(({target,crop})=>{
      const {selector,role}=target
      const category={button:'empty-button',link:'empty-link',img:'missing-alt'}[role]
      return {task:{id:id(category,selector),url,persona:'screen-reader-view',task:objectives[role],observedSelector:selector,evaluation:{category,role}},
        detail:target,crop:crop.split(',')[1]}
    })
    if(!state.language?.trim() && state.sample.match(/\p{L}/gu)?.length>=60) {
      const category='missing-language'
      candidates.push({task:{id:id(category,'html'),url,persona:'document-language',task:'Identify the primary language of visible text.',
        observedSelector:'html',evaluation:{category}},detail:{sample:state.sample}})
    }
    return {status:'scouted',url,candidates}
  })
}
try {
  async function worker() {
    while(queue.length) {
      const entry=queue.shift()
      const result=await scout(entry)
      const row={...entry,...result,checkedAt:instant()}
      rows.set(entry.site,row)
      writing=writing.then(()=>appendFile(journal,JSON.stringify(row)+'\n'))
      await writing
      if(rows.size%10===0) console.log(rows.size+'/'+sample.count,'sites processed')
      await delay(sample.pauseMillis)
    }
  }
  await Promise.all(Array.from({length:sample.concurrency},worker))
} finally {await browser.close()}
const ordered=sample.sites.map(({site})=>rows.get(site))
const tasks=ordered.flatMap(row=>row.candidates??[])
await save('scouting.json',{sample:receipt,frozenCommit:freeze.frozenCommit,attempted:ordered.length,
  rows:ordered.map(({candidates,...row})=>({...row,candidates:candidates?.map(({task,crop})=>({id:task.id,category:task.evaluation.category,
    ...(crop?{cropSha256:sha256(Buffer.from(crop,'base64'))}:{})}))}))})
await save('registration.json',{sample:receipt,frozenCommit:freeze.frozenCommit,registeredAt:instant(),capPerRolePerSite:1,tasks})
console.log('Registered',tasks.length,'tasks across',ordered.length,'sites')
