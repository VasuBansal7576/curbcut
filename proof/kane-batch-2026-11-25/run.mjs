import assert from 'node:assert/strict'
import path from 'node:path'
import {access} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {ROOT,instant,readJSON,relative,saveJSON} from '../../core/io.mjs'
import {requireKane} from '../../core/kane.mjs'
import {balanceNumber} from '../../core/cost.mjs'
import {runCoverageEvidence} from '../../scripts/kane-evidence-v6.mjs'
import {siteKey} from '../../core/task.mjs'

const folder=path.dirname(fileURLToPath(import.meta.url))
const file=path.join(folder,'summary.json')
const reserve=120
// Archived v5 budgets reserved 100 credits per in-flight phase, 120 per case.
const phaseAllowance=100
const caseAllowance=120
const balance=async()=>{
  const value=balanceNumber(await requireKane())
  assert(Number.isFinite(value),'No numeric Kane balance')
  return value
}
const phases={before:'fail',control:'pass',after:'pass'}
const initial=await balance()
const summary={startedAt:instant(),startingBalance:initial,reserve,cases:[]}
await access(file).then(()=>{throw Error('A batch ledger already exists')},error=>assert.equal(error.code,'ENOENT'))
const targets=await readJSON(path.join(folder,'selection.json'))
const tasks=[]
for(const target of targets){
  const data=await readJSON(path.join(ROOT,target.source))
  const row=(data.rows??data.results).find(r=>(r.id??r.task.id)===target.id)
  assert.equal(row.status,'locally-fixed')
  assert.notEqual(row.correctness,'incorrect')
  if(row.proposal && typeof row.proposal==='string' && !row.category){
    assert.deepEqual(await readJSON(path.join(ROOT,row.proposal,'candidate.json')),row.patch)
  }
  tasks.push({...target,patch:row.patch,domain:siteKey(new URL(row.patch.url))})
}
let writes=Promise.resolve()
function persist(){
  const snapshot=structuredClone(summary)
  writes=writes.then(()=>saveJSON(file,snapshot))
  return writes
}
await persist()
delete process.env.CURBCUT_KANE_MAX_STEPS
delete process.env.CURBCUT_CHROME
process.env.CURBCUT_KANE_MIN_CREDITS=String(reserve+phaseAllowance)
async function runCase({id,source,type,patch}){
  const row={id,source,type,site:new URL(patch.url).hostname,task:patch.task,persona:patch.persona,phases:[]}
  summary.cases.push(row)
  await persist()
  for(const [name,expected] of Object.entries(phases)){
    const available=await balance()
    if(available<reserve+phaseAllowance){
      Object.assign(row,{verdict:'inconclusive',reason:'Stopped at the judge rerun reserve before '+name})
      break
    }
    const directory=path.join(folder,'runs',id,name)
    let invoked=false
    let result
    try {
      result=await runCoverageEvidence(patch,name==='control'?'control':patch.persona,name==='after'?patch:null,directory,
        {beforeRun:()=>{invoked=true}})
    } catch(error) {
      const existing=await readJSON(path.join(directory,'result.json')).catch(()=>null)
      result=existing??{status:'inconclusive',reason:error.message.split('\n')[0]}
      if(!existing) await saveJSON(path.join(directory,'result.json'),result)
    }
    const lane={name,invoked,result:relative(path.join(directory,'result.json')),status:result.status,
      reason:result.integrity??result.reason??result.browserVerdict?.basis,providerReason:result.reason,
      browserVerdict:result.browserVerdict?.basis,runId:result.runId,recording:result.video,
      evidencePack:result.evidencePack,evidenceValid:result.evidenceValid===true}
    row.phases.push(lane)
    console.log(id,name,result.status,lane.reason)
    if(result.status!==expected || !result.runId || !result.video || !result.evidenceValid){
      row.verdict=['blocked','inconclusive'].includes(result.status)?result.status:result.status===expected?'inconclusive':'fail'
      row.reason=lane.reason
      break
    }
    if(name==='after') Object.assign(row,{verdict:'pass',reason:'Recorded before failure, mouse control pass, and repaired persona pass.'})
    await persist()
  }
  await persist()
}
// Start two distinct domains only while both cases have budget headroom.
// Near the reserve finish one case at a time.
while(tasks.length){
  const available=await balance()
  if(available<reserve+caseAllowance){summary.stopped='Remaining credits reserved for a judge rerun and one new case.';break}
  const batch=[tasks.shift()]
  if(available>=reserve+2*caseAllowance+phaseAllowance){
    const next=tasks.findIndex(t=>t.domain!==batch[0].domain)
    if(next>=0)batch.push(...tasks.splice(next,1))
  }
  await Promise.all(batch.map(runCase))
  const recent=summary.cases.slice(-2)
  if(recent.length===2 && recent.every(r=>r.verdict==='inconclusive' && r.reason===recent[0].reason && !r.phases.at(-1)?.runId)){
    summary.stopped='Repeated execution failure: '+recent[0].reason
    break
  }
}
summary.finishedAt=instant()
summary.finalBalance=await balance()
summary.creditsUsed=Number((summary.startingBalance-summary.finalBalance).toFixed(4))
await persist()
