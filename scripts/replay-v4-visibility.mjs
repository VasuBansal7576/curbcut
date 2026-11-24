import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {replayLane} from '../core/probe.mjs'

const folder=path.join(ROOT,'proof/hard-v4')
const registration=await readJSON(path.join(folder,'registration.json'))
const historical=await readJSON(path.join(folder,'local-summary.json'))
const earlierKane=await readJSON(path.join(folder,'kane-summary.json'))
const prior=new Map(historical.results.map(row=>[row.task.id,row]))
const priorKanePasses=new Set(earlierKane.results.filter(row=>row.status==='already-accessible').map(row=>row.task.id))
const checkpoints=path.join(ROOT,'.curbcut/v5/visibility')
const results=new Map()
const queue=[...registration.tasks].sort((a,b)=>Number(priorKanePasses.has(b.task.id))-Number(priorKanePasses.has(a.task.id)))

function compact(lane) {
  const {snapshot,...result}=lane
  return result
}

async function replay(task) {
  const old=prior.get(task.id)
  const before=compact(await replayLane(task,task.persona))
  const control=compact(await replayLane(task,'control'))
  let status=control.status!=='pass'?'control-'+control.status:before.status==='pass'?'already-accessible':before.status
  let after,pointer
  if(status==='fail' && old.patch) {
    after=compact(await replayLane(task,task.persona,old.patch))
    if(after.status==='pass') pointer=compact(await replayLane(task,'control',old.patch))
    status=after.status==='pass' && pointer?.status==='pass'?'locally-fixed':'unresolved'
  } else if(status==='fail') status='unresolved'
  return {id:task.id,url:task.url,persona:task.persona,barrierClass:task.barrierClass,
    priorStatus:old.status,priorBefore:old.phases.find(phase=>phase.name==='before')?.status??null,
    registeredBefore:registration.tasks.find(row=>row.task.id===task.id).before.status,
    status,before,control,after,pointer}
}

async function worker() {
  while(queue.length) {
    const {task}=queue.shift()
    const checkpoint=path.join(checkpoints,task.id+'.json')
    let row=await readJSON(checkpoint).catch(error=>{if(error.code!=='ENOENT') throw error})
    if(!row) {
      row=await replay(task)
      await saveJSON(checkpoint,row)
      await delay(900)
    }
    results.set(task.id,row)
    console.log(results.size+'/'+registration.tasks.length,task.id,row.priorStatus,'→',row.status,row.before.reason)
  }
}

await Promise.all(Array.from({length:3},worker))
const rows=registration.tasks.map(({task})=>results.get(task.id))
const counts=key=>Object.fromEntries(Object.entries(Object.groupBy(rows,row=>row[key])).map(([name,group])=>[name,group.length]))
const summary={runner:'playwright',developmentCohort:'hard-v4',checkedAt:instant(),total:rows.length,
  historical:counts('priorStatus'),replayed:counts('status'),statusChanged:rows.filter(row=>row.status!==row.priorStatus).length,
  comparableRepairBaselines:rows.filter(row=>row.priorBefore!==null).length,
  repairBaselineChanged:rows.filter(row=>row.priorBefore!==null && row.before.status!==row.priorBefore).length,
  registeredBaselineChanged:rows.filter(row=>row.before.status!==row.registeredBefore).length,
  previouslyAccessibleInKane:rows.filter(row=>priorKanePasses.has(row.id)),results:rows}
await saveJSON(path.join(folder,'visibility-replay-v5.json'),summary)
console.log(JSON.stringify({...summary,results:undefined},null,2))
