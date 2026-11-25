import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,readJSON} from '../core/io.mjs'
import {judgeJourney,parseRun,replayObjective} from '../core/kane.mjs'

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')

export async function reviewRecordedJourney({directory,task,persona,patch=null}) {
  const [resultBytes,eventBytes]=await Promise.all(['result.json','events.ndjson'].map(file=>readFile(path.join(ROOT,directory,file))))
  const original=JSON.parse(resultBytes)
  const parsed=parseRun({stdout:eventBytes.toString('utf8'),code:original.exitCode})
  const harness=original.inspection?.harness
  const events=original.recordingTrail.flatMap(recording=>recording.events)
  assert.equal(original.runner,'kane')
  assert.equal(original.evidenceValid,true)
  assert.equal(original.runId,parsed.runId)
  assert.equal(original.kaneStatus,parsed.status)
  assert.equal(original.objective,replayObjective(task,persona,{patched:Boolean(patch)}))
  assert.equal(harness?.persona,persona)
  assert.equal(harness?.patchId??null,patch?.id??null)
  assert(events.some(event=>event.top && event.type==='document' && event.documentId===harness.documentId))
  if(patch) assert(events.some(event=>event.top && event.type==='rule' && event.patchId===patch.id && event.documentId===harness.documentId))
  if(original.integrity) {
    assert.equal(original.integrity,'complete-journey-not-witnessed')
    assert.equal(original.status,'inconclusive')
    assert(original.browserVerdict?.missed?.some(step=>step.method==='checkpoint'))
  }
  assert.equal(original.video,path.join(directory,'recording.mp4'))
  assert.equal(path.dirname(original.evidencePack),directory)
  const [pack,validation]=await Promise.all([
    readFile(path.join(ROOT,original.evidencePack)),readJSON(path.join(ROOT,directory,'pack-validation.json'))
  ])
  assert.equal(validation.valid,true)
  const browserVerdict=judgeJourney({task,persona,events,checks:original.outcomeChecks,kaneStatus:parsed.status})
  assert.equal(browserVerdict.status,parsed.status)
  const review={
    sessionId:original.runId,
    originalStatus:original.status,
    kaneStatus:parsed.status,
    browserVerdict,
    sha256:{result:sha256(resultBytes),events:sha256(eventBytes),evidencePack:sha256(pack)}
  }
  return {result:{...original,status:browserVerdict.status,browserVerdict},review}
}
