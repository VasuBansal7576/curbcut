import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {ROOT,instant,saveJSON} from '../core/io.mjs'
import {guardRequests,session} from '../core/chrome.mjs'
import {pageBlock} from '../core/access.mjs'
import {proposeCoverageNames} from '../core/agent.mjs'
import {requireKane,runKane} from '../core/kane.mjs'
import {serve} from '../core/server.mjs'

const url='http://127.0.0.1:4317/fixtures/shop/v6-name-pilot.html'
const root=path.join(ROOT,'proof/heldout-v6/name-pilot')
const scratch=await mkdtemp(path.join(tmpdir(),'curbcut-name-pilot-'))
let server,local,publicBrowser
try {
  const task={id:'v6-name-pilot',url,persona:'screen-reader-view',observedSelector:'#menu',
    evaluation:{category:'empty-button',role:'button'}}
  const calibration=JSON.parse(await readFile(path.join(ROOT,'proof/heldout-v6/calibration/summary.json'),'utf8'))
  process.env.CURBCUT_KANE_MIN_CREDITS=String(Math.max(1850,calibration.initialBalance-1485))
  const runtime=await readFile(path.join(ROOT,'extension/runtime.js'),'utf8')
  const publicLanes=[]
  publicBrowser=await chromium.launch({channel:'chromium',headless:true})
  for(const url of ['https://www.mass.edu/','https://csc.gov.in/','https://marinespecies.org/']) {
    const context=await publicBrowser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'})
    try {
      await guardRequests(context,{url})
      await context.addInitScript({content:runtime})
      const page=await context.newPage()
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:10000})
      const blocked=await pageBlock(page,response)
      const record=blocked?{reason:blocked}:await page.evaluate(()=>{
        const result=CurbCut.discoverCoverage()
        return {names:result.names.map(({category,selector,role})=>({category,selector,role})),contrast:Boolean(result.contrast),language:Boolean(result.language)}
      })
      publicLanes.push({url,runner:'playwright',...record})
    } catch(error) {publicLanes.push({url,runner:'playwright',reason:error.message.split('\n')[0]})}
    finally {await context.close()}
  }
  await publicBrowser.close()
  publicBrowser=null
  server=await serve()
  local=await session(task,'control',null,scratch,{local:true,gate:true})
  const {names}=await local.page.evaluate(()=>CurbCut.discoverCoverage())
  const detail=names.find(row=>row.role==='button')
  assert(detail)
  const crop=(await local.page.locator('#menu').screenshot()).toString('base64')
  await local.abort()
  local=null
  let proposal,proposalError
  for(let attempt=1;attempt<=2;attempt++) {
    try {proposal=await proposeCoverageNames([{crop,detail}]);break}
    catch(error) {proposalError=error.message}
  }
  const name=proposal?.entries[0]?.name||'Open site navigation'
  const definition={...task,evaluation:{...task.evaluation,name},
    task:'In Reading view, find the button named “'+name+'” and choose the named row to report it. If it is missing, mark the task as failed.',
    controlTask:'Use the normal visual page. Single-click the hamburger menu button beside the Public library heading.'}
  const patch={...definition,site:'127.0.0.1',match:url,barrier:'The menu button lacks a name.',rules:[{selector:'#menu',action:'addLabel',value:name}],
    status:'candidate',evidence:{},history:[]}
  const lanes=[]
  for(const [phase,expected] of Object.entries({before:'fail',control:'pass',after:'pass'})) {
    let run
    try {run=await runKane(definition,phase==='control'?'control':task.persona,phase==='after'?patch:null,path.join(root,phase),
      {maxSteps:7,timeout:105})}
    catch(error) {run={status:'inconclusive',reason:error.message}}
    lanes.push({phase,expected,status:run.status,reason:run.integrity??run.reason,runId:run.runId??null,video:run.video??null})
  }
  const finalBalance=Number((await requireKane()).match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
  const summary={finishedAt:instant(),publicLanes,proposal,proposalError,fixturePassed:lanes.every(row=>row.status===row.expected),lanes,finalBalance}
  await saveJSON(path.join(root,'summary.json'),summary)
  console.log(JSON.stringify(summary))
} finally {
  await local?.abort()
  await publicBrowser?.close()
  await new Promise(resolve=>server?server.close(resolve):resolve())
  await rm(scratch,{recursive:true,force:true})
}
