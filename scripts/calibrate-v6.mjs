import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {requireKane,runKane} from '../core/kane.mjs'
import {ROOT,instant,saveJSON} from '../core/io.mjs'
import {session} from '../core/chrome.mjs'
import {serve} from '../core/server.mjs'

const fixtures=[{id:'low',color:170,expected:'moss cedar 8147',mustRead:false},
  {id:'aa',color:115,expected:'plum birch 3926',mustRead:true}]
const ratio=channel=>1.05/(((channel/255+0.055)/1.055)**2.4+0.05)
const balance=async()=>Number((await requireKane()).match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
const directory=path.join(ROOT,'proof/heldout-v6/calibration')
const scratch=await mkdtemp(path.join(tmpdir(),'curbcut-calibration-'))
const startedAt=instant()
let server
try {
  const initialBalance=await balance()
  process.env.CURBCUT_KANE_MIN_CREDITS=String(Math.max(1850,initialBalance-1485))
  server=await serve()
  const readings=[]
  for(const fixture of fixtures) {
    const task={id:'v6-calibration-'+fixture.id,url:'http://127.0.0.1:4317/fixtures/shop/v6/'+fixture.id+'.html',
      persona:'low-contrast-simulation',observedSelector:'#reference',
      task:'Report the exact three-part printed reference below “Read the printed reference below.” Use the screenshot only. If you cannot read every part, report the task as failed.'}
    const browser=await session(task,task.persona,null,scratch,{gate:true})
    let filter
    try {filter=await browser.page.locator('html').evaluate(el=>getComputedStyle(el).filter)}
    finally {await browser.abort()}
    let result
    try {result=await runKane(task,task.persona,null,path.join(directory,fixture.id),{maxSteps:6,timeout:100,assertionMode:'visual'})}
    catch(error) {result={status:'inconclusive',reason:error.message}}
    const heard=JSON.stringify([result.summary,result.reason,result.steps]).toLowerCase().includes(fixture.expected)
    readings.push({...fixture,ratio:ratio(fixture.color),filter,heard,status:result.status,runId:result.runId??null,
      pass:filter==='grayscale(1) contrast(0.22)' && (fixture.mustRead?heard && result.status==='pass':!heard && result.status==='fail')})
  }
  const finalBalance=await balance()
  const result={startedAt,initialBalance,finalBalance,creditsUsed:Number((initialBalance-finalBalance).toFixed(4)),
    passed:readings.every(row=>row.pass),readings}
  await saveJSON(path.join(directory,'summary.json'),result)
  console.log(JSON.stringify(result))
} finally {
  await new Promise(resolve=>server?server.close(resolve):resolve())
  await rm(scratch,{recursive:true,force:true})
}
