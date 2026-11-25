import assert from 'node:assert/strict'
import path from 'node:path'
import {readFile,rm,writeFile} from 'node:fs/promises'
import {ROOT,command,instant,readJSON,saveJSON} from '../../core/io.mjs'
import {catalog,fix,withLock} from '../../core/loop.mjs'
import {reviewRecordedJourney} from '../../scripts/recorded-journey.mjs'

const proof='proof/report-to-fix'
const recorded=await readJSON(path.join(ROOT,proof,'queue-result.json'))
const {task}=recorded
const base=path.join('proof/kane',task.id,'barrier-report')
const attempt=path.join(base,'attempt-1')
const provenanceFile=path.join(ROOT,attempt,'provenance.json')
const reviewFile=path.join(attempt,'after','trace-review.json')
const candidate=await readJSON(path.join(ROOT,attempt,'candidate.json'))
const lanes=[
  {directory:path.join(base,'before'),persona:task.persona,patch:null,id:'700b66b7-5292-4f62-a065-f68e422ce5ea',verdict:'fail'},
  {directory:path.join(base,'control'),persona:'control',patch:null,id:'7168aa29-00c7-4051-8f07-5ef30704757e',verdict:'pass'},
  {directory:path.join(attempt,'after'),persona:task.persona,patch:candidate,id:'006b53ce-69e2-485b-88a9-612d56890d6f',verdict:'pass'}
]

await withLock(async()=>{
  assert.equal(recorded.status,'inconclusive')
  assert(!(await catalog()).some(patch=>patch.id===candidate.id))
  const checked=await Promise.all(lanes.map(async lane=>{
    const {result,review}=await reviewRecordedJourney({...lane,task})
    assert.equal(result.runId,lane.id)
    assert.equal(result.status,lane.verdict)
    const validation=await command('kane-cli',['evidence','validate','--json',path.join(ROOT,result.evidencePack)],{timeout:25000})
    assert.equal(validation.code,0,validation.stderr)
    assert.equal(JSON.parse(validation.stdout).valid,true)
    return {...lane,result,review}
  }))
  const after=checked.at(-1)
  assert.equal(after.review.originalStatus,'inconclusive')
  const originalProvenance=await readFile(provenanceFile)
  const provenance={
    ...JSON.parse(originalProvenance),
    traceReview:{
      file:reviewFile,
      originalQueueResult:path.join(proof,'queue-result.json'),
      verifierFix:'9e57e5486b33b412d9effaad3bd84131ea5845a8',
      checkedAt:instant(),
      newKaneCredits:0,
      detail:'The Kane verdicts came from the original continuous run. Curb Cut rejected the first patched trace because the visibility checkpoint appeared before the focus event from the same Tab. The verifier fix includes a regression test. The unchanged trace was rechecked before publication in a later step.'
    }
  }
  await saveJSON(path.join(ROOT,reviewFile),after.review)
  try {
    let index=0
    const published=await fix(task,{base:path.join(ROOT,base),registeredCandidate:candidate,provenance,
      run:async(_task,persona,patch,directory)=>{
        const lane=checked[index++]
        assert.equal(directory,path.join(ROOT,lane.directory))
        assert.equal(persona,lane.persona)
        assert.deepEqual(patch,lane.patch)
        return lane.result
      }
    })
    assert.equal(published.status,'verified')
    assert.equal(index,checked.length)
    console.log(JSON.stringify({patch:published.patch.id,status:published.status,publishedAt:published.patch.evidence.verifiedAt,
      kaneRunIds:published.patch.evidence.kaneRunIds,newKaneCredits:0},null,2))
  } catch(error) {
    await writeFile(provenanceFile,originalProvenance)
    await rm(path.join(ROOT,reviewFile),{force:true})
    throw error
  }
})
