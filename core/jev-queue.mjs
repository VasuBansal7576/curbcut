import path from 'node:path'
import {link,readdir,rm} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {ROOT,readJSON,saveJSON,instant} from './io.mjs'
import {normalizeTask} from './task.mjs'
import {fix,withLock} from './loop.mjs'
import {requireKane} from './kane.mjs'
import {match} from './engine.js'
import {threshold} from './jev-policy.js'

const queue=path.join(ROOT,'.curbcut/instant-queue')
const actions=new Set(['mirrorHoverToFocus','mirrorHoverEventToFocus','makeFocusable','setRole','bindEnterToClick','restoreFocusOutline',
  'addLabel','setAltText','injectCSS'])

export async function enqueueInstant({patch,confidence,model}) {
  if(!patch || !/^instant-[a-f0-9-]{36}$/.test(patch.id) || patch.status!=='candidate' ||
    !Number.isFinite(confidence) || confidence<threshold || confidence>1 || typeof model!=='string' || !/^jev-[\w.-]{1,60}$/.test(model) ||
    !match(patch,patch.url) || !patch.rules.every(rule=>actions.has(rule.action)) ||
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

export function verifyQueue() {
  return withLock(async()=>{
    const names=await readdir(queue).catch(error=>{
      if(error.code==='ENOENT') return []
      throw error
    })
    const outcomes=[]
    for(const name of names.sort()) {
      if(!/^instant-[a-f0-9-]{36}\.json$/.test(name)) continue
      const file=path.join(queue,name)
      const entry=await readJSON(file)
      if(entry.status!=='queued') continue
      const published=await readJSON(path.join(ROOT,'patches',name)).catch(error=>{
        if(error.code!=='ENOENT') throw error
      })
      if(published?.status==='verified' && JSON.stringify(published.rules)===JSON.stringify(entry.patch.rules)) {
        await saveJSON(file,{...entry,status:'verified',checkedAt:instant(),result:{patch:published}})
        outcomes.push({id:entry.task.id,status:'verified'})
        continue
      }
      await requireKane()
      const directory=path.join(ROOT,'proof/kane',entry.task.id,'instant-queue')
      const provenance={priorAgentProposal:'TypeSafe '+entry.model,sourceLocalRun:'.curbcut/instant-queue/'+name,
        confidence:entry.confidence,localOracle:null}
      const result=await fix(entry.task,{base:directory,registeredCandidate:entry.patch,provenance})
      await saveJSON(file,{...entry,status:result.status,checkedAt:instant(),result})
      outcomes.push({id:entry.task.id,status:result.status})
    }
    return outcomes
  })
}
