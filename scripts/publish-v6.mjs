import assert from 'node:assert/strict'
import {copyFile,readFile,rm} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import validate from '../core/validate.generated.cjs'
import {read,save} from './freeze-v6.mjs'
import {sha256} from './scout-v4.mjs'

const local=await read('local-summary.json')
const kane=await read('kane-summary.json').catch(error=>{if(error.code!=='ENOENT') throw error})
const finalize=process.argv[2]==='finalize'
const audit=finalize?await read('extension-e2e.json'):null
const passed=new Set(audit?.results.filter(row=>row.status==='pass').map(row=>row.id))
const releases=[]
for(const row of local.rows.filter(row=>row.status==='locally-fixed')) {
  const {id,category}=row
  const verified=kane?.cases.find(row=>row.id===id && row.verified)
  if(!verified && !['low-contrast','missing-language'].includes(category)) continue
  const target=path.join(ROOT,'patches',id+'.json')
  const measurement='proof/heldout-v6/measurements/'+id+'.json'
  const artifact='proof/heldout-v6/release/'+id+'.json'
  if(finalize) {
    if(!passed.has(id)) {
      await rm(target,{force:true})
      await rm(path.join(ROOT,artifact),{force:true})
      continue
    }
    const bytes=await readFile(path.join(ROOT,artifact))
    assert(bytes.equals(await readFile(target)),id+' patch and archived release bytes')
    releases.push({id,category,proof:verified?'kane':'local',measurement,artifact,sha256:sha256(bytes)})
    continue
  }
  const verifiedAt=row.checkedAt??instant()
  const evidence=verified?{
    ...Object.fromEntries(['before','control','after'].map(phase=>[phase,verified.phases[phase].at(-1).recording])),
    kaneRunIds:['before','control','after'].map(phase=>verified.phases[phase].at(-1).runId),
    kaneVerdicts:{before:'fail',control:'pass',after:'pass'},
    verifiedAt,localMeasurement:measurement
  }:{verifiedAt,localMeasurement:measurement}
  if(verified) for(const phase of ['before','control','after']) {
    const lane=verified.phases[phase].at(-1)
    const result=await readJSON(path.join(ROOT,lane.artifact,'result.json'))
    assert(result.evidenceValid && result.runId===lane.runId && result.video===lane.recording)
  }
  const patch={...row.patch,status:verified?'verified':'locally-verified',evidence,
    history:[{event:verified?'verified':'locally-verified',at:verifiedAt,frozenCommit:local.frozenCommit,
      candidateSha256:sha256(JSON.stringify(row.patch))}]}
  assert(validate(patch),JSON.stringify(validate.errors))
  await saveJSON(path.join(ROOT,measurement),{category,checkedAt:row.checkedAt,before:row.before,after:row.after,restored:row.restored,
    ...(row.language?{language:row.language}:{}),...(row.proposal?{proposal:row.proposal}:{})})
  try {assert.deepEqual(await readJSON(target),patch)}
  catch(error) {if(error.code!=='ENOENT') throw error}
  await saveJSON(path.join(ROOT,artifact),patch)
  await copyFile(path.join(ROOT,artifact),target)
  releases.push({id,category,proof:verified?'kane':'local',measurement,artifact,
    sha256:sha256(await readFile(path.join(ROOT,artifact)))})
}
await save(finalize?'release.json':'release-candidates.json',{frozenCommit:local.frozenCommit,generatedAt:instant(),releases})
console.log(releases.length,finalize?'audited fixes retained':'fixes staged for the installed extension audit')
