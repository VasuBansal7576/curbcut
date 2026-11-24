import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {command,readJSON,saveJSON} from '../../core/io.mjs'
import {agentBackend,ProposalRejected,propose} from '../../core/agent.mjs'
import {tokens} from '../../core/cost.mjs'
import {replayLane} from '../../core/probe.mjs'
import {normalizeTask} from '../../core/task.mjs'

const backend=agentBackend()
if(backend.id!=='grok') throw new Error('Run with CURBCUT_AGENT=grok.')
const rows=(await readJSON('proof/cost/live-results.json')).inheritance.filter(row=>row.status==='near miss')
if(rows.length!==11) throw new Error('Expected exactly 11 recorded near misses.')
const patches=new Map((await readJSON('extension/bundled.json')).map(patch=>[patch.id,patch]))
const base=await mkdtemp(path.join(tmpdir(),'curbcut-diff-study-'))
const output={startedAt:new Date().toISOString(),model:backend.model,agentCalls:0,kaneCredits:0,rows:[]}
const startup=process.argv.includes('--after-cli-fix')?await readJSON('proof/cost/diff-results.json'):null
if(startup) {
  if(startup.agentCalls!==2 || startup.rows.filter(row=>row.agentExit?.code===2).length!==2) throw new Error('Expected two prior CLI argument errors.')
  output.cliArgumentFailures=startup.rows.filter(row=>row.agentExit?.code===2).map(row=>({id:row.id,exitCode:2}))
}
let failures=0
const file='proof/cost/diff-results.json'
const lane=async(task,persona,patch)=>{
  await delay(1250)
  const {status,reason}=await replayLane(task,persona,patch)
  return {status,reason}
}
try {
  for(const item of rows) {
    const task=await normalizeTask(patches.get(item.id))
    const miss=item.verdicts[0]
    const row={id:item.id,source:miss.source,templateId:miss.templateId,rules:miss.rules,reason:miss.after.reason,status:'not fixed'}
    output.rows.push(row)
    if(failures>=2) {
      row.status='unrun'
      row.error='Stopped after two provider process failures.'
      await saveJSON(file,output)
      continue
    }
    try {
      const run=async(executable,args,options)=>{
        if(output.agentCalls>=11) throw new Error('Diff call budget exhausted.')
        row.prompt=await readFile(args[args.indexOf('--prompt-file')+1],'utf8')
        output.agentCalls++
        let result
        try {result=await command(executable,args,options)} catch(error) {failures++;throw error}
        if(result.code!==0) failures++
        row.agentExit={code:result.code,signal:result.signal}
        row.reply=result.stdout
        const usage=[result.stdout,result.stderr].join('\n').split('\n').flatMap(line=>{
          try {const event=JSON.parse(line);return event.usage?[event.usage]:[]} catch {return []}
        }).at(-1)
        const counted=usage?.total_tokens??(Number.isFinite(usage?.input_tokens) && Number.isFinite(usage?.output_tokens)?usage.input_tokens+usage.output_tokens:null)
        row.agentTokens=counted??tokens(row.prompt)+tokens(row.reply)
        row.tokenMethod=counted==null?'estimate, ceil UTF-8 bytes / 4 per prompt and response':'provider usage'
        return result
      }
      const patch=await propose(task,{runner:'playwright',reason:row.reason,nearMiss:{patch:{rules:row.rules},reason:row.reason}},
        row.rules,path.join(base,task.id),{retryInvalid:false,run})
      row.diffRules=patch.rules
      row.before=await lane(task,task.persona)
      row.control=await lane(task,'control')
      row.after=await lane(task,task.persona,patch)
      row.patchedControl=await lane(task,'control',patch)
      if([row.before,row.control,row.after,row.patchedControl].map(lane=>lane.status).join(',')==='fail,pass,pass,pass') row.status='fixed'
    } catch(error) {
      row.error=error instanceof ProposalRejected?error.message.split(':')[0]:
        error.message.match(/(?:not authenticated|not logged in|quota exceeded|insufficient quota|rate limit|model not found|401|403|429)/i)?.[0]??
        'Provider or replay infrastructure failed.'
    }
    await saveJSON(file,output)
    console.log(item.id,row.status,row.agentTokens??'unmetered',row.agentExit?.code??'unknown')
  }
  output.completedAt=new Date().toISOString()
  await saveJSON(file,output)
} finally {await rm(base,{recursive:true,force:true})}
