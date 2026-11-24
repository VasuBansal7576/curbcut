import assert from 'node:assert/strict'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,command,instant,readJSON,saveJSON} from '../../core/io.mjs'
import {fix,withLock} from '../../core/loop.mjs'
import {requireKane,runKane} from '../../core/kane.mjs'
import {preflight} from '../../core/preflight.mjs'
import {git,sha256} from '../../scripts/scout-v4.mjs'
import {blob,breakdown,firstInput,frozen,given,model,optional,read,relative,same,save} from '../../scripts/cohort-v5.mjs'

const summaryFile='kane-summary.json',selectionFile='kane-selection.json',localFile='local-summary.json'
const deviationFile='kane-protocol-deviation.json',runnerFile='continue-kane.mjs',receiptFile='kane-selection-integrity.json'

class BudgetStop extends Error {}

async function credits() {
  const match=(await requireKane()).match(/Available credits:\s*([\d,.]+)/i)
  const amount=match?Number(match[1].replaceAll(',','')):NaN
  if(!Number.isFinite(amount)) throw new Error('Kane did not return an available credit balance.')
  return amount
}

const phaseResult=result=>({status:result.status,runner:result.runner,runId:result.runId,rawKaneStatus:result.kaneStatus,
  evidenceValid:result.evidenceValid,credits:result.credits,reason:result.integrity??result.reason,video:result.video,evidencePack:result.evidencePack})

