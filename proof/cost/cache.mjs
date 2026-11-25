import {mkdtemp,rm,writeFile} from 'node:fs/promises'
import {homedir,tmpdir} from 'node:os'
import path from 'node:path'
import {command,instant,readJSON,saveJSON} from '../../core/io.mjs'
import {proposalInstructions,proposalPrefix} from '../../core/agent.mjs'
import {archivedV5} from './archive-v5.mjs'

process.env.CURBCUT_AGENT='grok'
delete process.env.CURBCUT_MODEL
delete process.env.CURBCUT_LADDER

const destination='proof/cost/cache-results.json'
const cohort=await readJSON('proof/cost/ladder-cohort.json')
const schema=await readJSON('schemas/patch.json')
const grok=process.env.CURBCUT_GROK || path.join(homedir(),'.grok/bin/grok')
const model='grok-4.5'
const prefix=proposalPrefix(schema)
const tasks=cohort.tasks.slice(0,2)
if(tasks.length!==2) throw new Error('Cache study needs two cohort tasks.')

function usageOf(...texts) {
  const events=[]
  for(const text of texts.filter(Boolean)) {
    try {events.push(JSON.parse(text))} catch {}
    for(const line of text.split('\n')) {
      try {events.push(JSON.parse(line))} catch {}
    }
  }
  for(const event of events.reverse()) {
    const usage=event.usage||event.result?.usage||
      (Number.isFinite(event.input_tokens)||Number.isFinite(event.cache_read_input_tokens)?event:null)
    if(usage && (Number.isFinite(usage.input_tokens)||Number.isFinite(usage.cache_read_input_tokens)||usage.usage)) {
      return usage.usage||usage
    }
  }
  return null
}

function pick(usage) {
  if(!usage) return {usage:null}
  return {
    input_tokens:usage.input_tokens??null,
    cache_read_input_tokens:usage.cache_read_input_tokens??usage.cached_input_tokens??null,
    cache_creation_input_tokens:usage.cache_creation_input_tokens??usage.cache_creation_tokens??null,
    output_tokens:usage.output_tokens??null,
    total_tokens:usage.total_tokens??null,
    usage
  }
}

async function invoke(prompt,label,index) {
  const dir=await mkdtemp(path.join(tmpdir(),'curbcut-cache-'))
  const promptFile=path.join(dir,'prompt.txt')
  await writeFile(promptFile,prompt)
  const args=['--prompt-file',promptFile,'-m',model,'--cwd',dir,'--sandbox','read-only','--verbatim',
    '--disable-web-search','--no-subagents','--no-memory','--tools','','--permission-mode','dontAsk',
    '--output-format','json']
  const started=Date.now()
  const result=await command(grok,args,{timeout:180000})
  const row={label,index,task:label==='trivial'?null:label.endsWith('-a')?tasks[0].id:tasks[1].id,
    promptChars:prompt.length,exitCode:result.code,wallMs:Date.now()-started,...pick(usageOf(result.stdout,result.stderr))}
  await rm(dir,{recursive:true,force:true})
  if(result.code!==0) row.error=(result.stderr||result.stdout).slice(-400)
  return row
}

const registration=await readJSON('proof/heldout-v5/registration.json')
const prompts=[]
for(const item of tasks) {
  const task=registration.tasks.find(row=>row.task.id===item.id).task
  const {before,control}=await archivedV5(task,schema)
  const snapshot=(()=>{
    if(!before.snapshot || !control.snapshot || before.snapshot.url!==control.snapshot.url) return before.snapshot??control.snapshot
    const nodes=new Map(before.snapshot.nodes.map(node=>[node.selector,node]))
    for(const node of control.snapshot.nodes) if(!nodes.has(node.selector)) nodes.set(node.selector,node)
    return {...before.snapshot,nodes:[...nodes.values()],pointerContext:control.snapshot.interactionContext??control.snapshot.context}
  })()
  const current=proposalInstructions(task,{...before,snapshot,runner:'playwright'},null,schema)
  const payload=current.slice(prefix.length+1)
  const taskFirst=payload+'\n'+prefix
  if(!current.startsWith(prefix)) throw new Error('Current prompt is missing the fixed prefix.')
  prompts.push({id:task.id,current,taskFirst,payloadChars:payload.length})
}

const output={
  startedAt:instant(),model,kaneCredits:0,prefixChars:prefix.length,
  prefixNote:'Fixed instructions plus compact DSL example. Earlier write-up treated 7,808 cached tokens as this prefix.',
  tasks:prompts.map(row=>({id:row.id,currentChars:row.current.length,taskFirstChars:row.taskFirst.length,payloadChars:row.payloadChars})),
  calls:[]
}
await saveJSON(destination,output)

const trivial='Reply with exactly {"ok":true} and no other text.'
const plan=[
  ['current-a',prompts[0].current],['current-b',prompts[1].current],
  ['current-a',prompts[0].current],['current-b',prompts[1].current],
  ['task-first-a',prompts[0].taskFirst],['task-first-b',prompts[1].taskFirst],
  ['task-first-a',prompts[0].taskFirst],['task-first-b',prompts[1].taskFirst],
  ['trivial',trivial],['trivial',trivial]
]
for(const [index,[label,prompt]] of plan.entries()) {
  const row=await invoke(prompt,label,index+1)
  output.calls.push(row)
  await saveJSON(destination,output)
  console.log(label,row.cache_read_input_tokens,row.input_tokens,row.exitCode)
}

const cached=label=>output.calls.filter(call=>call.label===label).map(call=>call.cache_read_input_tokens)
const currentCached=[...cached('current-a'),...cached('current-b')]
const taskFirstCached=[...cached('task-first-a'),...cached('task-first-b')]
const trivialCached=cached('trivial')
const same=(left,right)=>left.length && right.length && left.every((value,index)=>value===right[index])
output.completedAt=instant()
output.summary={
  prefixChars:prefix.length,
  estimatedPrefixTokens:Math.ceil(prefix.length/4),
  currentCached,taskFirstCached,trivialCached,
  orderingChangedCachedCount:JSON.stringify(currentCached)!==JSON.stringify(taskFirstCached),
  currentEqualsTaskFirst:same(currentCached,taskFirstCached),
  trivialShowsProviderPrefix:trivialCached.some(value=>Number.isFinite(value) && value>0)
}
await saveJSON(destination,output)
console.log(JSON.stringify(output.summary,null,2))
