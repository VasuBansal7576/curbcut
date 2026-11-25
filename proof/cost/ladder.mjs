import {createHash} from 'node:crypto'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {command,instant,readJSON,saveJSON} from '../../core/io.mjs'
import {ProposalRejected,propose} from '../../core/agent.mjs'
import {tokens} from '../../core/cost.mjs'
import {replayLane} from '../../core/probe.mjs'
import {normalizeTask} from '../../core/task.mjs'

process.env.CURBCUT_AGENT='grok'
delete process.env.CURBCUT_MODEL
delete process.env.CURBCUT_LADDER
delete process.env.CURBCUT_JEV_FIRST

const seed='curbcut-ladder-measure-2026-11-25'
const cohortFile='proof/cost/ladder-cohort.json'
const destination='proof/cost/ladder-results.json'
const sha256=value=>createHash('sha256').update(value).digest('hex')
const compact=({status,reason})=>({status,reason})
const measured=result=>({status:result.status,reason:result.reason,steps:result.steps,checks:result.checks,geometry:result.geometry})
const read=async file=>readJSON(file).catch(error=>{if(error.code==='ENOENT') return null;throw error})

function usageOf(...texts) {
  const events=[]
  for(const text of texts.filter(Boolean)) {
    try {events.push(JSON.parse(text))} catch {}
    for(const line of text.split('\n')) {
      try {events.push(JSON.parse(line))} catch {}
    }
  }
  for(const event of events.reverse()) {
    const usage=event.usage||(Number.isFinite(event.input_tokens)||Number.isFinite(event.cache_read_input_tokens)?event:null)
    if(usage) return usage
  }
  return null
}

function withPointerContext(before,control) {
  const snapshot=before.snapshot??control?.snapshot
  if(!snapshot || !before.snapshot?.url || before.snapshot.url!==control?.snapshot?.url) return snapshot
  const nodes=new Map(before.snapshot.nodes.map(node=>[node.selector,node]))
  for(const node of control.snapshot.nodes) if(!nodes.has(node.selector)) nodes.set(node.selector,node)
  return {...before.snapshot,nodes:[...nodes.values()],pointerContext:control.snapshot.interactionContext??control.snapshot.context}
}

export async function selectCohort() {
  const registration=await readJSON('proof/heldout-v5/registration.json')
  const eligible=[]
  for(const row of registration.tasks) {
    const task=row.task
    const kind=task.persona==='keyboard-only'?'keyboard':task.persona==='screen-reader-view'?'naming':null
    if(!kind || (!task.probe && !task.journey) || !task.outcomeChecks?.length) continue
    const dir='proof/heldout-v5/local/'+task.id
    const before=await read(dir+'/before.json')
    const control=await read(dir+'/control.json')
    if(before?.status!=='fail' || !before.snapshot || control?.status!=='pass') continue
    eligible.push({
      id:task.id,kind,persona:task.persona,url:task.url,site:row.site??task.site,
      archivedBefore:before.reason,archivedControl:control.reason,
      check:task.journey?'journey':'probe',rank:sha256(seed+'\n'+task.id)
    })
  }
  eligible.sort((left,right)=>left.rank.localeCompare(right.rank)||left.id.localeCompare(right.id))
  const selected=eligible.slice(0,20).map(({rank,...row})=>row)
  if(selected.length!==20) throw new Error('Expected 20 archived keyboard or naming failures, found '+selected.length+'.')
  return {
    seed,selectedAt:instant(),eligible:eligible.length,
    keyboardEligible:eligible.filter(row=>row.kind==='keyboard').length,
    namingEligible:eligible.filter(row=>row.kind==='naming').length,
    tasks:selected
  }
}

async function lane(task,persona,patch) {
  await delay(1250)
  return replayLane(task,persona,patch)
}

function tally(calls) {
  const input=calls.reduce((sum,call)=>sum+(call.inputTokens??0),0)
  const output=calls.reduce((sum,call)=>sum+(call.outputTokens??0),0)
  const cached=calls.reduce((sum,call)=>sum+(call.cachedInputTokens??0),0)
  const estimated=calls.reduce((sum,call)=>sum+(call.tokens??0),0)
  const reported=calls.every(call=>call.tokenMethod==='provider usage')
  return {calls:calls.length,inputTokens:reported?input:null,outputTokens:reported?output:null,
    cachedInputTokens:reported?cached:null,tokens:reported?input+output:estimated,
    tokenMethod:reported?'provider usage':'estimate, ceil UTF-8 bytes / 4 per prompt and response',
    wallMs:calls.reduce((sum,call)=>sum+(call.wallMs??0),0),
    models:calls.map(call=>call.model)}
}

