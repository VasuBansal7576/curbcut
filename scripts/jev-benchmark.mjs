import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {jevKey} from '../core/jev.mjs'
import {chooseInstant,instantPatch,threshold} from '../core/jev-policy.js'
import {captureInstant} from '../core/jev-capture.mjs'
import {replayLane} from '../core/probe.mjs'
import {siteKey} from '../core/task.mjs'
import {ROOT,readJSON,saveJSON,instant} from '../core/io.mjs'
import validate from '../core/validate.generated.cjs'

const root=path.join(ROOT,'proof/jev')
const cohorts=process.argv.slice(2).filter(arg=>!arg.startsWith('--'))
if(!cohorts.length) cohorts.push('hard-v4','heldout-v5')
if(cohorts.some(name=>!['hard-v4','heldout-v5'].includes(name))) throw new Error('Unknown cohort.')
const timingOnly=process.argv.includes('--v4-timing-only')
if(timingOnly && (cohorts.length!==1 || cohorts[0]!=='hard-v4')) throw new Error('Choose hard-v4 for the timing follow-up.')
const limit=Number(process.argv.find(arg=>arg.startsWith('--limit='))?.split('=')[1]??Infinity)
const key=await jevKey()
if(!key) throw new Error('Jev is not configured.')

const rates={navigation:0,provider:0}
async function rate(type) {
  const at=Math.max(Date.now(),rates[type])
  rates[type]=at+1000
  if(at>Date.now()) await delay(at-Date.now())
}
const lane=async(task,persona,patch,options)=>{
  await rate('navigation')
  const {status,reason}=await replayLane(task,persona,patch,options)
  return {status,reason}
}
const category=task=>task.barrierClass??({read:'reflow',click:'single-control',type:'single-control'}[task.probe?.action]??'unclassified')
let providerFailures=new Map()
async function measure({task}) {
  const row={id:task.id,persona:task.persona,class:category(task),registeredClass:task.barrierClass??'single-control'}
  const out=(status,reason)=>({...row,status,reason})
  let capture,captureError,decision
  row.before=await lane(task,task.persona,null,{observe:async page=>{
    try {
      capture=await captureInstant(page,task)
      if(!capture) return
      row.candidates=capture.state.candidates.length
      if(!row.candidates) {decision={reason:'no-candidates'};return}
      if([...providerFailures.values()].some(count=>count>=2)) {decision={reason:'provider-stopped'};return}
      await rate('provider')
      const start=performance.now()
      try {decision=await chooseInstant(key,capture.state,capture.screenshot)}
      catch(error) {
        const reason=error.message.split('\n')[0]
        providerFailures.set(reason,(providerFailures.get(reason)??0)+1)
        decision={reason:'provider-error',error:reason}
      }
      if(decision.rules) {
        const patch=instantPatch(capture.state.url,decision,task)
        if(validate(patch)) {
          row.patch=patch
          const startApply=performance.now()
          row.appliedInCapturedPage=await page.evaluate(patch=>{
            const matches=new Set()
            const release=CurbCut.apply(patch,index=>matches.add(index))
            release()
            return matches.size===patch.rules.length
          },patch).catch(()=>false)
          row.applyMs=Math.round(performance.now()-startApply)
        }
      }
      row.decisionLatencyMs=capture.captureMs+Math.round(performance.now()-start)
    } catch(error) {captureError=error.message.split('\n')[0]}
  }})
  if(!capture) return out(row.before.status==='blocked'?'blocked':'capture-unavailable',captureError??row.before.reason)
  if(!decision) return out('capture-error',captureError??'Decision unavailable.')
  row.decision=decision
  if(!decision.rules) return out(decision.reason==='provider-error'?'provider-error':'abstained',decision.error??decision.reason)
  const patch=row.patch
  if(!patch) return out('invalid-patch','Patch did not pass its schema.')
  row.accepted=decision.confidence>=threshold && row.appliedInCapturedPage
  if(timingOnly) return out('timed')
  if(row.before.status!=='fail') return out('barrier-not-reproduced',row.before.reason)
  row.control=await lane(task,'control',null)
  if(row.control.status!=='pass') return out('control-unavailable',row.control.reason)
  row.after=await lane(task,task.persona,patch)
  if(row.after.status!=='pass') return out('unresolved',row.after.reason)
  row.patchedControl=await lane(task,'control',patch)
  if(row.patchedControl.status!=='pass') return out('pointer-regression',row.patchedControl.reason)
  row.oraclePass=true
  return out(row.accepted?'instant-fixed':'below-threshold')
}
function percentiles(values) {
  const sorted=values.filter(Number.isFinite).toSorted((left,right)=>left-right)
  return {n:sorted.length,median:sorted[Math.ceil(sorted.length*.5)-1]??null,p95:sorted[Math.ceil(sorted.length*.95)-1]??null}
}
function summary(rows) {
  const verified=rows.filter(row=>row.status==='instant-fixed')
  const validDecisions=rows.filter(row=>row.patch)
  const evaluated=validDecisions.filter(row=>row.patchedControl || row.after?.status==='fail')
  const byClass=Object.fromEntries([...new Set(rows.map(row=>row.class))].map(group=>{
    const tasks=rows.filter(row=>row.class===group)
    return [group,{fixed:tasks.filter(row=>row.status==='instant-fixed').length,total:tasks.length}]
  }))
  const byRegisteredClass=Object.fromEntries([...new Set(rows.map(row=>row.registeredClass))].map(group=>{
    const tasks=rows.filter(row=>row.registeredClass===group)
    return [group,{fixed:tasks.filter(row=>row.status==='instant-fixed').length,total:tasks.length}]
  }))
  return {total:rows.length,fixed:verified.length,accepted:rows.filter(row=>row.accepted).length,codexCallsSaved:verified.length,
    byClass,byRegisteredClass,statuses:Object.fromEntries([...new Set(rows.map(row=>row.status))].map(status=>[status,rows.filter(row=>row.status===status).length])),
    decisionLatencyMs:percentiles(rows.map(row=>row.decisionLatencyMs)),providerLatencyMs:percentiles(rows.map(row=>row.decision?.providerMs)),
    fixedLatencyMs:percentiles(verified.map(row=>row.decisionLatencyMs)),
    calibration:[0,.3,.4,.5,.6,.7,.8,.9].map((min,index,limits)=>{
      const max=limits[index+1]??1.01
      const predicted=validDecisions.filter(row=>row.decision.confidence>=min && row.decision.confidence<max)
      const judged=predicted.filter(row=>evaluated.includes(row))
      return {min,max,predicted:predicted.length,evaluated:judged.length,correct:judged.filter(row=>row.oraclePass).length}
    })}
}
const result={version:1,runner:'playwright',startedAt:instant(),threshold,cohorts:{}}
for(const cohort of cohorts) {
  const registration=await readJSON(path.join(ROOT,'proof',cohort,'registration.json'))
  let tasks=registration.tasks
  if(timingOnly) {
    const archived=await readJSON(path.join(root,'hard-v4-replay.json'))
    const observed=new Set(archived.rows.filter(row=>row.patch && row.before.status==='fail').map(row=>row.id))
    tasks=tasks.filter(({task})=>observed.has(task.id))
  }
  const file=path.join(root,timingOnly?'hard-v4-timing.json':cohort+'-replay.json')
  const prior=limit===Infinity && !process.argv.includes('--fresh')?await readJSON(file).catch(error=>{if(error.code!=='ENOENT')throw error}):null
  if(prior && prior.threshold!==threshold) throw new Error('Resume requires the same confidence threshold.')
  const rows=prior?.rows??[]
  const active=new Set()
  const pending=tasks.slice(0,limit).filter(({task})=>!rows.some(row=>row.id===task.id))
    .map(item=>({item,site:siteKey(new URL(item.task.url))}))
  let writes=Promise.resolve()
  async function worker() {
    while(pending.length) {
      const index=pending.findIndex(({site})=>!active.has(site))
      if(index<0) {await delay(500);continue}
      const [{item,site}]=pending.splice(index,1)
      active.add(site)
      try {
        const row=await measure(item).catch(error=>({id:item.task.id,class:category(item.task),registeredClass:item.task.barrierClass??'single-control',
          status:'error',reason:error.message.split('\n')[0]}))
        rows.push(row)
        console.log(cohort,rows.length+'/'+Math.min(tasks.length,limit),row.id,row.status,row.decision?.family??'',row.decision?.confidence??'',row.reason??'')
        if(limit===Infinity) {
          writes=writes.then(()=>saveJSON(file,{threshold,rows}))
          await writes
        }
      } finally {active.delete(site)}
    }
  }
  await Promise.all(Array.from({length:5},worker))
  result.cohorts[cohort]={...summary(rows),registered:tasks.length,
    ...(limit===Infinity?{replay:'proof/jev/'+cohort+'-replay.json'}:{rows})}
  if(limit===Infinity && !timingOnly) await saveJSON(path.join(root,cohort+'-summary.json'),result.cohorts[cohort])
}
console.log(JSON.stringify(result,null,2))
