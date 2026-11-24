import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {siteKey,taskNavigation} from '../core/task.mjs'
import {fix,repairLocally,withLock} from '../core/loop.mjs'
import {requireKane,runKane} from '../core/kane.mjs'
import {preflight} from '../core/preflight.mjs'
import {git,sha256} from './scout-v4.mjs'
import {attempts,blob,breakdown,count,firstInput,frozen,given,kaneSeed,model,optional,read,recordFreeze,relative,same,save} from './cohort-v5.mjs'

const budget=380,reserve=150,phaseReserve=100
const freezeFile='freeze-integrity.json',sampleFile='sample.json',scoutFile='scouting.json',registrationFile='registration.json'
const localFile='local-summary.json',selectionFile='kane-selection.json'
const discoveryFiles=[freezeFile,sampleFile,'prior-sites.json','safety-exclusions.json',scoutFile]

async function inputs(names) {return Object.fromEntries(await Promise.all(names.map(async name=>[name,await firstInput(name)])))}

async function registrationInputs() {
  const [freeze,sources]=await Promise.all([frozen(),inputs(discoveryFiles)])
  await git(['merge-base','--is-ancestor',sources[sampleFile].commit,sources[scoutFile].commit+'^'])
  return {freeze,sources}
}

async function register() {
  if(await optional(registrationFile)) throw new Error('The v5 task set has already been registered.')
  const [{freeze,sources},sample,scout]=await Promise.all([registrationInputs(),read(sampleFile),read(scoutFile)])
  if(!same(scout.sample,sources[sampleFile]) || !same(scout.prior,sources['prior-sites.json']) || !same(scout.safety,sources['safety-exclusions.json']) ||
    scout.frozenCommit!==freeze.frozenCommit || scout.runner!=='playwright' || scout.rows.length!==count || scout.summary.attempted!==count ||
    !scout.rows.every((row,index)=>row.site===sample.sites[index].site && row.rank===sample.sites[index].rank && row.frozenCommit===freeze.frozenCommit)) {
    throw new Error('Scouting does not match the complete committed sample.')
  }
  const tasks=[],preflightExcluded=[],seen=new Set()
  for(const row of scout.rows) for(const {task,result,access} of row.checks??[]) {
    if(result.status!=='confirmed') continue
    if(seen.has(task.id) || !task.id.startsWith('v5-') || result.runner!=='playwright' || result.control?.status!=='pass' ||
      result.persona?.status!=='fail' || siteKey(new URL(task.url))!==row.site || !taskNavigation(new URL(row.url),new URL(task.url))) {
      throw new Error('Invalid confirmed v5 task '+task.id+'.')
    }
    seen.add(task.id)
    if(access?.status!=='pass') {
      preflightExcluded.push({id:task.id,site:row.site,access})
      continue
    }
    if(access.runner!=='playwright-cdp' || !same(access.lanes.map(lane=>lane.persona),[task.persona,'control']) ||
      access.lanes.some(lane=>lane.status!=='pass' || !taskNavigation(new URL(task.url),new URL(lane.url)))) {
      throw new Error('Invalid access preflight for '+task.id+'.')
    }
    tasks.push({site:row.site,task,before:result.persona,control:result.control,access})
  }
  if(!tasks.length || tasks.length!==scout.summary.eligible || preflightExcluded.length!==scout.summary.preflightExcluded) {
    throw new Error('Eligible registration does not match the discovery totals.')
  }
  await save(registrationFile,{version:5,registeredAt:instant(),runner:'playwright',model,attempts,frozenCommit:freeze.frozenCommit,
    sources,preflightExcluded,tasks})
  await save('registration-integrity.json',{version:1,recordedAt:instant(),objectFormat:freeze.objectFormat,frozenObjects:freeze.frozenObjects,
    inputs:{...sources,[registrationFile]:{blob:await blob(relative(registrationFile))}}})
  console.log('Registered '+tasks.length+' eligible tasks after '+count+' site attempts. Preflight excluded '+preflightExcluded.length+'.')
}

async function verifyRegistration() {
  const [{freeze,sources},registered,plan,receipt]=await Promise.all([
    registrationInputs(),firstInput(registrationFile),read(registrationFile),read('registration-integrity.json')
  ])
  await git(['merge-base','--is-ancestor',sources[scoutFile].commit,registered.commit+'^'])
  if(!same(plan.sources,sources) || plan.frozenCommit!==freeze.frozenCommit || plan.model!==model || plan.attempts!==attempts ||
    !same(receipt.inputs,{...sources,[registrationFile]:{blob:registered.blob}}) || !same(receipt.frozenObjects,freeze.frozenObjects) || receipt.objectFormat!==freeze.objectFormat) {
    throw new Error('The registered task set fails its integrity receipt.')
  }
  return {registered,plan}
}

