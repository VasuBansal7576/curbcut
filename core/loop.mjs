import {mkdir,readdir,rm,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,instant,readJSON,saveJSON,command,relative} from './io.mjs'
import {normalizeTask} from './task.mjs'
import {runKane,requireKane} from './kane.mjs'
import {preflight} from './preflight.mjs'
import {propose,ProposalRejected,rejectRepeated} from './agent.mjs'
import {oracle,replayLane} from './probe.mjs'
import validate from './validate.generated.cjs'
import {match} from './engine.js'
const folder=path.join(ROOT,'patches')
const patchFile=id=>path.join(folder,id+'.json')
const newDirectory=id=>path.join(ROOT,'proof','kane',id,instant().replaceAll(':','-'))
export async function catalog() {
  const names=(await readdir(folder)).filter(n=>n.endsWith('.json') && n!=='index.json').sort()
  const patches=await Promise.all(names.map(n=>readJSON(path.join(folder,n))))
  for(const patch of patches) if(!validate(patch)) throw new Error('Invalid patch '+patch.id)
  return patches
}
async function publish(patch) {
  if(!validate(patch)) throw new Error('Invalid publication')
  await saveJSON(patchFile(patch.id),patch)
  const build=await command(process.execPath,['scripts/build-site.mjs'])
  if(build.code!==0) throw new Error(build.stderr)
}
function serialPublisher() {
  let publication=Promise.resolve()
  return patch=>{
    const next=publication.then(()=>publish(patch))
    publication=next.catch(()=>{})
    return next
  }
}
export async function withLock(fn) {
  const lock=path.join(ROOT,'.curbcut/loop.lock')
  await mkdir(path.dirname(lock),{recursive:true})
  try{await mkdir(lock)}catch(e){if(e.code==='EEXIST') throw new Error('Another loop owns .curbcut/loop.lock');throw e}
  try{return await fn()}finally{await rm(lock,{recursive:true,force:true})}
}
const measured=result=>({status:result.status,reason:result.reason,steps:result.steps,checks:result.checks,geometry:result.geometry})

export async function repairLocally(data,{base,replay=replayLane,write=propose,attempts=5}={}) {
  if(!Number.isInteger(attempts) || attempts<1 || attempts>5) throw new Error('Use between one and five local patch proposals.')
  const task=await normalizeTask(data)
  const phases=[]
  const result=(status,reason,patch=null,proposal=null)=>({runner:'playwright',status,reason,phases,patch,proposal})
  const run=async(name,persona,patch,iteration)=>{
    const outcome=await replay(task,persona,patch)
    const file=path.join(base,name+'.json')
    await saveJSON(file,outcome)
    phases.push({name,persona,iteration,status:outcome.status,reason:outcome.reason,file:relative(file)})
    return outcome
  }
  const control=await run('control','control',null)
  if(control.status!=='pass') return result('control-'+control.status,control.reason)
  const before=await run('before',task.persona,null)
  if(before.status!=='fail') return result(before.status==='pass'?'already-accessible':before.status,before.reason)
  function withPointerContext(snapshot) {
    if(!snapshot) return control.snapshot
    if(control.snapshot?.url!==snapshot.url) return snapshot
    const bySelector=new Map(snapshot.nodes.map(node=>[node.selector,node]))
    for(const node of control.snapshot.nodes) if(!bySelector.has(node.selector)) bySelector.set(node.selector,node)
    return {...snapshot,nodes:[...bySelector.values()],pointerContext:control.snapshot.interactionContext??control.snapshot.context}
  }
  let failure={...before,snapshot:withPointerContext(before.snapshot)},previous=null
  const previousAttempts=[]
  const infrastructure=new Map()
  for(let index=1;index<=attempts;index++) {
    const proposal=path.join(base,'attempt-'+index)
    let patch
    try {
      patch=await write(task,{...failure,previousAttempts:[...previousAttempts]},previous,proposal,{retryInvalid:false})
      if(!validate(patch) || patch.status!=='candidate' || !match(patch,task.url) || patch.id!==task.id) {
        throw new ProposalRejected('Invalid candidate for the registered task.',patch?.rules)
      }
      rejectRepeated(patch.rules,previousAttempts)
    } catch(error) {
      previous=error.rules??previous
      failure={...failure,validationError:error.message,selectorValidation:error.selectorValidation}
      previousAttempts.push({rules:error.rules,rejection:error.message,selectorValidation:error.selectorValidation})
      const file=path.join(proposal,'rejection.json')
      await saveJSON(file,{reason:error.message,rules:error.rules,selectorValidation:error.selectorValidation})
      phases.push({name:'proposal',iteration:index,status:'rejected',reason:error.message,file:relative(file)})
      if(!(error instanceof ProposalRejected)) {
        const reason=error.message.match(/(?:model_not_found|model .*? (?:is not supported|is unavailable)|quota exceeded|insufficient quota|rate limit|not authenticated|401|429|SIGKILL)/i)?.[0] ??
          error.message.split('\n').find(line=>/error|limit|quota|model/i.test(line))??error.message
        const count=(infrastructure.get(reason)??0)+1
        infrastructure.set(reason,count)
        if(count>=2) return result('proposal infrastructure failed twice',error.message)
      }
      continue
    }
    const after=await run('attempt-'+index+'/after',task.persona,patch,index)
    previous=patch.rules
    const attempt={rules:patch.rules,persona:measured(after)}
    previousAttempts.push(attempt)
    failure={...after,snapshot:withPointerContext(after.snapshot)??failure.snapshot}
    if(after.status!=='pass') continue
    const pointer=await run('attempt-'+index+'/control-with-patch','control',patch,index)
    attempt.pointer=measured(pointer)
    if(pointer.status==='pass') return result('locally-fixed',after.reason,patch,relative(proposal))
    failure={...failure,reason:'The pointer replay with the patch '+pointer.status+'. '+pointer.reason}
  }
  return result('unresolved',failure.validationError??failure.reason)
}

