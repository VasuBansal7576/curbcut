import assert from 'node:assert/strict'
import {copyFile,readFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {chromium} from 'playwright'
import {francAll} from 'franc-min'
import {iso6393To1} from 'iso-639-3'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {guardRequests} from '../core/chrome.mjs'
import {pageBlock} from '../core/access.mjs'
import {observeCoverage} from '../core/coverage.mjs'
import validate from '../core/validate.generated.cjs'
import {sha256} from './scout-v4.mjs'

const folder='proof/heldout-v6/development-language'
const urls=['https://www.paulgraham.com/avg.html','https://www.berkshirehathaway.com/letters/1999htm.html',
  'https://www.norvig.com/sudoku.html']

export function agreementLanguage(text) {
  const letters=value=>[...value.matchAll(/\p{L}/gu)].length
  if(letters(text)<360) return null
  const midpoint=text.lastIndexOf(' ',Math.floor(text.length/2))
  if(midpoint<0) return null
  const parts=[text,text.slice(0,midpoint),text.slice(midpoint)]
  if(parts.slice(1).some(part=>letters(part)<150)) return null
  const ranks=parts.map(part=>francAll(part,{minLength:120}).slice(0,2))
  const code=ranks[0][0][0]
  if(code==='und' || ranks.some(([winner,runnerUp])=>winner[0]!==code || winner[1]-(runnerUp?.[1]??0)<0.006)) return null
  return {tag:iso6393To1[code]??code,method:'franc-min 6.2.0, full sample and both halves agree, margin 0.006',ranks}
}

async function measure() {
  const runtime=await readFile(path.join(ROOT,'extension/runtime.js'),'utf8')
  const browser=await chromium.launch({channel:'chromium',headless:true})
  const rows=[]
  try {
    for(const url of urls) {
      const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block',acceptDownloads:false})
      try {
        await guardRequests(context,{url})
        await context.addInitScript({content:runtime})
        const page=await context.newPage()
        const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000})
        const block=await pageBlock(page,response)
        if(block) {rows.push({url,status:'blocked',reason:block});continue}
        const address=new URL(page.url())
        const sample=await page.evaluate(()=>CurbCut.discoverCoverage().language?.sample??null)
        if(sample===null) {rows.push({url,status:'already-declared'});continue}
        const language=agreementLanguage(sample)
        if(!language) {rows.push({url,status:'uncertain'});continue}
        const id='v6-dev-lang-'+sha256(url).slice(0,20)
        const evidence=folder+'/'+id+'.json'
        const at=instant()
        const patch={id,url:address.href,site:address.hostname,match:address.origin+address.pathname,
          persona:'document-language',task:'Declare the language of the primary visible text.',
          barrier:'The document element omits the primary language.',observedSelector:'html',
          rules:[{selector:'html',action:'setLang',value:language.tag}],status:'locally-verified',
          evidence:{localMeasurement:evidence,verifiedAt:at},
          evaluation:{category:'missing-language',name:language.tag},
          history:[{at,event:'locally-verified',study:'Known development page, outside the held-out sample'}]}
        assert(validate(patch),JSON.stringify(validate.errors))
        const before=await observeCoverage(page,patch)
        await page.evaluate(patch=>{globalThis.undoDevelopmentLanguage=CurbCut.apply(patch)},patch)
        const after=await observeCoverage(page,patch,{enabled:true})
        await page.evaluate(()=>globalThis.undoDevelopmentLanguage())
        const restored=await observeCoverage(page,patch)
        const result={before,after,restored,language,sampleLength:sample.length,sampleSha256:sha256(sample),patch}
        const fixed=before.status==='fail' && after.status==='pass' && restored.status==='fail'
        await saveJSON(path.join(ROOT,evidence),result)
        rows.push({url,id,status:fixed?'locally-fixed':'unresolved',evidence})
        if(fixed) {
          const artifact=path.join(ROOT,folder,'release',id+'.json')
          await saveJSON(artifact,patch)
          await copyFile(artifact,path.join(ROOT,'patches',id+'.json'))
        }
      } catch(error) {rows.push({url,status:'unavailable',reason:error.message.split('\n')[0]})}
      finally {await context.close()}
    }
  } finally {await browser.close()}
  await saveJSON(path.join(ROOT,folder,'summary.json'),{runner:'playwright',checkedAt:instant(),rows})
  console.log(JSON.stringify(rows))
}

async function finalize() {
  const summary=await readJSON(path.join(ROOT,folder,'summary.json'))
  const audit=await readJSON(path.join(ROOT,'proof/heldout-v6/extension-e2e.json'))
  for(const row of summary.rows.filter(row=>row.status==='locally-fixed')) {
    const id=row.id
    const file=path.join(ROOT,'patches',id+'.json')
    const result=audit.results.find(task=>task.id===id)
    row.installed=result?.status??'not-run'
    if(row.installed==='pass') {
      const archived=await readFile(path.join(ROOT,folder,'release',id+'.json'))
      assert(archived.equals(await readFile(file)))
      row.shippedSha256=sha256(archived)
    } else await rm(file,{force:true})
  }
  await saveJSON(path.join(ROOT,folder,'summary.json'),summary)
}

if(process.argv[1]?.endsWith('language-development-v6.mjs')) {
  if(process.argv[2]==='finalize') await finalize()
  else await measure()
}