async function local() {
  if(await optional(localFile)) throw new Error('The v5 local repair run already finished.')
  const {registered,plan}=await verifyRegistration()
  process.env.CURBCUT_MODEL=model
  delete process.env.CURBCUT_CHROME
  const results=new Map(),queue=[]
  for(const row of plan.tasks) {
    const previous=await optional('local/'+row.task.id+'/outcome.json')
    if(previous) {
      if(!same(previous.registered,registered) || !same(previous.task,row.task)) throw new Error('Checkpoint differs from registration for '+row.task.id+'.')
      if(previous.status==='proposal infrastructure failed twice') throw new Error(previous.reason)
      results.set(row.task.id,previous)
    } else queue.push(row)
  }
  let stopped
  async function worker() {
    while(!stopped && queue.length) {
      const {task}=queue.shift()
      await verifyRegistration()
      const base=given('local/'+task.id)
      const result=await repairLocally(task,{base,attempts})
      const row={registered,task,...result}
      await saveJSON(path.join(base,'outcome.json'),row)
      results.set(task.id,row)
      console.log(results.size+'/'+plan.tasks.length,task.id,result.status,result.reason??'')
      if(result.status==='proposal infrastructure failed twice') stopped=new Error(task.id+' failed twice in the proposal infrastructure. '+result.reason)
      await delay(900)
    }
  }
  await Promise.all(Array.from({length:2},worker))
  if(stopped) throw stopped
  await verifyRegistration()
  const rows=plan.tasks.map(({task})=>results.get(task.id))
  const v4=await readJSON(path.join(ROOT,'proof/hard-v4/local-summary.json'))
  const comparison={fixed:v4.fixed,total:v4.total,byClass:v4.byClass,byPersona:v4.byPersona}
  const summary={runner:'playwright',completedAt:instant(),registered,model,...breakdown(rows,'locally-fixed'),v4:comparison,results:rows}
  await save(localFile,summary)
  console.log(JSON.stringify({fixed:summary.fixed,total:summary.total,byClass:summary.byClass,byPersona:summary.byPersona},null,2))
}

async function credits() {
  const match=(await requireKane()).match(/Available credits:\s*([\d,.]+)/i)
  const amount=match?Number(match[1].replaceAll(',','')):NaN
  if(!Number.isFinite(amount)) throw new Error('Kane did not return an available credit balance.')
  return amount
}

function selectedCases(rows,allowed,limit) {
  const order=value=>sha256(kaneSeed+'\n'+value)
  const pool=rows.filter(row=>row.status==='locally-fixed' && allowed.has(row.task.id)).sort((a,b)=>order(a.task.id).localeCompare(order(b.task.id)))
  const strata=Map.groupBy(pool.filter(row=>row.task.barrierClass),row=>row.task.barrierClass)
  const classes=[...strata.keys()].sort((a,b)=>order(a).localeCompare(order(b)))
  const chosen=[]
  while(chosen.length<limit && classes.some(kind=>strata.get(kind).length)) {
    for(const kind of classes) if(chosen.length<limit && strata.get(kind).length) chosen.push(strata.get(kind).shift())
  }
  chosen.push(...pool.filter(row=>!row.task.barrierClass).slice(0,limit-chosen.length))
  return chosen.map(row=>({id:row.task.id,persona:row.task.persona,barrierClass:row.task.barrierClass,proposal:row.proposal,
    patchSha256:sha256(JSON.stringify(row.patch))}))
}

async function selectKane() {
  if(await optional(selectionFile)) throw new Error('The v5 Kane selection already exists.')
  const [{registered,plan},source,summary,available]=await Promise.all([verifyRegistration(),firstInput(localFile),read(localFile),credits()])
  if(!same(summary.registered,registered) || summary.runner!=='playwright') throw new Error('Local results do not match the registered v5 task set.')
  const spendable=Math.min(budget,available-reserve)
  if(spendable<3*phaseReserve) throw new Error('The balance cannot reserve three Kane phases above the protected floor.')
  const historical=await readJSON(path.join(ROOT,'proof/hard-v4/kane-summary.json'))
  const observed=historical.results.flatMap(row=>row.phases).filter(phase=>phase.runner==='kane' && phase.balance>phase.after)
    .map(phase=>phase.balance-phase.after).sort((a,b)=>a-b)
  const estimatedPerCase=Math.ceil(observed[Math.floor(observed.length/2)]*3)
  const capacity=Math.floor(spendable/estimatedPerCase)
  const eligible=new Set(plan.tasks.filter(row=>row.access.status==='pass').map(row=>row.task.id))
  const targets=selectedCases(summary.results,eligible,capacity)
  if(!targets.length) throw new Error('No locally fixed task passed the registered preflight.')
  await save(selectionFile,{version:5,seed:kaneSeed,selectedAt:instant(),registered,local:source,available,budget,reserve,phaseReserve,
    estimatedPerCase,capacity,targets,method:'Take seeded samples within hard classes in seeded round-robin order. Use single controls only if fewer hard repairs qualify.'})
  console.log('Selected '+targets.length+' v5 tasks with '+available+' credits available.')
}

