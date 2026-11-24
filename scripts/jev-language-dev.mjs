import {chromium} from 'playwright'
import {setTimeout as delay} from 'node:timers/promises'
import {chooseLanguage} from '../core/jev-decisions.js'
import {observeCoverage} from '../core/coverage.mjs'
import {jevKey} from '../core/jev.mjs'
import {readJSON,saveJSON,instant} from '../core/io.mjs'
import {visit,collect} from './jev-v7-browser.mjs'

const {rows:reference}=await readJSON('proof/heldout-v6/development-language/summary.json')
const key=await jevKey()
const browser=await chromium.launch({channel:'chromium',headless:true})
const rows=[]
try {
  for(const {id,url,evidence} of reference) {
    const expected=(await readJSON(evidence)).after.measurement.lang
    const result=await visit(browser,url,async page=>{
      const state=await collect(page)
      if(!state) return {status:'sensitive'}
      const decision=await chooseLanguage(key,state.sample)
      if(decision.tag!==expected) return {status:decision.tag?'incorrect':'abstained',decision}
      const task={id,url,observedSelector:'html',persona:'document-language',task:'Identify the primary language of visible text.',evaluation:{category:'missing-language',name:expected}}
      const before=await observeCoverage(page,task)
      if(before.status!=='fail') return {status:'baseline-'+before.status,before,decision}
      const patch={...task,barrier:'The document is missing its primary language.',status:'candidate',evidence:{},history:[],site:new URL(url).hostname,match:url,rules:[{selector:'html',action:'setLang',value:decision.tag}]}
      await page.evaluate(patch=>{globalThis.undo=CurbCut.apply(patch)},patch)
      const after=await observeCoverage(page,task,{enabled:true})
      await page.evaluate(()=>globalThis.undo())
      const restored=await observeCoverage(page,task)
      return {status:after.status==='pass' && restored.status==='fail'?'locally-fixed':'replay-failed',before,after,restored,decision}
    })
    rows.push({id,url,evidence,expected,...result})
    await delay(950)
  }
} finally {await browser.close()}
await saveJSON('proof/jev/language-development.json',{runner:'playwright',checkedAt:instant(),rows})
console.log(rows.map(({url,status,decision})=>({url,status,tag:decision?.tag})))
