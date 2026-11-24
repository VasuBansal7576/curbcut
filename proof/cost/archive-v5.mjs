import {readFile,readdir} from 'node:fs/promises'
import {readJSON} from '../../core/io.mjs'
import {proposalInstructions} from '../../core/agent.mjs'
import {tokens} from '../../core/cost.mjs'

const read=async file=>readJSON(file).catch(error=>{if(error.code==='ENOENT') return null;throw error})

export async function archivedV5(task,schema) {
  let baselineTokens=0
  const dir='proof/heldout-v5/local/'+task.id
  const before=await read(dir+'/before.json')??{status:'inconclusive',reason:'No archived persona run.'}
  const control=await read(dir+'/control.json')??{status:'inconclusive',reason:'No archived pointer run.'}
  const folders=(await readdir(dir).catch(()=>[])).filter(name=>/^attempt-\d+$/.test(name)).sort()
  const attempts=[]
  const previousAttempts=[]
  let previous=null,current=before
  const pointer=control.snapshot
  function snapshot() {
    const value=current.snapshot
    if(!value || !pointer || pointer.url!==value.url) return value??pointer
    const nodes=new Map(value.nodes.map(node=>[node.selector,node]))
    for(const node of pointer.nodes) if(!nodes.has(node.selector)) nodes.set(node.selector,node)
    return {...value,nodes:[...nodes.values()],pointerContext:pointer.interactionContext??pointer.context}
  }
  let rejection
  for(const folder of folders) {
    const work=dir+'/'+folder
    const [patch,after,pointer,rejected,reply]=await Promise.all([
      read(work+'/candidate.json'),read(work+'/after.json'),read(work+'/control-with-patch.json'),read(work+'/rejection.json'),
      readFile(work+'/agent-answer.txt','utf8').catch(()=>null)
    ])
    attempts.push({patch,after,pointer,rejection:rejected,reply})
    if(!reply) continue
    baselineTokens+=tokens(proposalInstructions(task,{...current,snapshot:snapshot(),
      previousAttempts,validationError:rejection?.reason,selectorValidation:rejection?.selectorValidation},previous,schema,{compact:false}))+tokens(reply)
    previous=patch?.rules??rejected?.rules??previous
    rejection=rejected
    if(rejected) previousAttempts.push({rules:rejected.rules,rejection:rejected.reason,selectorValidation:rejected.selectorValidation})
    else if(after) {
      const measured=({status,reason,steps,checks,geometry})=>({status,reason,steps,checks,geometry})
      previousAttempts.push({rules:patch.rules,persona:measured(after),...(pointer?{pointer:measured(pointer)}:{})})
      current={...after,snapshot:after.snapshot??current.snapshot}
    }
  }
  return {before,control,attempts,baselineTokens}
}
