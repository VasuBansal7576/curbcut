import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {agentArgs,agentBackend,propose,proposeCoverageNames} from '../core/agent.mjs'
import {readJSON} from '../core/io.mjs'

const task=await readJSON('tasks/keyboard-only.json')
const original=(await readJSON('extension/demo.json'))[0]
const proposal=JSON.stringify({barrier:original.barrier,rules:original.rules})
const names=JSON.stringify([{index:0,name:'Open search',basis:'The crop shows a magnifying glass.'}])

function restoreAgentEnv(previous) {
  for(const key of ['CURBCUT_AGENT','CURBCUT_MODEL','CURBCUT_GROK']) {
    if(previous[key]===undefined) delete process.env[key]
    else process.env[key]=previous[key]
  }
}

test('CURBCUT_AGENT selects codex by default and grok with its model and executable',()=>{
  const previous={CURBCUT_AGENT:process.env.CURBCUT_AGENT,CURBCUT_MODEL:process.env.CURBCUT_MODEL,CURBCUT_GROK:process.env.CURBCUT_GROK}
  try {
    delete process.env.CURBCUT_AGENT
    delete process.env.CURBCUT_MODEL
    assert.deepEqual(agentBackend(),{id:'codex',writer:'codex exec',model:'gpt-6.2-sol',executable:'codex',timeout:150000,namingTimeout:130000})
    process.env.CURBCUT_AGENT='grok'
    const grok=agentBackend()
    assert.equal(grok.id,'grok')
    assert.equal(grok.writer,'grok')
    assert.equal(grok.model,'grok-4.5')
    assert.match(grok.executable,/grok$/)
    process.env.CURBCUT_MODEL='grok-4.6'
    assert.equal(agentBackend().model,'grok-4.6')
    process.env.CURBCUT_AGENT='claude'
    assert.throws(()=>agentBackend(),/codex or grok/)
  } finally {restoreAgentEnv(previous)}
})

test('codex args keep exec, read-only sandbox, and the answer file',()=>{
  const args=agentArgs({id:'codex',model:'gpt-6.2-sol'},{dir:'/tmp/x',answer:'/tmp/x/answer.json',promptFile:'/tmp/x/prompt.txt'})
  assert.deepEqual(args.slice(0,8),['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','-c','features.shell_tool=false'])
  assert.equal(args.at(-1),'-')
  assert.ok(args.includes('-m') && args.includes('gpt-6.2-sol'))
  assert.ok(args.includes('-o') && args.includes('/tmp/x/answer.json'))
})

test('grok args use single-turn prompt file, model, and read-only sandbox',()=>{
  const args=agentArgs({id:'grok',model:'grok-4.5'},{dir:'/tmp/x',answer:'/tmp/x/answer.json',promptFile:'/tmp/x/prompt.txt'})
  assert.equal(args[0],'-p')
  assert.equal(args[1],'--prompt-file')
  assert.equal(args[2],'/tmp/x/prompt.txt')
  assert.ok(args.includes('-m') && args.includes('grok-4.5'))
  assert.ok(args.includes('--sandbox') && args.includes('read-only'))
  assert.ok(args.includes('--output-format') && args.includes('plain'))
})

async function stubbedPropose(backend,reply,{fail=false}={}) {
  const previous={CURBCUT_AGENT:process.env.CURBCUT_AGENT,CURBCUT_MODEL:process.env.CURBCUT_MODEL,CURBCUT_GROK:process.env.CURBCUT_GROK}
  const directory=await mkdtemp(path.join(tmpdir(),'curbcut-agent-'))
  const calls=[]
  process.env.CURBCUT_AGENT=backend
  delete process.env.CURBCUT_MODEL
  try {
    const patch=await propose(task,{runner:'playwright',reason:'Tab skipped the control'},null,directory,{
      retryInvalid:false,
      validateSelectors:async()=>({ok:true,matches:[]}),
      run:async(executable,args,options)=>{
        calls.push({executable,args,options})
        if(backend==='codex') await (await import('node:fs/promises')).writeFile(path.join(options.cwd,'answer.json'),reply)
        return {code:fail?1:0,signal:fail?'SIGKILL':null,stdout:backend==='grok'?reply:'',stderr:fail?'boom':''}
      }
    })
    return {patch,calls,directory,provenance:await readJSON(path.join(directory,'provenance.json')),
      answer:await readFile(path.join(directory,'agent-answer.txt'),'utf8')}
  } finally {
    restoreAgentEnv(previous)
    await rm(directory,{recursive:true,force:true})
  }
}

test('a stubbed codex backend writes the same JSON contract and provenance',async()=>{
  const {patch,calls,provenance}=await stubbedPropose('codex',proposal)
  assert.equal(calls.length,1)
  assert.equal(calls[0].executable,'codex')
  assert.equal(calls[0].args[0],'exec')
  assert.equal(calls[0].options.timeout,150000)
  assert.equal(calls[0].options.processGroup,true)
  assert.match(calls[0].options.input,/Return raw JSON only/)
  assert.equal(patch.barrier,original.barrier)
  assert.deepEqual(patch.rules,original.rules)
  assert.equal(provenance.writer,'codex exec')
  assert.equal(provenance.model,'gpt-6.2-sol')
})

test('a stubbed grok backend reads stdout, keeps the JSON contract, and records grok provenance',async()=>{
  const {patch,calls,provenance,answer}=await stubbedPropose('grok',proposal)
  assert.equal(calls.length,1)
  assert.match(calls[0].executable,/grok$/)
  assert.equal(calls[0].args[0],'-p')
  assert.equal(calls[0].options.timeout,150000)
  assert.equal(calls[0].options.processGroup,true)
  assert.equal(calls[0].options.input,undefined)
  assert.equal(answer,proposal)
  assert.equal(patch.status,'candidate')
  assert.equal(provenance.writer,'grok')
  assert.equal(provenance.model,'grok-4.5')
})

test('a failed grok process is reported without retrying Codex',async()=>{
  await assert.rejects(()=>stubbedPropose('grok',proposal,{fail:true}),/Grok proposal failed: SIGKILL/)
})

test('stubbed coverage naming records the selected backend',async()=>{
  const previous={CURBCUT_AGENT:process.env.CURBCUT_AGENT,CURBCUT_MODEL:process.env.CURBCUT_MODEL}
  const crop=Buffer.from('89504e470d0a1a0a','hex').toString('base64')
  try {
    process.env.CURBCUT_AGENT='codex'
    const codex=await proposeCoverageNames([{crop,detail:{role:'button'}}],{run:async(_exe,_args,options)=>{
      await (await import('node:fs/promises')).writeFile(path.join(options.cwd,'response.json'),names)
      return {code:0,stdout:'',stderr:''}
    }})
    assert.equal(codex.writer,'codex exec')
    assert.equal(codex.entries[0].name,'Open search')
    process.env.CURBCUT_AGENT='grok'
    const grok=await proposeCoverageNames([{crop,detail:{role:'button'}}],{run:async()=>({code:0,stdout:names,stderr:''})})
    assert.equal(grok.writer,'grok')
    assert.equal(grok.model,'grok-4.5')
  } finally {restoreAgentEnv(previous)}
})