async function verifyRegisteredCandidate(task,patch,{dir,run,persist,progress,provenance}) {
  if(!validate(patch) || patch.status!=='candidate' || !match(patch,task.url) ||
    !['id','url','task','persona'].every(key=>task[key]===patch[key]) || !provenance?.priorAgentProposal || !provenance.sourceLocalRun) {
    throw new Error('The repair did not match its registered task and proposal.')
  }
  await progress('reproducing')
  const before=await run(task,task.persona,null,path.join(dir,'before'))
  if(before.status==='blocked') return {status:'blocked',before}
  await progress('checking-control',before)
  const control=await run(task,'control',null,path.join(dir,'control'))
  if(control.status==='blocked') return {status:'blocked',before,control}
  const iteration=path.join(dir,'attempt-1')
  await saveJSON(path.join(iteration,'candidate.json'),patch)
  await saveJSON(path.join(iteration,'provenance.json'),provenance)
  await progress('verifying',control)
  let after=await run(task,task.persona,patch,path.join(iteration,'after'))
  if(after.status==='inconclusive') after=await run(task,task.persona,patch,path.join(iteration,'after-retry'))
  const lanes=[before,control,after]
  if(!lanes.every(result=>result.runner==='kane' && result.runId && result.video && result.evidenceValid) ||
    !lanes.every((result,index)=>result.status===['fail','pass','pass'][index])) {
    return {status:before.status==='pass'?'already-accessible':after.status==='fail'?'unresolved':'inconclusive',before,control,after}
  }
  const at=instant()
  const verified={...patch,status:'verified',evidence:{before:before.video,control:control.video,after:after.video,
    verifiedAt:at,kaneRunIds:lanes.map(result=>result.runId),kaneVerdicts:{before:'fail',control:'pass',after:'pass'},
    localOracle:{before:'fail',control:'pass',after:'pass'}},
    history:[{at,event:'verified',before:before.runId,control:control.runId,after:after.runId}]}
  await progress('publishing',after)
  await persist(verified)
  return {status:'verified',patch:verified,before,control,after}
}

