import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {readJSON} from '../../core/io.mjs'
import {repairLocally} from '../../core/loop.mjs'
import {bundledTemplates,digest} from '../../core/recipes.mjs'
import {ProposalRejected,proposalInstructions} from '../../core/agent.mjs'
import {tokens} from '../../core/cost.mjs'

const base=await mkdtemp(path.join(tmpdir(),'curbcut-archive-cost-'))
const schema=await readJSON('schemas/patch.json')
const v5=await readJSON('proof/heldout-v5/local-summary.json')
const v6=await readJSON('proof/heldout-v6/local-summary.json')
const registrations=await readJSON('proof/heldout-v6/registration.json')
const read=async file=>readJSON(file).catch(error=>{if(error.code==='ENOENT') return null;throw error})
const signature=rules=>digest(rules.map(rule=>Object.fromEntries(Object.entries(rule).sort())))
const counts=()=>({tasks:0,recipe:0,inheritance:0,'agent-diff':0,'full-agent':0,other:0,agentTokens:0,baselineAgentTokens:0,baselineFixed:0})
const output={liveAgentCalls:0,kaneCredits:0,v5:counts(),v6:counts()}
const templates={
  v5:await bundledTemplates({include:patch=>patch.id.startsWith('v4-')}),
  v6:await bundledTemplates({include:patch=>/^v[45]-/.test(patch.id)})
}

async function replay(cohort,task,before,control,attempts) {
  const report=output[cohort]
  report.tasks++
  let index=0
  const result=await repairLocally(task,{base:path.join(base,task.id),templates:async()=>templates[cohort],
    replay:async(_,persona,patch)=>{
      if(!patch) return persona==='control'?control:before
      const archived=attempts.find(attempt=>attempt.patch && signature(attempt.patch.rules)===signature(patch.rules))
      return (persona==='control'?archived?.pointer:archived?.after)??{status:'inconclusive',reason:'No archive verdict for these exact rules.'}
    },
    write:async(task,failure,previous)=>{
      if(failure.nearMiss) throw new ProposalRejected('The archive has no template-diff response.')
      const entry=attempts[index++]
      if(!entry) throw new ProposalRejected('The archive has no further agent response.')
      if(entry.reply) report.agentTokens+=tokens(proposalInstructions(task,failure,previous,schema))+tokens(entry.reply)
      if(!entry.patch) throw new ProposalRejected(entry.rejection?.reason??'Archived proposal was rejected.',entry.rejection?.rules)
      return structuredClone(entry.patch)
    }
  })
  report[result.status==='locally-fixed'?result.patch.evidence.repairMethod:'other']++
}

try {
  for(const row of v5.results) {
    const task=row.task
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
      output.v5.baselineAgentTokens+=tokens(proposalInstructions(task,{...current,snapshot:snapshot(),
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
    if(row.status==='locally-fixed') output.v5.baselineFixed++
    await replay('v5',task,before,control,attempts)
  }
  const taskMap=new Map(registrations.tasks.map(entry=>[entry.task.id,entry]))
  for(const row of v6.rows) {
    const registered=taskMap.get(row.id)
    const task=row.patch??registered?.task
    if(!task) continue
    const before=row.before??{status:'inconclusive',reason:'No archived measurement.'}
    const measurement=before.measurement
    const observed={...before,snapshot:{url:task.url,nodes:[{selector:task.observedSelector,role:measurement?.role,name:measurement?.name}],
      repair:{measurement,language:registered?.detail.sample}}}
    const control={status:before.status==='fail'?'pass':'inconclusive',reason:'Archived direct coverage measurement.'}
    if(row.status==='locally-fixed') output.v6.baselineFixed++
    const archivedPatch=row.patch?{...row.patch,status:'candidate',evidence:{}}:null
    const attempts=archivedPatch?[{
      patch:archivedPatch,after:row.after,pointer:row.restored?.status==='fail'?row.after:null
    }]:[]
    await replay('v6',task,observed,control,attempts)
  }
  output.v6.agentTokens=null
  output.v6.baselineAgentTokens=null
  for(const cohort of ['v5','v6']) {
    const row=output[cohort]
    row.fixed=row.recipe+row.inheritance+row['agent-diff']+row['full-agent']
    row.tokensPerFix=row.agentTokens==null?null:Math.round(row.agentTokens/row.fixed)
    row.baselineTokensPerFix=row.baselineAgentTokens==null?null:Math.round(row.baselineAgentTokens/row.baselineFixed)
  }
  console.log(JSON.stringify(output,null,2))
} finally {await rm(base,{recursive:true,force:true})}
