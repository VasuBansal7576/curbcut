import assert from 'node:assert/strict'
import path from 'node:path'
import {access,readFile} from 'node:fs/promises'
import {ROOT,instant,readJSON,relative,saveJSON} from '../../../core/io.mjs'
import {requireKane,runKane} from '../../../core/kane.mjs'
import {withLock} from '../../../core/loop.mjs'
import {preflight} from '../../../core/preflight.mjs'
import {normalizeTask} from '../../../core/task.mjs'
import {blob,firstInput,given,read} from '../../../scripts/cohort-v5.mjs'
import {sha256} from '../../../scripts/scout-v4.mjs'

const folder='kane-rerun-50'
const summaryFile=given(folder+'/summary.json')
const rounded=value=>Number(value.toFixed(4))
const proven=result=>result.runner==='kane' && Boolean(result.runId && result.video && result.evidenceValid)

async function credits() {
  const output=await requireKane()
  const match=output.match(/Available credits:\s*([\d,.]+)/i)
  const amount=match?Number(match[1].replaceAll(',','')):NaN
  assert.ok(Number.isFinite(amount),'Kane did not return an available credit balance.')
  return amount
}

async function stepsUsed(directory) {
  const lines=(await readFile(path.join(directory,'events.ndjson'),'utf8')).split('\n')
  const events=lines.flatMap(line=>{
    try {return [JSON.parse(line)]} catch {return []}
  })
  const end=events.findLast(event=>event.type==='run_end')
  const overrun=end?.reason?.match(/^Maximum steps exceeded \((\d+)\/\d+\)/)
  if(overrun) return Number(overrun[1])
  const steps=events.filter(event=>Number.isInteger(event.step) && ['done','failed'].includes(event.status))
  return steps.length?Math.max(...steps.map(event=>event.step)):null
}