export async function fix(data,{run=runKane,write=propose,persist=publish,check=oracle,base=undefined,prior=null,progress=async()=>{},attempts=3,registeredCandidate=null,provenance=null}={}) {
  if(!Number.isInteger(attempts) || attempts<1 || attempts>3) throw new Error('Use between one and three patch proposals.')
  const task=await normalizeTask(data)
  const dir=base??newDirectory(task.id)
  async function checkAccess() {
    if(run!==runKane) return null
    const access=await preflight(task)
    await saveJSON(path.join(dir,'preflight.json'),access)
    return access.status==='pass'?null:{status:'blocked',preflight:access}
  }
  if(registeredCandidate) {
    const blocked=await checkAccess()
    return blocked??verifyRegisteredCandidate(task,registeredCandidate,{dir,run,persist,progress,provenance})
  }
  if(!prior && !base) {
    const existing=(await catalog()).find(p=>p.id===task.id)
    if(existing && (existing.site!==new URL(task.url).hostname || existing.task!==task.task || existing.persona!==task.persona)) throw new Error('Task id already belongs to another task')
    prior=existing
  }
  const local=task.probe && check?await check(task,null):null
  if(local) {
    await mkdir(dir,{recursive:true})
    await saveJSON(path.join(dir,'local-baseline.json'),local)
    if(local.status!=='confirmed') return {status:{'no barrier':'already-accessible',blocked:'blocked'}[local.status]??'inconclusive',local}
  }
  const blocked=await checkAccess()
  if(blocked) return blocked
  await progress('reproducing')
  const before=await run(task,task.persona,null,path.join(dir,'before'))
  if(before.status==='pass') return {status:'already-accessible',before,local}
  if(before.status==='blocked') return {status:'blocked',before,local}
  if(before.status!=='fail' && !local) return {status:'inconclusive',before}
  let control=null
  if(!local) {
    await progress('checking-control',before)
    control=await run(task,'control',null,path.join(dir,'control'))
    if(control.status!=='pass') return {status:'inconclusive',before,control}
  }
  let last={...before,snapshot:before.snapshot??local?.persona?.snapshot,localBaseline:local?.persona},previous=null,validationError,unverified=null
  const previousAttempts=[]
  for(let i=1;i<=attempts;i++) {
    const iteration=path.join(dir,'attempt-'+i)
    await progress('writing-patch',last)
    let patch
    try {
      patch=await write(task,{...last,validationError,previousAttempts:[...previousAttempts]},previous,iteration,{retryInvalid:false})
      if(!validate(patch)) throw new ProposalRejected('Invalid patch proposal: '+JSON.stringify(validate.errors),patch?.rules)
      rejectRepeated(patch.rules,previousAttempts)
    } catch(error) {
      if(!(error instanceof ProposalRejected)) throw error
      validationError=error.message
      previous=error.rules??previous
      previousAttempts.push({rules:error.rules,rejection:error.message,selectorValidation:error.selectorValidation})
      await mkdir(iteration,{recursive:true})
      await writeFile(path.join(iteration,'rejection.txt'),validationError)
      continue
    }
    validationError=undefined
    if(local) {
      const replay=await check(task,patch)
      await saveJSON(path.join(iteration,'local-replay.json'),replay)
      if(replay.status!=='pass') {
        previous=patch.rules
        previousAttempts.push({rules:patch.rules,persona:measured(replay)})
        last={...last,runner:'playwright',reason:'A local replay of this patch under the persona still failed: '+replay.reason,localReplay:replay,snapshot:replay.snapshot??last.snapshot}
        continue
      }
      if(!control) {
        await progress('checking-control',before)
        control=await run(task,'control',null,path.join(dir,'control'))
      }
    }
    await progress('verifying')
    let after=await run(task,task.persona,patch,path.join(iteration,'after'))
    if(local && !['pass','fail'].includes(after.status)) after=await run(task,task.persona,patch,path.join(iteration,'after-retry'))
    if(after.status==='pass') {
      const at=instant()
      Object.assign(patch,{status:'verified',evidence:{before:before.video,after:after.video,control:control.video,verifiedAt:at,kaneRunIds:[before.runId,control.runId,after.runId],
        ...(local?{kaneVerdicts:{before:before.status,control:control.status,after:after.status},localOracle:{before:'fail',control:'pass',after:'pass'}}:{})},
        history:[...(prior?.history??[]),{at,event:prior?.status==='broken'?'re-patched':'verified',before:before.runId,control:control.runId,after:after.runId}]})
      await progress('publishing',after)
      await persist(patch)
      return {status:'verified',patch}
    }
    if(after.status!=='fail') {
      if(!local) return {status:'inconclusive',after}
      unverified={patch,after}
      break
    }
    previous=patch.rules
    previousAttempts.push({rules:patch.rules,persona:measured(after)})
    last=after
  }
  if(unverified) return {status:'locally-fixed',patch:unverified.patch,after:unverified.after,local}
  return {status:'unresolved',failure:last,reason:validationError}
}
export async function checkPatch(patch,{run=runKane,persist=publish,repair=fix,base=undefined,objective}={}) {
  const task=await normalizeTask({...patch,url:patch.url??patch.match.replace(/\*$/,''),...objective})
  const dir=base??newDirectory(task.id)
  const before=await run(task,task.persona,null,path.join(dir,'recheck-without'))
  const record={at:instant(),event:'rechecked',without:before.status,runId:before.runId,video:before.video}
  if(before.status==='pass') {record.event='retired';patch.status='retired'}
  if(before.status==='fail') {
    const after=await run(task,task.persona,patch,path.join(dir,'recheck-with'))
    Object.assign(record,{with:after.status,after:after.runId,afterVideo:after.video})
    if(after.status==='fail') {record.event='broken';patch.status='broken'}
    if(objective && after.status==='pass' && before.inspection?.harness?.keys?.tab>=objective.minimumTabPresses && patch.evidence?.before) {
      const original=await readJSON(path.join(ROOT,path.dirname(patch.evidence.before),'result.json'))
      if(original.inspection?.harness?.keys?.tab===0) {
        record.replacedBaseline=patch.evidence.kaneRunIds[0]
        patch.evidence.before=before.video
        patch.evidence.kaneRunIds[0]=before.runId
      }
    }
  }
  patch.history.push(record)
  await persist(patch)
  if(patch.status==='broken') return {...await repair(task,{prior:patch,persist}),record}
  return {status:patch.status,record}
}
export async function recheck(id) {
  const patches=await catalog()
  const publicOnly=id==='--public'
  if(id && !publicOnly && !patches.some(p=>p.id===id)) throw new Error('Unknown patch '+id)
  const active=patches.filter(p=>(publicOnly?new URL(p.url??p.match).protocol==='https:':!id || p.id===id) && ['verified','broken'].includes(p.status))
  if(active.length) await requireKane()
  const objectives=await readJSON(path.join(ROOT,'tasks/recheck-keyboard.json'))
  const persist=serialPublisher()
  async function replay(patch) {
    try {
      const declared=await readJSON(path.join(ROOT,'tasks/public/kane',patch.id+'.json')).catch(error=>{
        if(error.code!=='ENOENT') throw error
        return null
      })
      const controlTask=patch.controlTask??(declared && declared.url===patch.url && declared.persona===patch.persona?declared.controlTask:undefined)
      const objective={...(controlTask?{controlTask}:{}),...objectives[patch.id]}
      const result=patch.status==='broken'?await fix({...patch,...objective},{prior:patch,persist}):await checkPatch(patch,{objective,persist})
      const outcome=result.record?.event==='retired'?'retired':result.patch?'re-patched':
        result.record?.without==='fail' && result.record?.with==='pass'?'still-verified':patch.status==='broken'?'broken':'inconclusive'
      console.error(`[recheck] ${patch.id} · ${outcome}`)
      return {id:patch.id,outcome,...result}
    } catch(error) {
      console.error(`[recheck] ${patch.id} · error · ${error.message}`)
      return {id:patch.id,outcome:'error',error:error.message}
    }
  }
  const hosts=Map.groupBy(active,patch=>new URL(patch.url??patch.match).hostname)
  const pending=[...hosts.values()]
  const outcomes=new Map()
  await Promise.all(Array.from({length:Math.min(3,pending.length)},async()=>{
    while(pending.length) for(const patch of pending.shift()) outcomes.set(patch.id,await replay(patch))
  }))
  return active.map(patch=>outcomes.get(patch.id))
}
