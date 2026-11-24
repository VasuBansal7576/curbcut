import assert from 'node:assert/strict'
import path from 'node:path'
import {randomBytes} from 'node:crypto'
import {instant} from '../core/io.mjs'
import {requireKane,runKane} from '../core/kane.mjs'
import {categories} from '../core/coverage.mjs'
import {directory,frozen,input,read,save} from './freeze-v6.mjs'
import {sha256} from './scout-v4.mjs'

const freeze=await frozen()
const calibration=await read('calibration/summary.json')
const localInput=await input('local-summary.json')
const local=await read('local-summary.json')
const registration=await input('registration.json')
const phases={before:'fail',control:'pass',after:'pass'}
const eligible=categories.filter(category=>category!=='missing-language' && (category!=='low-contrast' || calibration.passed))
const pool=local.rows.filter(row=>row.status==='locally-fixed' && eligible.includes(row.category) &&
  (row.category==='low-contrast' || Boolean(row.patch.evaluation.name)))
const collect=seed=>Object.fromEntries(eligible.map(category=>[category,pool.filter(row=>row.category===category)
  .map(row=>({id:row.id,rank:sha256(seed+'\n'+row.id),candidateSha256:sha256(JSON.stringify(row.patch))}))
  .sort((a,b)=>a.rank.localeCompare(b.rank)).slice(0,5)]))

if(process.argv[2]==='select') {
  if(await read('kane-selection.json').catch(error=>{if(error.code!=='ENOENT') throw error})) throw new Error('Kane selection already exists.')
  const seed=randomBytes(32).toString('hex')
  await save('kane-selection.json',{seed,registeredAt:instant(),frozenCommit:freeze.frozenCommit,registration,localInput,phases,
    maximumStudyCredits:1500,minimumBalance:1850,phaseReserve:15,retriesPerInconclusivePhase:1,
    calibrationPassed:calibration.passed,method:'Sort locally fixed eligible task IDs within each category by SHA-256(seed, newline, ID). Take up to five per category without replacement.',targets:collect(seed)})
} else if(process.argv[2]==='run') {
  const selectionInput=await input('kane-selection.json')
  const selection=await read('kane-selection.json')
  assert.deepEqual(selection.targets,collect(selection.seed))
  assert.deepEqual(selection.localInput,localInput)
  const prior=await read('kane-summary.json').catch(error=>{if(error.code!=='ENOENT') throw error})
  const balance=async()=>Number((await requireKane()).match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
  const threshold=Math.max(selection.minimumBalance,calibration.initialBalance-selection.maximumStudyCredits+selection.phaseReserve)
  process.env.CURBCUT_KANE_MIN_CREDITS=String(threshold)
  const summary=prior??{runner:'kane',selection:selectionInput,startedAt:instant(),studyInitialBalance:calibration.initialBalance,
    startingBalance:await balance(),threshold,cases:[]}
  const failures=new Map()
  for(const [category,targets] of Object.entries(selection.targets)) for(const target of targets) {
    if(summary.cases.some(row=>row.id===target.id) || summary.stopped) continue
    const {patch}=pool.find(row=>row.id===target.id)
    const row={id:target.id,category,phases:{},verified:false}
    for(const [phase,expected] of Object.entries(phases)) {
      const attempts=[]
      row.phases[phase]=attempts
      for(let attempt=1;attempt<=2;attempt++) {
        if(await balance()<threshold) {summary.stopped='Credit guard reached.';break}
        const relative='kane/'+target.id+'/'+phase+'-'+attempt
        let result
        try {result=await runKane(patch,phase==='control'?'control':patch.persona,phase==='after'?patch:null,path.join(directory,relative),
          {maxSteps:phase==='control'?10:18,timeout:160})}
        catch(error) {
          const reason=error.message.split('\n')[0]
          failures.set(reason,(failures.get(reason)??0)+1)
          if(failures.get(reason)>=2) summary.stopped='Repeated execution failure: '+reason
          result={status:'inconclusive',reason}
        }
        attempts.push({status:result.status,runId:result.runId??null,recording:result.video??null,reason:result.integrity??result.reason,
          evidenceValid:result.evidenceValid??false,artifact:'proof/heldout-v6/'+relative})
        if(result.status!=='inconclusive' || summary.stopped) break
      }
      const last=attempts.at(-1)
      if(last?.status!==expected || !last.runId || !last.recording || !last.evidenceValid) break
    }
    row.verified=Object.entries(phases).every(([phase,expected])=>{
      const result=row.phases[phase]?.at(-1)
      return result?.status===expected && result.runId && result.recording && result.evidenceValid
    })
    summary.cases.push(row)
    summary.finalBalance=await balance()
    await save('kane-summary.json',summary)
    console.log(row.id,category,row.verified?'verified':'unverified',summary.finalBalance)
  }
  summary.finishedAt=instant()
  summary.finalBalance=await balance()
  summary.studyCreditsUsed=Number((calibration.initialBalance-summary.finalBalance).toFixed(4))
  summary.byCategory=Object.fromEntries(Object.entries(selection.targets).map(([category,targets])=>[category,{
    selected:targets.length,started:summary.cases.filter(row=>row.category===category && row.phases.before.some(attempt=>attempt.runId)).length,
    verified:summary.cases.filter(row=>row.category===category && row.verified).length
  }]))
  await save('kane-summary.json',summary)
  console.log(JSON.stringify(summary.byCategory))
} else throw new Error('Usage: kane-v6.mjs select | run')