async function rerun() {
  const [protocol,source,runner,selection,registered,original]=await Promise.all([
    read(folder+'/registration.json'),firstInput(folder+'/registration.json'),firstInput(folder+'/run.mjs'),
    read('kane-selection.json'),read('registration.json'),read('kane-summary.json')
  ])
  assert.equal(runner.commit,source.commit)
  assert.equal(await blob(relative(given(protocol.originalSummary.file))),protocol.originalSummary.blob)
  assert.equal(original.fixed,0)
  assert.equal(original.selected,4)
  if(await access(summaryFile).then(()=>true,error=>{
    if(error.code==='ENOENT') return false
    throw error
  })) throw new Error('The rerun already has a summary. Inspect its records before any further Kane invocation.')

  const {limits,persona}=protocol.amendment
  const {minimumBalance}=protocol.budget
  const cases=new Map(await Promise.all(protocol.cases.map(async({id,name})=>{
    const target=selection.targets.find(entry=>entry.id===id)
    const {task:data,access:originalAccess}=registered.tasks.find(entry=>entry.task.id===id)
    assert.equal(originalAccess.status,'pass')
    const task=await normalizeTask(data)
    assert.equal(task.persona,persona)
    const candidateFile=target.proposal+'/candidate.json'
    const patch=await readJSON(path.join(ROOT,candidateFile))
    assert.equal(sha256(JSON.stringify(patch)),target.patchSha256)
    const archived=phase=>'kane/'+id+'/'+phase+'/result.json'
    const [before,after,control]=await Promise.all([
      read(archived('before')),read(archived('attempt-1/after')),read(archived('control'))
    ])
    assert.deepEqual(before.limits,protocol.amendment.previousLimits)
    assert.deepEqual(after.limits,before.limits)
    assert.equal(before.objective,after.objective)
    assert.ok(proven(control) && control.status==='pass')
    const record={id,name,candidateFile,patchSha256:target.patchSha256,
      control:{status:control.status,runId:control.runId,result:relative(given(archived('control')))},
      originalBefore:{status:before.status,reason:before.reason,maxSteps:before.limits.maxSteps,
        result:relative(given(archived('before')))}}
    return [id,{task,patch,objective:before.objective,record}]
  })))

  delete process.env.CURBCUT_CHROME
  process.env.CURBCUT_KANE_MIN_CREDITS=String(minimumBalance)
  const initialBalance=await credits()
  const summary={runner:'kane',registration:source,startedAt:instant(),initialBalance,
    finalBalance:initialBalance,creditsSpent:0,limits,minimumBalance,
    original:{kaneVerified:original.fixed,selected:original.selected},
    cases:[...cases.values()].map(entry=>entry.record),runs:[]}
  const failures=new Map()
  const save=()=>saveJSON(summaryFile,summary)
  await save()

  for(const {id,phase} of protocol.runOrder) {
    if(summary.stopped) break
    const {task,patch,objective,record}=cases.get(id)
    const directory=given(folder+'/'+id+'/'+phase)
    const row={id,name:record.name,phase,verdict:'pending',stepsUsed:null,creditsSpent:null}
    summary.runs.push(row)
    await save()
    let failure
    try {
      const access=await preflight(task)
      await saveJSON(path.join(directory,'preflight.json'),access)
      if(access.status!=='pass') {
        row.verdict='preflight blocked'
        row.reason=access.lanes.find(lane=>lane.status!=='pass')?.reason
        failure=row.reason
      } else {
        row.balanceBefore=await credits()
        summary.finalBalance=row.balanceBefore
        if(row.balanceBefore<minimumBalance) {
          row.verdict='budget stop'
          row.reason='Available balance '+row.balanceBefore.toFixed(4)+' is below '+minimumBalance+' credits.'
          summary.stopped=row.reason
        } else {
          row.startedAt=instant()
          await save()
          console.log(record.name,phase,'starting with',row.balanceBefore,'credits')
          const result=await runKane(task,persona,phase==='after'?patch:null,directory,limits)
          row.result=relative(path.join(directory,'result.json'))
          row.runner=result.runner
          row.reason=result.integrity??result.reason
          row.verdict=result.status
          if(result.runner==='kane') {
            row.runId=result.runId??null
            row.rawKaneStatus=result.kaneStatus
            row.rawKaneReason=result.reason
            row.kaneReportedCredits=result.credits
            row.stepsUsed=await stepsUsed(directory)
            row.evidencePack=result.evidencePack??null
            row.recording=result.video??null
            row.evidenceValid=Boolean(result.evidenceValid)
            assert.equal(result.objective,objective,'The replay objective differs from the original v5 objective.')
            assert.deepEqual(result.limits,limits)
            row.proven=proven(result)
          }
          if(result.status==='inconclusive' || result.status==='blocked') {
            failure=result.reasonCode??result.reason??result.integrity
          }
        }
      }
    } catch(error) {
      row.verdict='error'
      row.reason=error.message
      failure=error.message
    }
    if(row.startedAt) {
      row.balanceAfter=await credits()
      row.creditsSpent=rounded(row.balanceBefore-row.balanceAfter)
      summary.finalBalance=row.balanceAfter
    } else row.creditsSpent=0
    row.finishedAt=instant()
    if(failure) {
      const count=(failures.get(failure)??0)+1
      failures.set(failure,count)
      if(count>=2) summary.stopped='Repeated failure: '+failure
    }
    summary.creditsSpent=rounded(initialBalance-summary.finalBalance)
    await save()
    console.log(record.name,phase,row.verdict,row.rawKaneReason??row.reason??'',row.stepsUsed??'no steps',summary.finalBalance)
  }

  summary.unrun=protocol.runOrder.filter(({id,phase})=>
    !summary.runs.some(row=>row.id===id && row.phase===phase && row.runId))
  for(const entry of summary.cases) {
    const phase=name=>summary.runs.find(row=>row.id===entry.id && row.phase===name && row.proven)
    entry.kaneVerified=phase('before')?.verdict==='fail' && phase('after')?.verdict==='pass'
  }
  summary.kaneVerified=summary.cases.filter(entry=>entry.kaneVerified).length
  summary.finishedAt=instant()
  await save()
}

await withLock(rerun)
