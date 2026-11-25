import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {agentArgs,agentBackend,ladderEnabled,ladderRungs,proposalInstructions,proposalPrefix,propose,proposeCoverageNames} from '../core/agent.mjs'
import {readJSON} from '../core/io.mjs'

const task=await readJSON('tasks/keyboard-only.json')
const original=(await readJSON('extension/demo.json'))[0]
const proposal=JSON.stringify({barrier:original.barrier,rules:original.rules})
const names=JSON.stringify([{index:0,name:'Open search',basis:'The crop shows a magnifying glass.'}])

function restoreAgentEnv(previous) {
  for(const key of ['CURBCUT_AGENT','CURBCUT_MODEL','CURBCUT_GROK','CURBCUT_LADDER','CURBCUT_MODEL_SMALL','CURBCUT_MODEL_LARGE','CURBCUT_CODEX_LARGE']) {
    if(previous[key]===undefined) delete process.env[key]
    else process.env[key]=previous[key]
  }
}

test('CURBCUT_AGENT selects codex by default and grok with its model and executable',()=>{
  const previous={CURBCUT_AGENT:process.env.CURBCUT_AGENT,CURBCUT_MODEL:process.env.CURBCUT_MODEL,CURBCUT_GROK:process.env.CURBCUT_GROK}
  try {
    delete process.env.CURBCUT_AGENT
    delete process.env.CURBCUT_MODEL
    assert.deepEqual(agentBackend(),{id:'codex',writer:'codex exec',model:'gpt-6.2-sol',executable:'codex',timeout:150000,namingTimeout:130000,effort:'low'})
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
  const args=agentArgs({id:'grok',model:'grok-4.5'},{dir:'/tmp/x',answer:'/tmp/x/answer.json',promptFile:'/tmp/x/prompt.txt',disableTools:true})
  assert.equal(args[0],'--prompt-file')
  assert.equal(args[1],'/tmp/x/prompt.txt')
  assert.ok(!args.includes('-p'))
  assert.equal(args[args.indexOf('--tools')+1],'')
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
  assert.equal(calls[0].args[0],'--prompt-file')
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

test('a template correction sends the patch schema and retries a schema error once',async()=>{
  const previous={CURBCUT_AGENT:process.env.CURBCUT_AGENT,CURBCUT_MODEL:process.env.CURBCUT_MODEL,CURBCUT_GROK:process.env.CURBCUT_GROK}
  const directory=await mkdtemp(path.join(tmpdir(),'curbcut-template-correction-'))
  const calls=[]
  const inherited=original.rules.slice(0,1)
  process.env.CURBCUT_AGENT='grok'
  try {
    const patch=await propose({...task,observedSelector:inherited[0].selector},{
      nearMiss:{patch:{rules:inherited},reason:'The expected name was absent.'},
      snapshot:{repair:{visibleText:'Find items',labels:['Search catalog']}}
    },inherited,directory,{
      validateSelectors:async()=>({ok:true,matches:[]}),
      run:async(_,args)=>{
        const prompt=await readFile(args[1],'utf8')
        const [,schema,data]=prompt.split('\n')
        assert.deepEqual(JSON.parse(schema),await readJSON('schemas/patch.json'))
        calls.push(JSON.parse(data))
        return {code:0,stdout:calls.length===1?'{"barrier":"Missing name","rules":[]}':proposal,stderr:''}
      }
    })
    assert.equal(calls.length,2)
    for(const call of calls) {
      assert.deepEqual(call.inheritedRules,inherited)
      assert.equal(call.reason,'The expected name was absent.')
      assert.deepEqual(call.target,{selector:inherited[0].selector,visibleText:'Find items',labelCandidates:['Search catalog']})
    }
    assert.equal(calls[0].validatorMessage,undefined)
    assert.match(calls[1].validatorMessage,/\/rules.*minItems/)
    assert.deepEqual(patch.rules,original.rules)
  } finally {
    restoreAgentEnv(previous)
    await rm(directory,{recursive:true,force:true})
  }
})

test('two tasks share a fixed prompt prefix of at least 800 characters',async()=>{
  const schema=await readJSON('schemas/patch.json')
  const prefix=proposalPrefix(schema)
  assert.ok(prefix.length>=800)
  const other={...task,id:'other-task',url:'http://127.0.0.1:4317/fixtures/shop/porch.html',task:'Open porch details'}
  const first=proposalInstructions(task,{runner:'playwright',reason:'Tab skipped the control'},null,schema)
  const second=proposalInstructions(other,{runner:'playwright',reason:'The name is missing'},null,schema)
  assert.equal(first.slice(0,prefix.length),prefix)
  assert.equal(second.slice(0,prefix.length),prefix)
  assert.equal(first.slice(0,prefix.length),second.slice(0,prefix.length))
  assert.notEqual(first,second)
})

test('the ladder uses the small model first and retries once with the large model',async()=>{
  const previous={CURBCUT_AGENT:process.env.CURBCUT_AGENT,CURBCUT_MODEL:process.env.CURBCUT_MODEL,CURBCUT_GROK:process.env.CURBCUT_GROK,
    CURBCUT_LADDER:process.env.CURBCUT_LADDER,CURBCUT_MODEL_SMALL:process.env.CURBCUT_MODEL_SMALL,CURBCUT_MODEL_LARGE:process.env.CURBCUT_MODEL_LARGE}
  const directory=await mkdtemp(path.join(tmpdir(),'curbcut-ladder-'))
  const models=[]
  process.env.CURBCUT_AGENT='grok'
  delete process.env.CURBCUT_MODEL
  delete process.env.CURBCUT_LADDER
  try {
    assert.equal(ladderEnabled(),true)
    assert.deepEqual(ladderRungs({id:'grok',model:'grok-4.5'}),{small:{model:'grok-4.5'},large:{model:'grok-4.6'}})
    const patch=await propose(task,{runner:'playwright',reason:'Tab skipped the control'},null,directory,{
      validateSelectors:async()=>({ok:models.length>1,matches:models.length>1?[]:[{field:'selector',selector:'div.add-to-cart',issue:'zero matches'}]}),
      run:async(_exe,args)=>{
        const model=args[args.indexOf('-m')+1]
        models.push(model)
        const body=models.length===1?JSON.stringify({barrier:original.barrier,rules:original.rules.slice(0,1)}):proposal
        return {code:0,stdout:body,stderr:''}
      }
    })
    assert.deepEqual(models,['grok-4.5','grok-4.6'])
    assert.equal(patch.evidence.ladderRung,'large')
    assert.equal(patch.barrier,original.barrier)
  } finally {
    restoreAgentEnv(previous)
    await rm(directory,{recursive:true,force:true})
  }
})

test('CURBCUT_LADDER=off keeps a single model and CURBCUT_LADDER default records a small-model win',async()=>{
  const previous={CURBCUT_AGENT:process.env.CURBCUT_AGENT,CURBCUT_MODEL:process.env.CURBCUT_MODEL,CURBCUT_GROK:process.env.CURBCUT_GROK,
    CURBCUT_LADDER:process.env.CURBCUT_LADDER}
  const directory=await mkdtemp(path.join(tmpdir(),'curbcut-ladder-off-'))
  process.env.CURBCUT_AGENT='grok'
  delete process.env.CURBCUT_MODEL
  try {
    process.env.CURBCUT_LADDER='off'
    assert.equal(ladderEnabled(),false)
    const models=[]
    await propose(task,{runner:'playwright',reason:'Tab skipped the control'},null,path.join(directory,'off'),{
      validateSelectors:async()=>({ok:true,matches:[]}),
      run:async(_exe,args)=>{
        models.push(args[args.indexOf('-m')+1])
        return {code:0,stdout:proposal,stderr:''}
      }
    })
    assert.deepEqual(models,['grok-4.5'])
    delete process.env.CURBCUT_LADDER
    const won=await propose(task,{runner:'playwright',reason:'Tab skipped the control'},null,path.join(directory,'on'),{
      validateSelectors:async()=>({ok:true,matches:[]}),
      run:async()=>({code:0,stdout:proposal,stderr:''})
    })
    assert.equal(won.evidence.ladderRung,'small')
  } finally {
    restoreAgentEnv(previous)
    await rm(directory,{recursive:true,force:true})
  }
})
