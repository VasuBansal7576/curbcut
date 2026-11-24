import path from 'node:path'
import {ROOT,readJSON,saveJSON,instant} from '../core/io.mjs'
import {threshold} from '../core/jev-policy.js'

const folder=path.join(ROOT,'proof/jev')
const read=(filename,defaultValue)=>readJSON(path.join(folder,filename)).catch(error=>{
  if(error.code!=='ENOENT') throw error
  return defaultValue
})
const percentiles=values=>{
  const sorted=values.filter(Number.isFinite).toSorted((a,b)=>a-b)
  const quantile=p=>sorted[Math.ceil(p*sorted.length)-1]??null
  const center=Math.floor(sorted.length/2)
  const median=sorted.length%2?sorted[center]:sorted.length?(sorted[center-1]+sorted[center])/2:null
  return {count:sorted.length,median,p95:quantile(.95)}
}
const groups={1:'Hover navigation',2:'Disclosures',3:'Tabs and carousels',4:'Modal dialogs',5:'Custom listboxes',6:'Other journeys',
  reflow:'Single-control reflow','single-control':'Other single-control tasks',unclassified:'Unclassified'}
const codex=await read('codex-timing.json',null)
const result={version:1,runner:'playwright',asOf:instant(),threshold,
  latencyScope:'Collection and visible-tab-equivalent capture, provider round trip, and timed rule install where measured. Excludes site navigation, deliberate rate pacing, and oracle replays.',
  codexTiming:codex?{scope:codex.scope,file:'proof/jev/codex-timing.json',measured:percentiles(codex.rows.filter(row=>row.status==='proposal').map(row=>row.ms))}:null,
  cohorts:{}}
for(const name of ['hard-v4','heldout-v5']) {
  const replay=await read(name+'-replay.json',null)
  if(!replay) continue
  const {tasks}=await readJSON(path.join(ROOT,'proof',name,'registration.json'))
  const baseline=await readJSON(path.join(ROOT,'proof',name,'local-summary.json'))
  const {rows}=replay
  const timed=name==='hard-v4'?(await read('hard-v4-timing.json',null))?.rows??rows:rows
  const accepted=row=>row.patch && row.decision.confidence>=threshold && row.appliedInCapturedPage!==false
  const fixed=row=>row.oraclePass===true && accepted(row)
  const support=rows.filter(row=>row.patch)
  const tested=support.filter(row=>row.patchedControl || row.after?.status==='fail')
  const correct=rows.filter(fixed)
  const pairs=Object.entries(groups).flatMap(([group,label])=>{
    const total=tasks.filter(({task})=>String(task.barrierClass??(task.probe?.action==='read'?'reflow':task.probe?'single-control':'unclassified'))===group).length
    const count=rows.filter(row=>String(row.class)===group)
    return total?[[label,{registered:total,replayed:count.length,fixed:count.filter(fixed).length}]]:[]
  })
  result.cohorts[name]={
    registered:tasks.length,replayed:rows.length,complete:rows.length===tasks.length,
    fixed:correct.length,successRate:correct.length/tasks.length,accepted:rows.filter(accepted).length,
    codexCallsSavedEstimate:correct.length,byBarrier:Object.fromEntries(pairs),
    baseline:{fixed:baseline.fixed,registered:baseline.total,successRate:baseline.fixed/baseline.total,evidence:'proof/'+name+'/local-summary.json'},
    captureAndDecisionMs:percentiles(rows.filter(row=>row.applyMs===undefined).map(row=>row.decisionLatencyMs)),
    timedThroughRuleInstallMs:percentiles(timed.filter(row=>row.appliedInCapturedPage).map(row=>row.decisionLatencyMs)),
    fixedInstallMs:percentiles(timed.filter(row=>row.appliedInCapturedPage && correct.some(fixed=>
      fixed.id===row.id && JSON.stringify(fixed.patch.rules)===JSON.stringify(row.patch.rules))).map(row=>row.decisionLatencyMs)),
    ...(timed!==rows?{developmentLatencyFollowup:'proof/jev/hard-v4-timing.json'}:{}),
    providerRoundTripMs:percentiles(rows.map(row=>row.decision?.providerMs)),
    calibration:[0,.3,.4,.5,.6,.7,.8,.9].map((lower,index,bounds)=>{
      const upper=bounds[index+1]??1.01
      const inBucket=row=>row.decision.confidence>=lower && row.decision.confidence<upper
      const attempted=support.filter(inBucket).length
      const evaluated=tested.filter(inBucket)
      const correct=evaluated.filter(row=>row.oraclePass===true).length
      return {lowerInclusive:lower,upperExclusive:upper,attempted,evaluated:evaluated.length,correct,
        accuracy:evaluated.length?correct/evaluated.length:null}
    }),
    replay:'proof/jev/'+name+'-replay.json'
  }
}
await saveJSON(path.join(folder,'benchmark.json'),result)
console.log(JSON.stringify(result,null,2))
