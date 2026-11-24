import path from 'node:path'
import {homedir} from 'node:os'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,command,instant,readJSON,saveJSON} from '../core/io.mjs'
import {preflight} from '../core/preflight.mjs'

const archive=path.join(ROOT,'proof/hard-v4')
const summary=await readJSON(path.join(archive,'kane-summary.json'))
const rows=[]
for(const {task,phases} of summary.results.filter(row=>row.status==='blocked')) {
  const phase=phases.find(phase=>phase.name==='before')
  const resultFile=path.join(path.dirname(phase.evidencePack),'result.json')
  const result=await readJSON(path.join(ROOT,resultFile))
  const historicalSession=path.join(homedir(),'.testmuai/kaneai/sessions',phase.runId,'session.json')
  const session=await readJSON(historicalSession).catch(error=>{if(error.code!=='ENOENT') throw error})
  const har=await command('unzip',['-p',phase.evidencePack,'*/0-network.har'])
  if(har.code!==0) throw new Error(har.stderr)
  const page=new URL(task.url)
  const entries=JSON.parse(har.stdout).log.entries.filter(entry=>{
    const address=new URL(entry.request.url)
    return address.hostname===page.hostname && ['/','/about'].includes(address.pathname)
  }).map(entry=>({url:entry.request.url,status:entry.response.status}))
  const allowedPaths=[page.pathname,...task.outcomeChecks.filter(check=>check.kind==='url-path').map(check=>check.equals)]
  if(!entries.some(entry=>new URL(entry.url).pathname==='/about' && entry.status===0) || allowedPaths.includes('/about')) {
    throw new Error('Historical trace does not support the expected blocked parent link for '+task.id)
  }
  const access=await preflight(task)
  rows.push({id:task.id,url:task.url,historical:{kaneRunId:phase.runId,sessionLogAvailable:Boolean(session),resultFile,evidencePack:phase.evidencePack,
    reason:result.reason,parentLink:'/about',allowedPaths,requests:entries,balanceDebited:phase.balance-phase.after},access})
  console.log(task.url,access.status,access.lanes.find(lane=>lane.status==='blocked')?.reason??'')
  await delay(900)
}
await saveJSON(path.join(archive,'preflight-v5.json'),{runner:'playwright-cdp',checkedAt:instant(),
  historicalFinding:'All three historical runs loaded the task page and followed a parent /about link outside the registered journey. The browser route guard aborted that path, producing ERR_FAILED.',
  total:rows.length,passed:rows.filter(row=>row.access.status==='pass').length,rows})