async function continueKane() {
  const [previous,deviation,protocol,runner,selection,selectionSource,local,source,registration,registered]=await Promise.all([
    read(summaryFile),read(deviationFile),firstInput(deviationFile),firstInput(runnerFile),read(selectionFile),firstInput(selectionFile),
    read(localFile),firstInput(localFile),read('registration.json'),firstInput('registration.json')
  ])
  const integrity=await command(process.execPath,['scripts/verify-v5.mjs'])
  if(integrity.code!==0) throw new Error(integrity.stderr || integrity.stdout)
  await frozen()
  assert.deepEqual(await firstInput(summaryFile),deviation.priorSummary)
  assert.deepEqual(selectionSource,deviation.selection)
  assert.deepEqual(previous.selection,selectionSource)
  assert.deepEqual(selection.registered,registered)
  assert.deepEqual(selection.local,source)
  assert.deepEqual(local.registered,registered)
  assert.equal(local.runner,'playwright')
  assert.equal(previous.runner,'kane')
  assert.equal(deviation.budget,selection.budget)
  assert.equal(deviation.budget,previous.budget)
  assert.equal(deviation.floor,Number(previous.floor.toFixed(4)))
  assert.equal(deviation.caseReserve.original,3*selection.phaseReserve)
  assert.equal(deviation.phaseMinimumAboveFloor,selection.phaseReserve)

  const targets=selection.targets.filter(target=>previous.unrun.includes(target.id))
  assert.deepEqual(targets.map(target=>target.id),previous.unrun)
  assert.ok(targets.every(target=>!previous.results.some(row=>row.task.id===target.id && row.phases.length)))
  const floor=previous.floor, phaseReserve=deviation.phaseMinimumAboveFloor, caseReserve=deviation.caseReserve.continuation
  const checkpointFile='kane-continuation-journal.json'
  const checkpoint=await optional(checkpointFile)
  const available=await credits()
  const continuation=checkpoint??{protocol,runner,startedAt:instant(),initial:available}
  if(checkpoint) {
    assert.deepEqual(checkpoint.protocol,protocol)
    assert.deepEqual(checkpoint.runner,runner)
  } else assert.equal(available,previous.end,'The available credits changed since the original Kane batch.')
  if(available<floor) throw new Error('The available credits are already below the protected floor.')
  await save(checkpointFile,continuation)
  delete process.env.CURBCUT_CHROME
  process.env.CURBCUT_KANE_MIN_CREDITS=String(floor+phaseReserve)

  const appended=[],failures=new Map()
  let stopped
  for(const target of targets) {
    const candidateRow=local.results.find(row=>row.task.id===target.id)
    const {task,access}=registration.tasks.find(row=>row.task.id===target.id)
    assert.equal(access.status,'pass')
    assert.equal(candidateRow.status,'locally-fixed')
    assert.deepEqual(candidateRow.task,task)
    const base=given('kane/'+task.id)
    const outcome='kane/'+task.id+'/continuation-outcome.json'
    const recorded=await optional(outcome)
    if(recorded?.finishedAt) {
      appended.push(recorded)
      if(recorded.status==='budget stop') {stopped=recorded.reason;break}
      continue
    }
    const phases=recorded?.phases??[]
    const row={task,status:'pending',phases,localProposal:target.proposal}
    const persistPhase=()=>save(outcome,row)
    try {
      const candidate=await readJSON(path.join(ROOT,target.proposal,'candidate.json'))
      const proposal=await readJSON(path.join(ROOT,target.proposal,'provenance.json'))
      if(proposal.writer!=='codex exec' || proposal.model!==model || !same(candidateRow.patch,candidate) ||
        sha256(JSON.stringify(candidate))!==target.patchSha256) throw new Error('Local proposal provenance changed for '+task.id+'.')
      const sourceLocalRun=candidateRow.phases.find(phase=>phase.name==='before')?.file
      const provenance={...proposal,priorAgentProposal:target.proposal+'/candidate.json',sourceLocalRun,registrationBlob:registered.blob}
      if(!phases.length) {
        const balance=await credits()
        if(balance<floor+caseReserve) throw new BudgetStop('The remaining balance cannot reserve '+caseReserve+' credits above '+floor.toFixed(4)+' for a new case.')
        row.preflight=await preflight(task)
      } else row.preflight=recorded.preflight
      if(row.preflight?.status!=='pass') {
        row.status='preflight blocked'
        row.reason=row.preflight?.lanes.find(lane=>lane.status!=='pass')?.reason??'The selected site did not pass the current access preflight.'
      } else {
        const run=async(current,persona,patch,directory)=>{
          await frozen()
          for(const [file,input] of [[selectionFile,selectionSource],[localFile,source],['registration.json',registered],[deviationFile,protocol],[runnerFile,runner]]) {
            assert.deepEqual(await firstInput(file),input,file+' changed during verification.')
          }
          const name=path.relative(base,directory)
          const cached=await optional('kane/'+task.id+'/'+name+'/result.json')
          if(cached) {
            if(!phases.some(phase=>phase.name===name)) {
              phases.push({name,after:await credits(),...phaseResult(cached)})
              await persistPhase()
            }
            return cached
          }
          const balance=await credits()
          const remaining=name==='before'?3:name==='control'?2:1
          if(balance<floor+Math.max(phaseReserve,remaining*caseReserve/3)) {
            throw new BudgetStop('The balance cannot reserve '+name+' above '+floor.toFixed(4)+' credits.')
          }
          console.log(task.id,name,'balance',balance)
          const result=await runKane(current,persona,patch,directory,{maxSteps:persona==='keyboard-only'?24:18,timeout:180,assertionMode:'dom'})
          const after=await credits()
          phases.push({name,balance,after,...phaseResult(result)})
          await persistPhase()
          console.log(task.id,name,result.runner,result.status,result.runId??'','balance',after)
          if(after<floor) throw new BudgetStop('The balance crossed the protected threshold after '+name+': '+after+'.')
          return result
        }
        await persistPhase()
        const result=await fix(task,{base,run,registeredCandidate:candidate,provenance,
          persist:patch=>save('verified/'+patch.id+'.json',patch)})
        row.status=result.status
        const last=result.after??result.control??result.before
        row.reason=last?.integrity??last?.reason
      }
    } catch(error) {
      row.reason=error.message
      if(error instanceof BudgetStop) {row.status='budget stop';stopped=error.message}
      else {
        row.status='Kane error'
        const reason=error.message.split('\n')[0]
        const repeated=(failures.get(reason)??0)+1
        failures.set(reason,repeated)
        if(repeated>=2) stopped='Kane failed twice: '+reason
      }
    }
    row.finishedAt=instant()
    await persistPhase()
    appended.push(row)
    console.log(task.id,row.status,row.reason??'')
    if(stopped) break
    await delay(1200)
  }

  const results=[...previous.results,...appended]
  const latest=[...new Map(results.map(row=>[row.task.id,row])).values()]
  const paired=latest.map(row=>({before:row.phases.find(phase=>phase.name==='before'),
    after:row.phases.findLast(phase=>phase.name.startsWith('attempt-1/after'))})).filter(pair=>
      [pair.before,pair.after].every(phase=>phase?.runner==='kane' && phase.evidenceValid))
  const agreement={matched:paired.filter(pair=>pair.before.status==='fail' && pair.after.status==='pass').length,paired:paired.length}
  const end=await credits()
  const started=latest.filter(row=>row.phases.some(phase=>phase.runner==='kane'))
  const unrun=selection.targets.filter(target=>!started.some(row=>row.task.id===target.id)).map(target=>target.id)
  const finishedAt=instant()
  const summary={...previous,finishedAt,end,spent:Number((previous.initial-end).toFixed(4)),started:started.length,agreement,stopped,unrun,
    ...breakdown(latest,'verified'),results,continuation:{...continuation,finishedAt,end,spent:Number((continuation.initial-end).toFixed(4)),
      previousStop:previous.stopped,priorSummary:deviation.priorSummary}}
  await save(summaryFile,summary)
  await save(receiptFile,{version:1,recordedAt:instant(),inputs:{[selectionFile]:selectionSource,[localFile]:source,
    [deviationFile]:protocol,[runnerFile]:runner,[summaryFile]:{blob:await blob(relative(summaryFile))}}})
  console.log(JSON.stringify({verified:summary.fixed,selected:summary.selected,started:summary.started,agreement,spent:summary.spent,end,stopped},null,2))
}

await withLock(continueKane)
