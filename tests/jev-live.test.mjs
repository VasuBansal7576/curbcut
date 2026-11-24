import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import {acceptLiveName,namingOptions} from '../core/jev-decisions.js'

test('live names require grounded options, control roles, and sufficient confidence',()=>{
  const target={role:'button',attributes:{id:'paste',class:'btn-tooltip'}}
  const options=Object.values(namingOptions(target,'en',{live:true})).map(({name})=>name)
  assert(options.includes('Paste from clipboard'))
  assert(!options.includes('paste'))
  assert(!options.includes('btn tooltip'))
  assert.equal(acceptLiveName(target,'en',{name:'paste',confidence:1}),null)
  assert.equal(acceptLiveName(target,'en',{name:'Paste from clipboard',confidence:.79}),null)
  assert.equal(acceptLiveName(target,'en',{name:'Paste from clipboard',confidence:.80}),'Paste from clipboard')
  assert.equal(acceptLiveName({...target,role:'img'},'en',{name:'Home',confidence:1}),null)
})

test('continuously mutating pages keep their timer and confirm stable crop targets independently',async()=>{
  const source=await readFile(new URL('../extension/naming-content.js',import.meta.url),'utf8')
  const nodes=new Map([['#first',{}],['#second',{}]])
  const location={href:'https://public.example.org/',protocol:'https:'}
  const timers=new Map()
  let notify,receive,sent
  let timer=0
  let movingLeft=20
  const observed=new Promise(resolve=>{sent=resolve})
  runInNewContext(source,{
    location,
    document:{documentElement:{},hidden:false,querySelector:selector=>nodes.get(selector),addEventListener(){}},
    window:{addEventListener(){}},
    MutationObserver:class {
      constructor(callback){notify=callback}
      observe(){}
    },
    CurbCutExt:{isPagePaused:()=>false,canCapturePage:()=>({ok:true})},
    CurbCut:{
      instantPrivacy:()=>true,
      collectNames:()=>({language:'en',viewport:{width:100,height:100},targets:[
        {selector:'#first',role:'button',box:[0,0,16,16]},
        {selector:'#second',role:'button',box:[movingLeft,0,38,16]}
      ]})
    },
    chrome:{
      storage:{local:{get:async()=>({liveNamesEnabled:true})},onChanged:{addListener(){}}},
      runtime:{onMessage:{addListener:callback=>{receive=callback}},sendMessage:async message=>{
        sent(message)
        return {ok:false}
      }}
    },
    crypto:{randomUUID:()=>'request'},
    clearTimeout:id=>timers.delete(id),
    setTimeout:callback=>{timers.set(++timer,callback);return timer}
  })
  await Promise.resolve()
  const scheduled=[...timers.keys()][0]
  for(let index=0;index<6;index+=1) notify([{type:'childList'}])
  assert.deepEqual([...timers.keys()],[scheduled])
  timers.get(scheduled)()
  const {token}=await observed
  movingLeft+=3
  let confirmed
  receive({type:'LIVE_NAMES_CONFIRM',token},null,response=>{confirmed=response})
  assert.deepEqual(Array.from(confirmed.indices),[0])
})