async function runMode(task,failure,directory,mode,options={}) {
  const started=Date.now()
  const row={mode,status:'not fixed',calls:[],attempts:[]}
  const previousAttempts=[]
  let previous=null
  let current={...failure,previousAttempts}
  const run=async(executable,args,runOptions)=>{
    const next=[...args]
    if(next.includes('--output-format')) next[next.indexOf('--output-format')+1]='json'
    const prompt=await readFile(next[next.indexOf('--prompt-file')+1],'utf8')
    const call={model:next[next.indexOf('-m')+1],promptChars:prompt.length,startedAt:instant()}
    row.calls.push(call)
    const t0=Date.now()
    const result=await command(executable,next,runOptions)
    call.wallMs=Date.now()-t0
    call.exitCode=result.code
    call.signal=result.signal
    let reply=result.stdout
    try {
      const parsed=JSON.parse(result.stdout)
      if(parsed && typeof parsed==='object' && typeof parsed.text==='string') reply=parsed.text
    } catch {}
    const usage=usageOf(result.stdout,result.stderr)
    const reported=usage?.total_tokens??(Number.isFinite(usage?.input_tokens) && Number.isFinite(usage?.output_tokens)?usage.input_tokens+usage.output_tokens:null)
    call.inputTokens=Number.isFinite(usage?.input_tokens)?usage.input_tokens:null
    call.outputTokens=Number.isFinite(usage?.output_tokens)?usage.output_tokens:null
    call.cachedInputTokens=Number.isFinite(usage?.cache_read_input_tokens)?usage.cache_read_input_tokens:
      Number.isFinite(usage?.cached_input_tokens)?usage.cached_input_tokens:null
    call.tokens=reported??tokens(prompt)+tokens(reply)
    call.tokenMethod=reported==null?'estimate, ceil UTF-8 bytes / 4 per prompt and response':'provider usage'
    return {code:result.code,signal:result.signal,stdout:reply,stderr:result.stderr}
  }
  for(let index=1;index<=2;index++) {
    const proposal=path.join(directory,mode,'attempt-'+index)
    const opts=mode==='ladder'?index===1?{run}: {run,rung:'large'}:{run,model:'grok-4.6'}
    let patch
    try {
      patch=await propose(task,current,previous,proposal,opts)
    } catch(error) {
      const reason=error instanceof ProposalRejected?error.message:error.message.split('\n')[0]
      row.attempts.push({index,status:'rejected',reason,rung:mode==='ladder'?index===1?'small':'large':'large'})
      previous=error.rules??previous
      current={...current,validationError:error.message,selectorValidation:error.selectorValidation,previousAttempts:[...previousAttempts]}
      previousAttempts.push({rules:error.rules,rejection:error.message,selectorValidation:error.selectorValidation})
      if(!(error instanceof ProposalRejected)) {
        row.error=reason
        break
      }
      continue
    }
    const after=await lane(task,task.persona,patch)
    const pointer=after.status==='blocked'?{status:'blocked',reason:after.reason}:await lane(task,'control',patch)
    const attempt={index,rung:patch.evidence?.ladderRung??(mode==='ladder' && index===1?'small':'large'),
      model:patch.evidence?.ladderModel??(mode==='ladder' && index===1?'grok-4.5':'grok-4.6'),
      rules:patch.rules,after:compact(after),pointer:compact(pointer)}
    row.attempts.push(attempt)
    previous=patch.rules
    previousAttempts.push({rules:patch.rules,persona:measured(after),pointer:measured(pointer)})
    current={...after,snapshot:failure.snapshot,previousAttempts:[...previousAttempts],
      reason:after.status==='pass'?'The pointer replay with the patch '+pointer.status+'. '+pointer.reason:after.reason}
    if(after.status==='pass' && pointer.status==='pass') {
      row.status='fixed'
      row.patch={rules:patch.rules,ladderRung:attempt.rung,ladderModel:attempt.model}
      row.smallModelFix=attempt.rung==='small'
      break
    }
  }
  row.totals=tally(row.calls)
  row.wallMs=Date.now()-started
  return row
}

