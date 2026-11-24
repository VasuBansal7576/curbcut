import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {siteKey,taskNavigation} from '../core/task.mjs'
import {fix,repairLocally,withLock} from '../core/loop.mjs'
import {requireKane,runKane} from '../core/kane.mjs'
import {committedBlob,folder,git,samplePath,scoutPath,sha256} from './scout-v4.mjs'

const tag='curbcut-freeze-v4'
const frozenPaths=['core','extension','schemas','scripts','fixtures','tests','curbcut.mjs','package.json','package-lock.json','site/style.css']
const registration=folder+'/registration.json'
const safetyPath=folder+'/safety-exclusions.json'
const eligibilityPath=folder+'/eligibility-review.json'
const followupPath=folder+'/followup.json'
const followupPlan=folder+'/followup-plan.json'
const localSummary=folder+'/local-summary.json'
const kaneSelection=folder+'/kane-selection.json'
const kaneSummary=folder+'/kane-summary.json'
const given=name=>path.join(ROOT,folder,name)
const model='gpt-6.2-sol'
const budget=1250,reserve=250,phaseReserve=120
const kaneSeed='curbcut-kane-v4-local-passes'
const classes=[1,2,3,4,5,6]

function same(a,b) {return JSON.stringify(a)===JSON.stringify(b)}
async function optional(file) {
  try {return await readJSON(path.join(ROOT,file))}
  catch(error) {if(error.code==='ENOENT') return null;throw error}
}

async function frozen() {
  const commit=await git(['rev-parse',tag+'^{commit}'])
  await git(['merge-base','--is-ancestor',commit,'HEAD'])
  const [working,history]=await Promise.all([
    git(['status','--short','--untracked-files=all','--',...frozenPaths]),
    git(['log','--format=%H',commit+'..HEAD','--',...frozenPaths])
  ])
  if(working || history) throw new Error('The frozen implementation changed after '+commit+'.')
  return commit
}

async function firstBlob(file) {
  const commits=await git(['log','--diff-filter=A','--format=%H','--reverse','--',file])
  const commit=commits.split('\n')[0]
  if(!commit) throw new Error(file+' must be committed before use.')
  const [blob,actual]=await Promise.all([git(['rev-parse',commit+':'+file]),git(['hash-object',file])])
  if(blob!==actual) throw new Error(file+' differs from its first committed Git blob.')
  return {commit,blob}
}

async function register() {
  if(await optional(registration)) throw new Error('The complete task registration already exists.')
  const [freezeCommit,sample,scout,safety,eligibility]=await Promise.all([
    frozen(),firstBlob(samplePath),committedBlob(scoutPath),firstBlob(safetyPath),firstBlob(eligibilityPath)
  ])
  const [source,selection]=await Promise.all([optional(scoutPath),optional(samplePath)])
  if(!source || source.runner!=='playwright' || !same(source.registration,sample) || !same(source.safety,safety) ||
    source.rows.length<1500 || source.rows.length!==selection.sites.length ||
    !source.rows.every((row,index)=>row.rank===selection.sites[index].rank && row.site===selection.sites[index].site)) {
    throw new Error('Scouting must account for the complete preregistered sample.')
  }
  const followup=await optional(followupPath)
  const extra=followup?await firstBlob(followupPath):null
  if(followup) {
    const plan=await optional(followupPlan)
    const preregistration=await firstBlob(followupPlan)
    const prefix=source.rows.slice(0,plan.primaryPrefix).map(({rank,site,url,status})=>({rank,site,url,status}))
    if(followup.runner!=='playwright' || !same(followup.sample,sample) || !same(followup.preregistration,preregistration) ||
      !same(prefix,plan.rows) || !same(followup.rows.map(({site})=>site),plan.sites.map(({site})=>site))) {
      throw new Error('Invalid supplemental scouting registration.')
    }
  }
  const review=await optional(eligibilityPath)
  if(review.scoutBlob!==scout.blob || review.followupBlob!==(extra?.blob??null)) throw new Error('The eligibility review is for a different cohort.')
  const exclusions=new Map(review.exclusions.map(row=>[row.id,row]))
  const tasks=[]
  const ids=new Set()
  const complete=[...source.rows,...(followup?.rows??[])]
  for(const row of complete) for(const {task,result} of row.checks??[]) {
    if(result.status!=='confirmed') continue
    if(result.runner!=='playwright' || result.control?.status!=='pass' || result.persona?.status!=='fail' ||
      ids.has(task.id) || siteKey(new URL(task.url))!==row.site || !taskNavigation(new URL(row.url),new URL(task.url))) {
      throw new Error('Invalid confirmed task '+task.id+'.')
    }
    ids.add(task.id)
    const exclusion=exclusions.get(task.id)
    if(exclusion) {
      if(exclusion.site!==row.site || !exclusion.reason) throw new Error('Invalid safety or outcome review for '+task.id)
      exclusions.delete(task.id)
      continue
    }
    tasks.push({task,before:result.persona,control:result.control,site:row.site})
  }
  if(exclusions.size) throw new Error('The eligibility review names a task that was not confirmed.')
  if(!tasks.length) throw new Error('The eligible registered task set was empty.')
  await saveJSON(path.join(ROOT,registration),{version:4,runner:'playwright',registeredAt:instant(),freezeCommit,
    sample,scout,safety,eligibility,extra,attempts:3,model,tasks})
  console.log('Registered',tasks.length,'locally confirmed tasks, including',tasks.filter(row=>row.task.barrierClass).length,'hard journeys.')
}

