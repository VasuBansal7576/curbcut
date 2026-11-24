import assert from 'node:assert/strict'
import path from 'node:path'
import {instant} from '../core/io.mjs'
import {requireKane} from '../core/kane.mjs'
import {directory,frozen,input,read,save} from './freeze-v7.mjs'
import {runCoverageEvidence} from './kane-evidence-v6.mjs'
import {sha256} from './scout-v4.mjs'

await frozen()
const localInput=await input('local-summary.json')
const local=await read('local-summary.json')
const seed='curbcut-v7-live-names-kane-five-v1'
const pool=local.rows.filter(row=>row.correctness==='correct' && row.replay?.status==='locally-fixed' && row.patch?.evaluation.name)
const selected=pool.map(row=>({id:row.id,rank:sha256(seed+'\n'+row.id),candidateSha256:sha256(JSON.stringify(row.patch))}))
  .sort((a,b)=>a.rank.localeCompare(b.rank)).slice(0,5)
const protocol={seed,localInput,eligible:pool.length,selected,requested:5,maximumCredits:400,minimumBalance:1900,phaseReserve:80}
const balance=async()=>{
  const available=Number((await requireKane()).match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
  assert(Number.isFinite(available))
  return available
}
if(process.argv[2]==='select') {
  await save('kane-selection.json',{...protocol,registeredAt:instant()})
  console.log('Eligible',pool.length,'selected',selected.length)
} else if(process.argv[2]==='run') {
  const selectionInput=await input('kane-selection.json')
  const {registeredAt,...plan}=await read('kane-selection.json')
  assert.deepEqual(plan,protocol)
  const startingBalance=await balance()
  const prior=await read('kane-summary.json').catch(error=>{if(error.code!=='ENOENT') throw error;return null})
  const summary=prior??{runner:'kane',selection:selectionInput,startingBalance,cases:[],startedAt:instant()}
  assert.deepEqual(summary.selection,selectionInput)
  const floor=Math.max(plan.minimumBalance,summary.startingBalance-plan.maximumCredits+plan.phaseReserve)
  const failures=new Map()
  process.env.CURBCUT_KANE_MIN_CREDITS=String(floor)
  if(selected.length!==protocol.requested) summary.stopped='Fewer than five qualifying cases.'
  for(const selection of selected) {
    if(summary.stopped) break
    if(summary.cases.some(row=>row.id===selection.id)) continue
    const {patch}=pool.find(row=>row.id===selection.id)
    const row={id:selection.id,phases:{},verified:false}
    for(const [phase,expected] of Object.entries({before:'fail',control:'pass',after:'pass'})) {
      if(await balance()<floor) {summary.stopped='Credit reserve reached.';break}
      const artifact='kane/'+selection.id+'/'+phase
      let result
      try {
        result=await runCoverageEvidence(patch,phase==='control'?'control':patch.persona,phase==='after'?patch:null,
          path.join(directory,artifact),{maxSteps:phase==='after'?12:8,timeout:115})
      } catch(error) {
        const reason=error.message.split('\n')[0]
        failures.set(reason,(failures.get(reason)??0)+1)
        if(failures.get(reason)>=2) summary.stopped='Repeated execution failure: '+reason
        result={status:'inconclusive',reason}
      }
      row.phases[phase]={status:result.status,runId:result.runId??null,recording:result.video??null,evidencePack:result.evidencePack??null,
        evidenceValid:result.evidenceValid===true,reason:result.integrity??result.reason,artifact}
      if(result.status!==expected || !result.evidenceValid || !result.runId || !result.video) break
      if(phase==='after') row.verified=true
    }
    summary.cases.push(row)
    summary.finalBalance=await balance()
    await save('kane-summary.json',summary)
    console.log(row.id,row.verified?'verified':'unverified',summary.finalBalance)
  }
  summary.finishedAt=instant()
  summary.finalBalance=await balance()
  summary.creditsUsed=Number((summary.startingBalance-summary.finalBalance).toFixed(4))
  summary.verified=summary.cases.filter(row=>row.verified).length
  await save('kane-summary.json',summary)
  console.log('Kane verified',summary.verified,'of',protocol.requested,'credits',summary.creditsUsed,'balance',summary.finalBalance)
} else throw new Error('Use kane-v7.mjs select | run')
