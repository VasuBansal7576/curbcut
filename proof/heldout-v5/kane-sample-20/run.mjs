import assert from 'node:assert/strict'
import {createHash,randomBytes} from 'node:crypto'
import {access,copyFile,readFile} from 'node:fs/promises'
import path from 'node:path'
import {setTimeout as pause} from 'node:timers/promises'
import {ROOT,instant,readJSON,relative,saveJSON} from '../../../core/io.mjs'
import {requireKane,runKane} from '../../../core/kane.mjs'
import {withLock} from '../../../core/loop.mjs'
import {preflight} from '../../../core/preflight.mjs'
import validate from '../../../core/validate.generated.cjs'
import {blob,firstInput,given,optional,read,save} from '../../../scripts/cohort-v5.mjs'

const folder='kane-sample-20'
const registration=folder+'/registration.json'
const summaryFile=folder+'/summary.json'
const inputs=['registration.json','local-summary.json','kane-selection.json']
const expected={before:'fail',control:'pass',after:'pass'}
const phases=Object.keys(expected)
const sha256=value=>createHash('sha256').update(value).digest('hex')
const rounded=value=>Number(value.toFixed(4))

async function loadPool(seed) {
  const [registered,local,previous]=await Promise.all(inputs.map(read))
  const excluded=previous.targets.map(row=>row.id).sort()
  const registeredTasks=new Map(registered.tasks.map(row=>[row.task.id,row]))
  const fixed=local.results.filter(row=>row.status==='locally-fixed')
  assert.equal(fixed.length,local.fixed)
  assert.equal(new Set(excluded).size,4)
  assert.ok(excluded.every(id=>fixed.some(row=>row.task.id===id)))
  const pool=await Promise.all(fixed.filter(row=>!excluded.includes(row.task.id)).map(async row=>{
    const {task,access}=registeredTasks.get(row.task.id)
    assert.deepEqual(task,row.task)
    assert.equal(access.status,'pass')
    assert.doesNotMatch(task.task+' '+task.controlTask,/\{\{|\$\{/)
    const candidateFile=row.proposal+'/candidate.json'
    const bytes=await readFile(path.join(ROOT,candidateFile))
    const patch=JSON.parse(bytes)
    assert.deepEqual(patch,row.patch)
    assert.ok(validate(patch) && patch.id===task.id && patch.status==='candidate')
    const before=row.phases.find(phase=>phase.name==='before')
    const control=row.phases.find(phase=>phase.name==='control')
    const after=row.phases.find(phase=>phase.name===path.basename(row.proposal)+'/after')
    const localOracle={before:before.status,control:control.status,after:after.status}
    assert.deepEqual(localOracle,expected)
    const entry={id:task.id,site:new URL(task.url).hostname,persona:task.persona,rank:sha256(seed+'\n'+task.id),
      candidateFile,candidateSha256:sha256(bytes),localOracle,sourceLocalRun:before.file,sourceLocalAfter:after.file}
    return {entry,task,patch}
  }))
  pool.sort((a,b)=>a.entry.rank<b.entry.rank?-1:a.entry.rank>b.entry.rank?1:0)
  assert.equal(new Set(pool.map(({entry})=>entry.rank)).size,pool.length)
  const inputBlobs=Object.fromEntries(await Promise.all(inputs.map(async file=>[file,await blob(relative(given(file)))])))
  return {pool,excluded,inputBlobs}
}

async function preregister() {
  assert.equal(await optional(registration),null,'This sample already has a registration.')
  const seed=randomBytes(32).toString('hex')
  const {pool,excluded,inputBlobs}=await loadPool(seed)
  await save(registration,{
    version:1,registeredAt:instant(),seed,
    method:'Draw 32 random bytes once and encode as lowercase hex. Sort all eligible task IDs by ascending lowercase SHA-256 of the UTF-8 seed, one newline, and the task ID. Visit entries in this order.',
    inputBlobs,excludedPreviousSelection:excluded,target:20,
    replacement:'Skip and record each case that fails the free two-persona CDP preflight, then take the next ID. No replacement for a case admitted by preflight.',
    protocol:{
      sequence:phases,
      before:'Use the registered persona on the unpatched page.',
      control:'Use the pointer on the unpatched page.',
      after:'Use the registered persona with the exact locally successful candidate whose file SHA-256 is recorded.',
      limits:{'keyboard-only':{maxSteps:50,timeout:360},control:{maxSteps:22,timeout:300},'low-vision':{maxSteps:26,timeout:360},
        'screen-reader-view':{maxSteps:24,timeout:250},'color-blind':{maxSteps:24,timeout:250}},
      verdicts:expected,
      retry:'Retry each inconclusive phase once. Keep both records and take the retry verdict. A blocked run after preflight is an inconclusive phase and may receive its one retry.',
      evidence:'Each decisive phase needs a Kane session ID, a validated sealed evidence pack, a viewport recording, and the adapter verdict. No local result counts as Kane.',
      agreement:'Compare each decisive phase with the saved local verdict. Report phase agreement and all-lane agreement for cases with three decisive runs. Count inconclusive and unrun phases separately.',
      denominator:'Count each preflight-admitted case in which at least one Kane invocation starts, including partial cases. Report the number with all three phases separately.',
      stopping:'Stop the stage after the same harness or provider execution failure occurs twice. Keep routine measurement inconclusives and repeat them once per phase.'
    },
    budget:{maximumSpend:2600,minimumBalance:2300,phaseReserve:100,
      rule:'Before each invocation, require at least the larger of 2300 and the starting balance minus 2600, plus the phase reserve. Stop if the balance guard fails or the ledger shows the cap has been reached.'},
    order:pool.map(({entry})=>entry)
  })
}

async function credit(attempt=1) {
  try {
    const balance=Number((await requireKane()).match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
    assert.ok(Number.isFinite(balance),'Kane did not return an available credit balance.')
    return balance
  } catch(error) {
    if(attempt===2) throw error
    await pause(2000)
    return credit(2)
  }
}

function score(summary) {
  const cases=summary.cases.filter(row=>row.runs.some(run=>run.invoked))
  const agreement={matched:0,assessed:0,unassessed:0,completeMatched:0,completeAssessed:0}
  const inconclusiveReasons={}
  const attemptInconclusiveReasons={}
  const counts={}
  for(const {runs} of summary.cases) for(const run of runs.filter(run=>run.status==='inconclusive')) {
    const reason=run.category??run.reason??'Unknown result'
    attemptInconclusiveReasons[reason]=(attemptInconclusiveReasons[reason]??0)+1
  }
  let completed=0
  for(const row of cases) {
    row.verdicts={}
    for(const phase of phases) {
      const run=row.runs.findLast(item=>item.phase===phase)
      const verdict=run?.status??'unrun'
      row.verdicts[phase]=verdict
      if(['pass','fail'].includes(verdict)) {
        agreement.assessed++
        if(verdict===row.localOracle[phase]) agreement.matched++
      } else {
        agreement.unassessed++
        if(verdict!=='unrun') {
          const reason=run.category??run.reason??'Unknown result'
          inconclusiveReasons[reason]=(inconclusiveReasons[reason]??0)+1
        }
      }
    }
    const complete=phases.every(phase=>['pass','fail'].includes(row.verdicts[phase]))
    if(phases.every(phase=>row.verdicts[phase]!=='unrun')) completed++
    const agreed=phases.every(phase=>row.verdicts[phase]===row.localOracle[phase])
    if(complete) {
      agreement.completeAssessed++
      if(agreed) agreement.completeMatched++
    }
    row.kaneVerified=complete && phases.every(phase=>row.verdicts[phase]===expected[phase])
    row.status=row.kaneVerified?'verified':
      phases.some(phase=>['pass','fail'].includes(row.verdicts[phase]) && row.verdicts[phase]!==expected[phase])?'failed':'inconclusive'
    counts[row.status]=(counts[row.status]??0)+1
  }
  Object.assign(summary,{started:cases.length,completed,kaneVerified:counts.verified??0,fullyAssessed:agreement.completeAssessed,
    counts,inconclusiveReasons,attemptInconclusiveReasons,agreement})
}

async function runSample() {
  const [protocol,receipt,runner]=await Promise.all([read(registration),firstInput(registration),firstInput(folder+'/run.mjs')])
  assert.equal(runner.commit,receipt.commit,'Commit the sample runner with its registration.')
  assert.equal(await optional(summaryFile),null,'A sample ledger already exists. Inspect it before any further Kane invocation.')
  const {pool,excluded,inputBlobs}=await loadPool(protocol.seed)
  assert.deepEqual(inputBlobs,protocol.inputBlobs)
  assert.deepEqual(excluded,protocol.excludedPreviousSelection)
  assert.deepEqual(pool.map(({entry})=>entry),protocol.order)
  assert.deepEqual(protocol.protocol.sequence,phases)
  assert.deepEqual(protocol.protocol.verdicts,expected)

  delete process.env.CURBCUT_CHROME
  delete process.env.CURBCUT_KANE_MAX_STEPS
  const initialBalance=await credit()
  const floor=rounded(Math.max(protocol.budget.minimumBalance,initialBalance-protocol.budget.maximumSpend))
  const minimumToStart=rounded(floor+protocol.budget.phaseReserve)
  process.env.CURBCUT_KANE_MIN_CREDITS=String(minimumToStart)
  const summary={runner:'kane',registration:receipt,startedAt:instant(),target:protocol.target,
    initialBalance,finalBalance:initialBalance,creditsSpent:0,floor,minimumToStart,cases:[],skips:[]}
  const executionFailures=new Map()
  const write=()=>save(summaryFile,summary)
  function failed(reason,detail) {
    executionFailures.set(reason,(executionFailures.get(reason)??0)+1)
    if(executionFailures.get(reason)>=2) summary.stopped='Repeated execution failure ('+reason+'). '+detail
  }
  const canStart=balance=>{
    if(balance>=minimumToStart) return true
    summary.stopped='Available balance '+balance.toFixed(4)+' fell below the '+minimumToStart.toFixed(4)+'-credit phase guard.'
    return false
  }
  await write()
  try {
    sample: for(const {entry,task,patch} of pool) {
      if(summary.cases.length===protocol.target || summary.stopped) break
      summary.finalBalance=await credit()
      if(!canStart(summary.finalBalance)) break
      const directory=given(folder+'/'+task.id)
      let accessReport
      try {accessReport=await preflight(task)}
      catch(error) {
        const reason=error.message.split('\n')[0]
        failed(reason,reason)
        accessReport={status:'error',reason}
      }
      const preflightFile=path.join(directory,'preflight.json')
      await saveJSON(preflightFile,accessReport)
      const preflightPath=relative(preflightFile)
      if(accessReport.status!=='pass') {
        const reason=accessReport.reason??accessReport.lanes.find(lane=>lane.status!=='pass')?.reason
        summary.skips.push({id:task.id,site:entry.site,reason,preflight:preflightPath})
        await write()
        console.log(entry.site,'preflight skip',reason)
        await pause(1000)
        continue
      }
      const row={...entry,preflight:preflightPath,runs:[]}
      summary.cases.push(row)
      const candidate=path.join(directory,'candidate.json')
      await copyFile(path.join(ROOT,entry.candidateFile),candidate)
      assert.equal(sha256(await readFile(candidate)),entry.candidateSha256)
      await saveJSON(path.join(directory,'provenance.json'),{priorAgentProposal:entry.candidateFile,
        candidateSha256:entry.candidateSha256,registrationBlob:inputBlobs['registration.json'],sampleRegistration:receipt,
        sourceLocalRun:entry.sourceLocalRun,sourceLocalAfter:entry.sourceLocalAfter})
      await write()

      for(const phase of phases) {
        const persona=phase==='control'?'control':task.persona
        for(let attempt=1;attempt<=2;attempt++) {
          const balanceBefore=await credit()
          summary.finalBalance=balanceBefore
          if(!canStart(balanceBefore)) break sample
          const output=path.join(directory,phase+(attempt===2?'-retry':''))
          const run={phase,attempt,persona,balanceBefore,startedAt:instant()}
          row.runs.push(run)
          await write()
          console.log(summary.cases.length+'/'+protocol.target,entry.site,phase,'attempt',attempt,'starting at',balanceBefore)
          try {
            const result=await runKane(task,persona,phase==='after'?patch:null,output).catch(async error=>{
              const saved=await readJSON(path.join(output,'result.json')).catch(()=>null)
              if(!saved) throw error
              run.adapterWarning=error.message.split('\n')[0]
              return saved
            })
            if(result.limits) {
              const {maxSteps,timeout}=result.limits
              assert.deepEqual({maxSteps,timeout},protocol.protocol.limits[persona])
            }
            const proof=result.runner==='kane' && Boolean(result.runId && result.video && result.evidenceValid && result.evidencePack)
            if(proof) await Promise.all([result.video,result.evidencePack].map(file=>access(path.join(ROOT,file))))
            const status=proof && ['pass','fail'].includes(result.status)?result.status:'inconclusive'
            run.invoked=result.runner==='kane'
            Object.assign(run,{status,reason:result.integrity??result.reason,rawKaneStatus:result.kaneStatus,rawKaneReason:result.reason,
              reasonCode:result.reasonCode,runId:result.runId,recording:result.video,evidencePack:result.evidencePack,evidenceValid:result.evidenceValid,
              result:relative(path.join(output,'result.json')),kaneReportedCredits:result.credits,limits:result.limits})
            if(status==='inconclusive') {
              const rawIssue=result.kaneStatus==='inconclusive' && (result.reasonCode??result.reason)
              run.category=result.status==='blocked'?'run access blocked':rawIssue || result.browserVerdict?.basis || result.integrity || result.reason
              if(result.reasonCode?.startsWith('agent_error.') || result.exitSignal || result.runner==='kane' && !result.evidenceValid) {
                const reason=result.exitSignal??result.evidenceError??result.reasonCode??'missing Kane evidence'
                failed(reason+(result.reasonCode?.startsWith('agent_error.')?': '+result.reason:''),
                  result.integrity??result.reason??result.evidenceError??reason)
              }
            }
          } catch(error) {
            const phaseStarted=await access(path.join(output,'events.ndjson')).then(()=>true,()=>false)
            run.invoked=phaseStarted
            run.status='inconclusive'
            run.reason=error.message.split('\n')[0]
            run.category='execution error'
            failed(run.reason,run.reason)
          }
          run.finishedAt=instant()
          run.balanceAfter=await credit()
          run.creditsSpent=rounded(balanceBefore-run.balanceAfter)
          if(run.creditsSpent>0) run.invoked=true
          summary.finalBalance=run.balanceAfter
          summary.creditsSpent=rounded(initialBalance-summary.finalBalance)
          if(summary.creditsSpent>=protocol.budget.maximumSpend) summary.stopped='The ledger reached the maximum spend.'
          score(summary)
          await write()
          console.log(entry.site,phase,run.status,run.reason??'',run.creditsSpent)
          if(summary.stopped) break sample
          await pause(1000)
          if(run.status!=='inconclusive') break
        }
      }
    }
  } catch(error) {
    summary.stopped=error.message.split('\n')[0]
    console.error('Sample stopped:',summary.stopped)
  }
  if(summary.cases.length<protocol.target && !summary.stopped) summary.stopped='Seeded order exhausted.'
  summary.finishedAt=instant()
  summary.creditsSpent=rounded(initialBalance-summary.finalBalance)
  score(summary)
  await write()
  console.log('Kane verified',summary.kaneVerified,'of',summary.started,'started cases. Credits:',summary.creditsSpent,'remaining:',summary.finalBalance)
}

if(process.argv[2]==='register') await preregister()
else if(process.argv[2]==='run') await withLock(runSample)
else throw new Error('Use register or run.')