async function verifyRegistration() {
  const [freezeCommit,registered,sample,scout,safety,eligibility]=await Promise.all([
    frozen(),firstBlob(registration),firstBlob(samplePath),committedBlob(scoutPath),firstBlob(safetyPath),firstBlob(eligibilityPath)
  ])
  await git(['merge-base','--is-ancestor',freezeCommit,registered.commit+'^'])
  const plan=await optional(registration)
  const extra=plan.extra?await firstBlob(followupPath):null
  if(!same(plan.extra,extra) || plan.freezeCommit!==freezeCommit || !same(plan.sample,sample) || !same(plan.scout,scout) || !same(plan.safety,safety) || !same(plan.eligibility,eligibility) ||
    plan.runner!=='playwright' || plan.model!==model || plan.attempts!==3) throw new Error('Registration does not match the frozen methodology.')
  return {plan,registered}
}

function score(results,success) {
  const groups=Object.groupBy(results,row=>row.status)
  return {fixed:groups[success]?.length??0,total:results.length,
    counts:Object.fromEntries(Object.entries(groups).map(([name,rows])=>[name,rows.length]))}
}

function breakdown(results,success){
  function group(field) {
    return Object.fromEntries(Object.entries(Object.groupBy(results,row=>row.task[field]??'single-control')).map(([key,rows])=>[key,score(rows,success)]))
  }
  return {...score(results,success),byClass:group('barrierClass'),byPersona:group('persona')}
}

async function runLocal() {
  const {plan,registered}=await verifyRegistration()
  if(await optional(localSummary)) throw new Error('The registered local cohort already finished.')
  process.env.CURBCUT_MODEL=model
  delete process.env.CURBCUT_CHROME
  const results=new Map()
  const queue=[]
  for(const row of plan.tasks) {
    const already=await optional(folder+'/local/'+row.task.id+'/outcome.json')
    if(already) {
      if(!same(already.registered,registered) || !same(already.task,row.task)) throw new Error('Checkpoint differs from registration for '+row.task.id)
      results.set(row.task.id,already)
    } else queue.push(row)
  }
  let blocker
  async function worker() {
    while(!blocker && queue.length) {
      const {task,before,control}=queue.shift()
      await verifyRegistration()
      const base=given('local/'+task.id)
      const result=await repairLocally(task,{base,attempts:plan.attempts})
      if(result.status==='proposal infrastructure failed twice') {
        blocker=new Error(task.id+' failed twice while running the local repair loop. '+result.reason)
      }
      const row={registered,task,registeredBefore:before,registeredControl:control,...result}
      await saveJSON(path.join(base,'outcome.json'),row)
      results.set(task.id,row)
      console.log(results.size+'/'+plan.tasks.length,task.id,result.status,result.reason??'')
      await delay(900)
    }
  }
  await Promise.all(Array.from({length:2},worker))
  if(blocker) throw blocker
  await verifyRegistration()
  const rows=plan.tasks.map(({task})=>results.get(task.id))
  const summary={registered,runner:'playwright',model,completedAt:instant(),...breakdown(rows,'locally-fixed'),results:rows}
  await saveJSON(path.join(ROOT,localSummary),summary)
  console.log(JSON.stringify({fixed:summary.fixed,total:summary.total,byClass:summary.byClass,byPersona:summary.byPersona},null,2))
}

