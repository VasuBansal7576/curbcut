import path from 'node:path'
import {ROOT,readJSON,saveJSON} from './io.mjs'
import {kaneLimits,runKane} from './kane.mjs'
import {recordCost} from './cost.mjs'
import {digest} from './recipes.mjs'

export async function pageControl(run,task,directory,{localControl=false}={}) {
  if(run!==runKane || !localControl) return run(task,'control',null,directory)
  const day=new Date().toISOString().slice(0,10)
  const file=path.join(ROOT,'.curbcut','controls',day,digest(new URL(task.url).href)+'.json')
  const cached=await readJSON(file).catch(error=>{if(error.code==='ENOENT') return null;throw error})
  if(cached?.status==='pass' && cached.evidenceValid && cached.video && cached.runId) {
    recordCost('shared-page-control',{kaneRunsAvoided:1,estimatedMaxStepsAvoided:kaneLimits(task,'control').maxSteps})
    const result={...cached,reused:true}
    await saveJSON(path.join(directory,'shared-control.json'),result)
    return result
  }
  const result=await run(task,'control',null,directory)
  if(result.status==='pass' && result.evidenceValid) await saveJSON(file,{...result,sourceTask:task.id})
  return result
}