class BudgetStop extends Error {}
const phaseResult=result=>({status:result.status,runner:result.runner,runId:result.runId,rawKaneStatus:result.kaneStatus,
  evidenceValid:result.evidenceValid,credits:result.credits,reason:result.integrity??result.reason,video:result.video,evidencePack:result.evidencePack})

async function runSelectedKane() {
  const summaryFile='kane-summary.json'
  if(await optional(summaryFile)) throw new Error('The v5 Kane sample already finished.')
  const [{registered,plan},source,local,selection,selectionSource]=await Promise.all([
    verifyRegistration(),firstInput(localFile),read(localFile),read(selectionFile),firstInput(selectionFile)
  ])
  const eligible=new Set(plan.tasks.filter(row=>row.access.status==='pass').map(row=>row.task.id))
  if(!same(selection.registered,registered) || !same(selection.local,source) || selection.seed!==kaneSeed || selection.budget!==budget ||
    selection.reserve!==reserve || selection.phaseReserve!==phaseReserve || !same(selection.targets,selectedCases(local.results,eligible,selection.capacity))) {
    throw new Error('The committed Kane sample fails its integrity check.')
  }
  await git(['merge-base','--is-ancestor',source.commit,selectionSource.commit+'^'])
  const previous=await optional('kane-journal.json')
  if(previous && !same(previous.selection,selectionSource)) throw new Error('Kane journal belongs to a different selection.')
  const initial=previous?.initial??await credits()
  const floor=Math.max(reserve,initial-budget,selection.available-budget)
  const journal={initial,floor,selection:selectionSource,startedAt:previous?.startedAt??instant()}
  await save('kane-journal.json',journal)
  delete process.env.CURBCUT_CHROME
  process.env.CURBCUT_KANE_MIN_CREDITS=String(floor+phaseReserve)
  const results=[],failures=new Map()
  let stopped
  for(const target of selection.targets) {
    const candidateRow=local.results.find(row=>row.task.id===target.id)
    const {task}=plan.tasks.find(row=>row.task.id===target.id)
    const base=given('kane/'+task.id)
    const outcome='kane/'+task.id+'/outcome.json'
    const recorded=await optional(outcome)
    if(recorded?.finishedAt) {
      results.push(recorded)
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
        if(balance<floor+3*phaseReserve) throw new BudgetStop('The remaining balance cannot reserve three phases above '+floor.toFixed(4)+' credits.')
        row.preflight=await preflight(task)
      } else row.preflight=recorded.preflight
      if(row.preflight?.status!=='pass') {
        row.status='preflight blocked'
        row.reason=row.preflight?.lanes.find(lane=>lane.status!=='pass')?.reason??'The selected site did not pass the current access preflight.'
      } else {
        const run=async(current,persona,patch,directory)=>{
          await verifyRegistration()
          if(!same(await firstInput(selectionFile),selectionSource)) throw new Error('The Kane sample changed during verification.')
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
          if(balance<floor+remaining*phaseReserve) throw new BudgetStop('The balance cannot reserve '+name+' above '+floor.toFixed(4)+' credits.')
          console.log(task.id,name,'balance',balance)
          const result=await runKane(current,persona,patch,directory,{maxSteps:persona==='keyboard-only'?24:18,timeout:180,assertionMode:'dom'})
          const after=await credits()
          phases.push({name,balance,after,...phaseResult(result)})
          await persistPhase()
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
    results.push(row)
    if(stopped) break
    await delay(1200)
  }
  const paired=results.map(row=>({before:row.phases.find(phase=>phase.name==='before'),
    after:row.phases.findLast(phase=>phase.name.startsWith('attempt-1/after'))})).filter(pair=>
      [pair.before,pair.after].every(phase=>phase?.runner==='kane' && phase.evidenceValid))
  const agreement={matched:paired.filter(pair=>pair.before.status==='fail' && pair.after.status==='pass').length,paired:paired.length}
  const end=await credits()
  const started=results.filter(row=>row.phases.some(phase=>phase.runner==='kane'))
  const unrun=selection.targets.filter(target=>!started.some(row=>row.task.id===target.id)).map(target=>target.id)
  const summary={...journal,runner:'kane',finishedAt:instant(),end,spent:Number((initial-end).toFixed(4)),budget,reserve,
    selected:selection.targets.length,started:started.length,agreement,stopped,unrun,...breakdown(results,'verified'),results}
  await save(summaryFile,summary)
  await save('kane-selection-integrity.json',{version:1,recordedAt:instant(),inputs:{[selectionFile]:selectionSource,[localFile]:source,[summaryFile]:{blob:await blob(relative(summaryFile))}}})
  console.log(JSON.stringify({verified:summary.fixed,selected:summary.selected,started:summary.started,agreement,spent:summary.spent,end,stopped},null,2))
}

const action=process.argv[2]
if(action==='freeze') await recordFreeze()
else if(action==='register') await register()
else if(action==='local') await withLock(local)
else if(action==='select-kane') await selectKane()
else if(action==='kane') await withLock(runSelectedKane)
else throw new Error('Usage: node scripts/hard-v5.mjs freeze | register | local | select-kane | kane')