async function credits() {
  const output=await requireKane()
  const match=output.match(/Available credits:\s*([\d,.]+)/i)
  const amount=match?Number(match[1].replaceAll(',','')):null
  if(!Number.isFinite(amount)) throw new Error('Kane did not return its available credit balance.')
  return amount
}

const selectOrder=value=>sha256(kaneSeed+'\n'+value)
function stratifiedSelection(rows,capacity) {
  const pool=rows.filter(row=>row.status==='locally-fixed' && classes.includes(row.task.barrierClass))
    .sort((a,b)=>selectOrder(a.task.id).localeCompare(selectOrder(b.task.id)))
  const strata=Map.groupBy(pool,row=>row.task.barrierClass)
  const order=[...strata.keys()].sort((a,b)=>selectOrder(a).localeCompare(selectOrder(b)))
  const selected=[]
  while(selected.length<capacity && order.some(kind=>strata.get(kind).length)) {
    for(const kind of order) if(selected.length<capacity && strata.get(kind).length) selected.push(strata.get(kind).shift())
  }
  return selected.map(row=>({id:row.task.id,barrierClass:row.task.barrierClass,persona:row.task.persona,
    patchSha256:sha256(JSON.stringify(row.patch)),proposal:row.proposal}))
}

async function selectKane() {
  if(await optional(kaneSelection)) throw new Error('Kane selection already exists.')
  const [{registered},local,summary,available]=await Promise.all([
    verifyRegistration(),firstBlob(localSummary),optional(localSummary),credits()
  ])
  if(!same(summary.registered,registered) || summary.runner!=='playwright') throw new Error('Local results do not match the registration.')
  const spendable=Math.min(budget,available-reserve)
  if(spendable<phaseReserve*3) throw new Error('Available Kane balance cannot reserve three phases above the required floor.')
  const historical=await optional('proof/heldout-v3/summary.json')
  const measured=historical.results.flatMap(row=>row.phases).filter(phase=>phase.runner==='kane' && Number.isFinite(phase.credits))
    .map(phase=>phase.credits).sort((a,b)=>a-b)
  const estimatedPerTask=Math.ceil(measured[Math.floor(measured.length/2)]*3)
  const capacity=Math.min(25,Math.floor(spendable/estimatedPerTask))
  const targets=stratifiedSelection(summary.results,capacity)
  if(!targets.length) throw new Error('No locally fixed hard journeys qualified for Kane.')
  const missingClasses=classes.filter(kind=>!targets.some(target=>target.barrierClass===kind))
  await saveJSON(path.join(ROOT,kaneSelection),{version:4,seed:kaneSeed,selectedAt:instant(),registered,local,available,
    budget,reserve,phaseReserve,estimatedPerTask,capacity,missingClasses,targets})
  console.log('Selected',targets.length,'hard journeys with',available,'credits available. Missing classes:',missingClasses.join(', ')||'none')
}

class BudgetStop extends Error {}
const phaseState=result=>({status:result.status,runner:result.runner,runId:result.runId,credits:result.credits,
  reason:result.integrity??result.reason,video:result.video,evidencePack:result.evidencePack,basis:result.browserVerdict?.basis})