function summarize(output) {
  const judged=output.rows.filter(row=>row.status!=='drifted' && row.status!=='blocked')
  const mode=name=>{
    const runs=judged.map(row=>row[name]).filter(Boolean)
    const fixed=runs.filter(run=>run.status==='fixed')
    const tokensTotal=runs.reduce((sum,run)=>sum+(run.totals?.tokens??0),0)
    const wallMs=runs.reduce((sum,run)=>sum+(run.wallMs??0),0)
    return {
      judged:runs.length,fixed:fixed.length,
      smallModelFixes:fixed.filter(run=>run.smallModelFix).length,
      tokens:tokensTotal,wallMs,tokensPerFix:fixed.length?Math.round(tokensTotal/fixed.length):null,
      wallMsPerFix:fixed.length?Math.round(wallMs/fixed.length):null
    }
  }
  return {
    selected:output.cohort.tasks.length,
    drifted:output.rows.filter(row=>row.status==='drifted').length,
    blocked:output.rows.filter(row=>row.status==='blocked').length,
    judged:judged.length,
    ladder:mode('ladder'),
    large:mode('large'),
    kaneCredits:0
  }
}

const cohortOnly=process.argv.includes('--cohort-only')
let cohort=await read(cohortFile)
if(!cohort || process.argv.includes('--reselect')) {
  cohort=await selectCohort()
  await saveJSON(cohortFile,cohort)
}
if(cohort.seed!==seed || cohort.tasks.length!==20) throw new Error('Cohort file does not match the locked seed and size.')
if(cohortOnly) {
  console.log(JSON.stringify({seed:cohort.seed,eligible:cohort.eligible,tasks:cohort.tasks.map(task=>({id:task.id,kind:task.kind,url:task.url}))},null,2))
  process.exit(0)
}

const existing=await read(destination)
const output=existing && existing.cohort?.seed===seed?existing:
  {startedAt:instant(),kaneCredits:0,agent:'grok',seed,cohort,rows:[]}
const done=new Set(output.rows.filter(row=>row.ladder && row.large || ['drifted','blocked'].includes(row.status)).map(row=>row.id))
let stop=false
process.once('SIGINT',()=>{stop=true})
process.once('SIGTERM',()=>{stop=true})

const registration=await readJSON('proof/heldout-v5/registration.json')
const base=await mkdtemp(path.join(tmpdir(),'curbcut-ladder-'))
try {
  for(const item of cohort.tasks) {
    if(stop) break
    if(done.has(item.id)) continue
    const data=registration.tasks.find(row=>row.task.id===item.id)?.task
    const row={id:item.id,kind:item.kind,url:item.url,persona:item.persona,status:'running'}
    output.rows=output.rows.filter(entry=>entry.id!==item.id)
    output.rows.push(row)
    await saveJSON(destination,output)
    try {
      const task=await normalizeTask(data)
      const before=await lane(task,task.persona)
      row.before=compact(before)
      const control=before.status==='blocked'?null:await lane(task,'control')
      row.control=control && compact(control)
      if(before.status==='blocked' || control?.status==='blocked') {
        row.status='blocked'
        await saveJSON(destination,output)
        console.log(item.id,'blocked',before.reason||control?.reason)
        continue
      }
      if(before.status!=='fail' || control.status!=='pass') {
        row.status='drifted'
        await saveJSON(destination,output)
        console.log(item.id,'drifted',before.status,control.status)
        continue
      }
      const failure={...before,snapshot:withPointerContext(before,control),runner:'playwright'}
      const dir=path.join(base,item.id)
      row.ladder=await runMode(task,failure,dir,'ladder')
      if(stop) break
      row.large=await runMode(task,failure,dir,'large')
      row.status='judged'
      row.ladderFixed=row.ladder.status==='fixed'
      row.largeFixed=row.large.status==='fixed'
      row.smallModelFix=Boolean(row.ladder.smallModelFix)
    } catch(error) {
      row.status='error'
      row.error=error.message.split('\n')[0]
    }
    output.summary=summarize(output)
    await saveJSON(destination,output)
    console.log(item.id,row.status,row.ladder?.status,row.large?.status,row.ladder?.totals?.tokens,row.large?.totals?.tokens)
  }
  if(!stop) {
    output.completedAt=instant()
    output.summary=summarize(output)
    await saveJSON(destination,output)
    console.log(JSON.stringify(output.summary,null,2))
  }
} finally {await rm(base,{recursive:true,force:true})}
