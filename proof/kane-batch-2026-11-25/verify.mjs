import assert from 'node:assert/strict'
import path from 'node:path'
import {readFile,writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {ROOT,command,readJSON,saveJSON} from '../../core/io.mjs'
import {parseRun} from '../../core/kane.mjs'
import validate from '../../core/validate.generated.cjs'

const directory=path.dirname(fileURLToPath(import.meta.url))
const summaryFile=path.join(directory,'summary.json')
const summary=await readJSON(summaryFile)
assert(summary.finishedAt,'Wait for the batch to finish before releasing the results.')
const expected={before:'fail',control:'pass',after:'pass'}
const counts=()=>({pass:0,fail:0,inconclusive:0,blocked:0})
const caseCounts=counts(),paidCounts=counts()
let sessions=0
const lines=[]
const esc=value=>String(value).replaceAll('|','\\|').replace(/\s+/g,' ').trim()
const rel=file=>path.relative(directory,path.join(ROOT,file))
const sessionIds=new Set()
for(const row of summary.cases) {
  const local=await readJSON(path.join(ROOT,row.source))
  const source=(local.results??local.rows).find(r=>(r.id??r.task.id)===row.id)
  assert.equal(source?.status,'locally-fixed')
  assert.notEqual(source.correctness,'incorrect')
  const references=[]
  for(const lane of row.phases) {
    const file=path.join(ROOT,lane.result)
    const result=await readJSON(file)
    assert.equal(result.status,lane.status)
    assert.equal(result.runId,lane.runId)
    if(lane.invoked){sessions++;paidCounts[lane.status]++}
    lane.rawKaneStatus=result.kaneStatus??null
    lane.reasonCode=result.reasonCode??null
    lane.providerSummary=result.summary??null
    lane.providerReason=result.reason??null
    lane.credits=result.credits??null
    if(lane.runId){
      assert(!sessionIds.has(lane.runId),'Duplicate Kane session')
      sessionIds.add(lane.runId)
      const events=await readFile(path.join(path.dirname(file),'events.ndjson'),'utf8')
      const parsed=parseRun({stdout:events,code:result.exitCode,signal:result.exitSignal})
      assert.equal(parsed.runId,lane.runId)
      assert.equal(parsed.status,lane.rawKaneStatus)
      if(lane.evidenceValid) {
        const receipt=await readJSON(path.join(path.dirname(file),'pack-validation.json'))
        assert.equal(receipt.valid,true)
        const validation=await command('kane-cli',['evidence','validate','--json',path.join(ROOT,lane.evidencePack)])
        assert(validation.code===0 && JSON.parse(validation.stdout).valid,lane.evidencePack)
      }
      if(lane.recording){
        const decoded=await command('ffmpeg',['-v','error','-xerror','-i',path.join(ROOT,lane.recording),'-map','0:v:0','-f','null','-'])
        assert.equal(decoded.code,0,decoded.stderr)
      }
    }
    references.push('['+lane.name+' '+(lane.runId?.slice(0,8)??'preflight')+']('+rel(lane.result)+')'+
      (lane.recording?' [video]('+rel(lane.recording)+')':'')+(lane.evidencePack?' [pack]('+rel(lane.evidencePack)+')':''))
  }
  const complete=Object.entries(expected).every(([name,status])=>{
    const lane=row.phases.findLast(r=>r.name===name)
    return lane?.status===status && lane.runId && lane.evidenceValid && lane.recording
  })
  assert.equal(row.verdict==='pass',complete)
  if(complete){
    if(typeof source.proposal==='string' && source.phases) {
      assert.deepEqual(await readJSON(path.join(ROOT,source.proposal,'candidate.json')),source.patch)
      for(const [name,status] of Object.entries(expected)) {
        const phase=source.phases.find(lane=>lane.name===(name==='after'?path.basename(source.proposal)+'/after':name))
        assert.equal(phase?.status,status)
        const result=await readJSON(path.join(ROOT,phase.file))
        assert.equal(result.runner,'playwright')
        assert.equal(result.status,status)
      }
    }
    const last=row.phases.at(-1)
    const result=await readJSON(path.join(ROOT,last.result))
    assert.equal(result.inspection.harness.patchId,row.id)
    assert(result.recordingTrail.some(page=>page.events.some(event=>event.type==='rule' && event.patchId===row.id)))
    if(source.patch.probe?.action==='type'){
      assert.deepEqual(result.outcomeChecks,source.patch.outcomeChecks.map(()=>true))
      assert.equal(result.browserVerdict.basis,'named-reader-interaction')
    }
    const events=(await readFile(path.join(ROOT,path.dirname(last.result),'events.ndjson'),'utf8')).trim().split('\n').map(JSON.parse)
    const at=events.findLast(e=>e.type==='run_end').ts
    const recordings=Object.fromEntries(row.phases.map(lane=>[lane.name,lane.recording]))
    const ids=Object.keys(expected).map(name=>row.phases.findLast(lane=>lane.name===name).runId)
    const target=path.join(ROOT,'patches',row.id+'.json')
    const previous=await readJSON(target).catch(error=>{if(error.code!=='ENOENT')throw error;return null})
    const history=previous?.history??source.patch.history
    const verified={...source.patch,status:'verified',evidence:{...source.patch.evidence,...previous?.evidence,...recordings,
      kaneRunIds:ids,kaneVerdicts:expected,verifiedAt:at},history:history.some(h=>h.after===last.runId)?history:
      [...history,{event:'verified',at,before:ids[0],control:ids[1],after:ids[2]}]}
    if(previous) {
      assert.deepEqual(previous.rules,source.patch.rules)
      assert(previous.status==='locally-verified' || previous.evidence.kaneRunIds?.join()===ids.join())
    }
    assert(validate(verified),JSON.stringify(validate.errors))
    await saveJSON(target,verified)
  }
  caseCounts[row.verdict]++
  const last=row.phases.at(-1)
  const reason=row.verdict==='pass'?'Baseline failed. Mouse control and repaired persona passed.':
    (last?.name?last.name+' — ':'')+[row.reason,last?.browserVerdict].filter((r,i,a)=>r && a.indexOf(r)===i).join(' · ')
  lines.push('| '+[row.site,esc(row.task),row.type,row.verdict,esc(reason),references.join(' · ')].join(' | ')+' |')
}
Object.assign(summary,{casesAttempted:summary.cases.length,kaneInvocations:sessions,caseVerdicts:caseCounts,invokedPhaseVerdicts:paidCounts})
await saveJSON(summaryFile,summary)
const body=[
  '# Kane verification batch · November 25, 2026',
  'The account started with '+summary.startingBalance+' credits and finished with '+summary.finalBalance+'. The batch used '+summary.creditsUsed+' credits and protected a 120-credit judge rerun reserve.',
  'Across '+summary.cases.length+' candidates, '+caseCounts.pass+' passed, '+caseCounts.fail+' failed, '+caseCounts.inconclusive+' were inconclusive and '+caseCounts.blocked+' were blocked. There were '+sessions+' Kane invocations. A failed baseline is required for a case to pass.',
  '## Candidate selection',
  'We ranked locally successful, previously untested candidates from held-out v5–v7 and hard v4 by the archived results. Form labels led (6/6 in the [v5 sample](../heldout-v5/kane-sample-20/summary.json), 11/20 overall). Image alternatives and empty buttons followed (3/5 each, versus 1/5 empty links in the [v6 sample](../heldout-v6/kane-summary.json)). Within the form-label group we preferred the v5 cohort and simple ID selectors. This targeted batch measures these cases only.',
  'All 44 local-only releases were 41 contrast and three document-language measurements. The [contrast calibration](../heldout-v6/calibration/summary.json) failed, and language is local-only in the Kane adapter. Prior sessions, known blocked sites and v7 names judged incorrect were excluded. [Ranked candidates](selection.json)',
  '## Recorded outcomes',
  'Each case used its registered browsing persona before and after the exact local repair, with the mouse on the unpatched page as control. Two distinct sites could run concurrently while credits allowed. The adapter applied the [archived step limits](../../core/step-limits.json). The session links open original result files. Those preserve Kane’s own verdict and reason alongside the recorded browser interaction used to adjudicate it. A release requires fail/pass/pass with three recordings and three validated sealed packs. [Machine-readable ledger](summary.json)',
  ['| Site | Task | Type | Case verdict | Reason | Sessions |','| --- | --- | --- | --- | --- | --- |',...lines].join('\n')
]
await writeFile(path.join(directory,'README.md'),body.join('\n\n')+'\n')