async function runSelectedKane() {
  if(await optional(kaneSummary)) throw new Error('The Kane cohort already finished.')
  const [{plan,registered},local,summary,selection,selectionSource]=await Promise.all([
    verifyRegistration(),firstBlob(localSummary),optional(localSummary),optional(kaneSelection),firstBlob(kaneSelection)
  ])
  if(!same(selection.registered,registered) || !same(selection.local,local) || selection.seed!==kaneSeed ||
    selection.budget!==budget || selection.reserve!==reserve || selection.phaseReserve!==phaseReserve ||
    !same(selection.targets,stratifiedSelection(summary.results,selection.capacity))) throw new Error('The committed Kane sample fails its integrity check.')
  const previous=await optional(folder+'/kane-journal.json')
  const initial=previous?.initial??await credits()
  const floor=Math.max(reserve,initial-budget,selection.available-budget)
  const journal={initial,floor,selection:selectionSource,startedAt:previous?.startedAt??instant()}
  await saveJSON(given('kane-journal.json'),journal)
  delete process.env.CURBCUT_CHROME
  delete process.env.CURBCUT_KANE_MAX_STEPS
  process.env.CURBCUT_KANE_MIN_CREDITS=String(floor+phaseReserve)
  const results=[]
  const failures=new Map()
  let stopped
  for(const target of selection.targets) {
    const local=summary.results.find(row=>row.task.id===target.id)
    const task=plan.tasks.find(row=>row.task.id===target.id).task
    const base=given('kane/'+task.id)
    const file='outcome.json'
    const previous=await optional(folder+'/kane/'+task.id+'/'+file)
    if(previous?.finishedAt) {results.push(previous);continue}
    const proposal=await readJSON(path.join(ROOT,target.proposal,'provenance.json'))
    const candidate=await readJSON(path.join(ROOT,target.proposal,'candidate.json'))
    if(proposal.writer!=='codex exec' || proposal.model!==model || !same(candidate,local.patch)) throw new Error('Local patch provenance changed for '+task.id)
    const phases=previous?.phases??[]
    const record={task,status:'pending',phases,localProposal:target.proposal}
    const sourceLocalRun=local.phases.find(phase=>phase.name==='before').file
    const provenance={...proposal,priorAgentProposal:target.proposal+'/candidate.json',sourceLocalRun,registrationBlob:registered.blob}
    async function run(current,persona,patch,directory) {
      await verifyRegistration()
      const verifiedSelection=await firstBlob(kaneSelection)
      if(!same(verifiedSelection,selectionSource)) throw new Error('The Kane selection changed.')
      const name=path.relative(base,directory)
      const cached=await optional(path.relative(ROOT,path.join(directory,'result.json')))
      if(cached) {
        if(!phases.some(phase=>phase.name===name)) {
          phases.push({name,after:await credits(),...phaseState(cached)})
          await saveJSON(path.join(base,file),record)
        }
        return cached
      }
      const balance=await credits()
      const needed=name==='before'?phaseReserve*3:name==='control'?phaseReserve*2:phaseReserve
      if(balance<floor+needed) throw new BudgetStop('Balance '+balance+' cannot fund '+name+' above the protected '+floor+' credits.')
      console.log(task.id,name,'balance',balance)
      const maxSteps=persona==='keyboard-only'?24:18
      const result=await runKane(current,persona,patch,directory,{maxSteps,timeout:180,assertionMode:'dom'})
      const after=await credits()
      phases.push({name,balance,after,...phaseState(result)})
      await saveJSON(path.join(base,file),record)
      if(after<floor || initial-after>budget) throw new BudgetStop('Balance fell below the protected threshold after '+name+': '+after+'.')
      return result
    }
    try {
      const result=await fix(task,{base,run,registeredCandidate:candidate,provenance,
        persist:patch=>saveJSON(given('verified/'+patch.id+'.json'),patch)})
      record.status=result.status
      const last=result.after??result.control??result.before
      record.reason=last?.integrity??last?.reason
    } catch(error) {
      record.reason=error.message
      if(error instanceof BudgetStop) {
        record.status='budget stop'
        stopped=error.message
      } else {
        record.status='Kane error'
        const reason=error.message.split('\n')[0]
        const count=(failures.get(reason)??0)+1
        failures.set(reason,count)
        if(count>=2) stopped='Kane failed twice: '+reason
      }
    }
    record.finishedAt=instant()
    await saveJSON(path.join(base,file),record)
    results.push(record)
    if(stopped) break
    await delay(1200)
  }
  const end=await credits()
  const unrun=selection.targets.slice(results.length).map(target=>target.id)
  const final={...journal,runner:'kane',finishedAt:instant(),end,spent:Math.max(0,initial-end),selected:selection.targets.length,
    stopped,unrun,...breakdown(results,'verified'),results}
  await saveJSON(path.join(ROOT,kaneSummary),final)
  console.log(JSON.stringify({fixed:final.fixed,total:final.total,spent:final.spent,end:final.end,unrun:unrun.length,stopped},null,2))
}

const action=process.argv[2]
if(action==='register') await register()
else if(action==='local') await withLock(runLocal)
else if(action==='select-kane') await selectKane()
else if(action==='kane') await withLock(runSelectedKane)
else throw new Error('Usage: node scripts/hard-v4.mjs register | local | select-kane | kane')
