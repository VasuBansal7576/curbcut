import path from 'node:path'
import {link,readdir,rm} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {ROOT,readJSON,saveJSON,instant} from './io.mjs'
import {normalizeTask} from './task.mjs'
import {fix,withLock} from './loop.mjs'
import {requireKane} from './kane.mjs'
import {match} from './engine.js'
import {threshold} from './jev-policy.js'
import {deriveTask} from './check.mjs'

const queue=path.join(ROOT,'.curbcut/instant-queue')
const actions=new Set(['mirrorHoverToFocus','mirrorHoverEventToFocus','makeFocusable','setRole','bindEnterToClick','restoreFocusOutline',
  'addLabel','setAltText','injectCSS'])

const domActions=new Set(['mirrorHoverToFocus','mirrorHoverEventToFocus','toggleOnActivate','arrowKeyNavigation'])

export async function enqueueInstant({patch,confidence,model}) {
  const dom=model==='dom-parity'
  if(!patch || !/^instant-[a-f0-9-]{36}$/.test(patch.id) || patch.status!=='candidate' ||
    !Number.isFinite(confidence) || confidence<threshold || confidence>1 || typeof model!=='string' || (!dom && !/^jev-[\w.-]{1,60}$/.test(model)) ||
    !match(patch,patch.url) || !patch.rules.every(rule=>(dom?domActions:actions).has(rule.action) && (!dom || rule.action!=='arrowKeyNavigation' || rule.activate==='focus')) ||
    Object.keys(patch.evidence).length || patch.history.length) throw new Error('Invalid instant candidate.')
  const task=await normalizeTask(patch)
  const file=path.join(queue,patch.id+'.json')
  const temporary=path.join(queue,randomUUID()+'.pending')
  await saveJSON(temporary,{status:'queued',queuedAt:instant(),task,patch,confidence,model})
  try {
    await link(temporary,file)
    return {id:patch.id,status:'queued'}
  } catch(error) {
    if(error.code!=='EEXIST') throw error
    const prior=await readJSON(file)
    if(JSON.stringify(prior.patch)!==JSON.stringify(patch)) throw new Error('The queue already has a different candidate for this ID.')
    return {id:patch.id,status:prior.status}
  } finally {await rm(temporary,{force:true})}
}

export async function enqueueDraft(report) {
  if(!report || typeof report!=='object' || typeof report.url!=='string' || typeof report.title!=='string') {
    throw new Error('Invalid barrier report.')
  }
  const page=new URL(report.url)
  if(!['http:','https:'].includes(page.protocol)) throw new Error('Invalid barrier report.')
  const persona=typeof report.persona==='string'?report.persona:'keyboard-only'
  const taskText=typeof report.task==='string'?report.task.trim():''
  const id='draft-'+randomUUID()
  const file=path.join(queue,id+'.json')
  await saveJSON(file,{
    status:'draft',
    queuedAt:instant(),
    task:{id,url:report.url,persona,task:taskText||report.title},
    report
  })
  return {id,status:'draft'}
}

export function verifyQueue({id,repair=fix,authenticate=requireKane,progress}={}) {
  return withLock(async()=>{
    const names=await readdir(queue).catch(error=>{
      if(error.code==='ENOENT') return []
      throw error
    })
    const outcomes=[]
    for(const name of names.sort()) {
      if(!/^(instant|draft)-[a-f0-9-]{36}\.json$/.test(name) || (id && name!==id+'.json')) continue
      const file=path.join(queue,name)
      const entry=await readJSON(file)
      const draft=name.startsWith('draft-')
      if(entry.status!==(draft?'draft':'queued')) continue
      let task=entry.task
      if(draft) {
        try {
          task={...await deriveTask({...task,task:entry.report?.task}),id:task.id}
        } catch(error) {
          await saveJSON(file,{...entry,checkedAt:instant(),error:error.message})
          outcomes.push({id:task.id,status:'draft',reason:error.message})
          continue
        }
      }
      const published=await readJSON(path.join(ROOT,'patches',name)).catch(error=>{
        if(error.code!=='ENOENT') throw error
      })
      const same=draft?['id','url','persona','task'].every(key=>published?.[key]===task[key]):
        JSON.stringify(published?.rules)===JSON.stringify(entry.patch.rules)
      if(published?.status==='verified' && same) {
        await saveJSON(file,{...entry,task,status:'verified',checkedAt:instant(),result:{patch:published}})
        outcomes.push({id:task.id,status:'verified'})
        continue
      }
      await authenticate()
      const directory=path.join(ROOT,'proof/kane',task.id,draft?'barrier-report':'instant-queue')
      const result=await repair(task,{base:directory,progress,...(draft?{agentOnly:true}:{
        registeredCandidate:entry.patch,provenance:{priorAgentProposal:'TypeSafe '+entry.model,
          sourceLocalRun:'.curbcut/instant-queue/'+name,confidence:entry.confidence,localOracle:null}
      })})
      const {error,...saved}=entry
      await saveJSON(file,{...saved,task,status:result.status,checkedAt:instant(),result})
      outcomes.push({id:task.id,status:result.status})
    }
    return outcomes
  })
}
