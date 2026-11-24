import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {command,readJSON,saveJSON} from '../../core/io.mjs'
import {agentBackend,ProposalRejected,propose} from '../../core/agent.mjs'
import {tokens} from '../../core/cost.mjs'
import {replayLane} from '../../core/probe.mjs'
import {normalizeTask} from '../../core/task.mjs'
import {digest} from '../../core/recipes.mjs'

const backend=agentBackend()
if(backend.id!=='grok' || backend.model!=='grok-4.6') throw new Error('Use CURBCUT_AGENT=grok and CURBCUT_MODEL=grok-4.6.')
const source=(await readJSON('proof/cost/diff-results.json')).rows
const bundle=new Map((await readJSON('extension/bundled.json')).map(patch=>[patch.id,patch]))
if(source.length!==11) throw new Error('Expected 11 inherited near misses.')
const base=await mkdtemp(path.join(tmpdir(),'curbcut-diff-v2-'))
const file='proof/cost/diff-v2-results.json'
const output={model:backend.model,startedAt:new Date().toISOString(),kaneCredits:0,agentCalls:0,rows:[]}
const status=({status,reason})=>({status,reason})
async function lane(task,persona,patch) {
  await delay(1250)
  return replayLane(task,persona,patch)
}
let failures=0
try {
  for(const inherited of source) {
    const row={id:inherited.id,templateId:inherited.templateId,inheritedRules:inherited.rules,reason:inherited.reason,
      status:'not fixed',calls:[],invalidResponses:0}
    output.rows.push(row)
    const dir=path.join(base,row.id)
    try {
      const task=await normalizeTask(bundle.get(row.id))
      const before=await lane(task,task.persona)
      row.before=status(before)
      const control=await lane(task,'control')
      row.control=status(control)
      const snapshot=before.snapshot?.repair?before.snapshot:control.snapshot
      row.target={selector:task.observedSelector,visibleText:snapshot?.repair?.visibleText??null,
        labelCandidates:snapshot?.repair?.labels??[]}
      if(failures>=2) throw new Error('Provider stopped after two process failures.')
      const run=async(executable,args,options)=>{
        if(output.agentCalls>=22 || row.calls.length>=2) throw new Error('Bounded retry limit reached.')
        const prompt=await readFile(args[args.indexOf('--prompt-file')+1],'utf8')
        const request=JSON.parse(prompt.slice(prompt.lastIndexOf('\n')+1))
        const call={promptDigest:digest(prompt),validatorMessage:request.validatorMessage}
        row.calls.push(call)
        output.agentCalls++
        let result
        try {result=await command(executable,args,options)} catch(error) {failures++;throw error}
        if(result.code!==0) failures++
        call.exitCode=result.code
        call.reply=result.stdout
        const usage=[result.stdout,result.stderr].join('\n').split('\n').flatMap(line=>{
          try {const event=JSON.parse(line);return event.usage?[event.usage]:[]} catch {return []}
        }).at(-1)
        const reported=usage?.total_tokens??(Number.isFinite(usage?.input_tokens) && Number.isFinite(usage?.output_tokens)?usage.input_tokens+usage.output_tokens:null)
        call.tokens=reported??tokens(prompt)+tokens(call.reply)
        call.tokenMethod=reported==null?'estimate, ceil UTF-8 bytes / 4 per prompt and response':'provider usage'
        return result
      }
      const patch=await propose(task,{runner:'playwright',reason:row.reason,snapshot,
        nearMiss:{patch:{rules:row.inheritedRules},reason:row.reason}},row.inheritedRules,dir,{retryInvalid:true,run})
      row.correctedRules=patch.rules
      row.after=status(await lane(task,task.persona,patch))
      row.patchedControl=status(await lane(task,'control',patch))
      if([row.before,row.control,row.after,row.patchedControl].map(lane=>lane.status).join(',')==='fail,pass,pass,pass') row.status='fixed'
    } catch(error) {
      if(error.constructor.name==='ProposalSchemaError') row.invalidResponses++
      row.error=error instanceof ProposalRejected?error.message.split(':')[0]:
        error.message.match(/(?:not authenticated|not logged in|quota exceeded|rate limit|model not found|401|403|429)/i)?.[0]??
        'Provider or replay infrastructure failed.'
    }
    row.invalidResponses+=row.calls.filter(call=>call.validatorMessage).length
    row.tokens=row.calls.reduce((sum,call)=>sum+(call.tokens??0),0)
    await saveJSON(file,output)
    console.log(row.id,row.status,row.tokens,row.invalidResponses)
  }
  output.completedAt=new Date().toISOString()
  await saveJSON(file,output)
} finally {await rm(base,{recursive:true,force:true})}
