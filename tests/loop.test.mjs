import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {judgeJourney,kaneLimits,parseRun,replayObjective} from '../core/kane.mjs'
import {checkPatch,fix,repairLocally} from '../core/loop.mjs'
import {readJSON} from '../core/io.mjs'
import {match} from '../core/engine.js'
import {ProposalRejected} from '../core/agent.mjs'
import {taskDestination} from '../core/task.mjs'
import {reviewRecordedJourney} from '../scripts/recorded-journey.mjs'
const original=(await readJSON('extension/demo.json'))[0]
const task=await readJSON('tasks/keyboard-only.json')
const result=(status,n)=>({status,runId:'test-'+n,video:'unit-'+n+'.mp4'})
test('only agreeing Kane run_end and exit code can provide a verdict',()=>{
 for(const [code,status,expected] of [[0,'passed','pass'],[1,'failed','fail'],[1,'passed','inconclusive'],[2,'failed','inconclusive']]){
  assert.equal(parseRun({code,stdout:JSON.stringify({type:'run_end',status,session_dir:'/tmp/unit'})}).status,expected)
 }
 assert.equal(parseRun({code:2,stdout:'not authenticated'}).status,'inconclusive')
 assert.equal(parseRun({code:1,stdout:JSON.stringify({type:'run_end',status:'failed',reason_code:'agent_error.child_failed'})}).status,'inconclusive')
 assert.equal(parseRun({code:1,stdout:JSON.stringify({type:'run_end',status:'failed',reason_code:'assertion_error.step_not_achievable',reason:'The run turn budget was exhausted.'})}).status,'inconclusive')
})
test('only the unpatched keyboard objective asks Kane to report a missing control as failed',()=>{
 const journey={task:'Tab to “Menu” and open it.',controlTask:'Click “Menu”.',journey:[{}]}
 const hint='The initial target is outside the Tab order.'
 const failure='If a required control is missing, invisible, or cannot be reached, report the task as failed.'
 const before=replayObjective(journey,'keyboard-only',{hint})
 const control=replayObjective(journey,'control',{hint})
 const after=replayObjective(journey,'keyboard-only',{patched:true,hint})
 assert.ok(before.includes(failure) && before.includes(hint))
 assert.ok(control.includes(journey.controlTask))
 assert.doesNotMatch(control,/keyboard|inaccessible|barrier|failed|outside the Tab order/i)
 assert.ok(after.includes(journey.task) && after.includes('Use only keyboard input.'))
 assert.doesNotMatch(after,/inaccessible|barrier|failed|outside the Tab order/i)
 assert.doesNotMatch(replayObjective({task:'Find the named field.',probe:{action:'type'}},'screen-reader-view',{patched:true}),/barrier|failed/i)
})
test('shop Check budgets cover the archived step counts and ask for observable keyboard actions',async()=>{
 const archived='proof/demo/check/2026-11-24T18-15-53.859Z/'
 for(const [lane,persona] of [['before','keyboard-only'],['control','control'],['attempt-1/after','keyboard-only']]) {
  const events=(await readFile(archived+lane+'/events.ndjson','utf8')).trim().split('\n').map(line=>JSON.parse(line))
  const lastStep=Math.max(...events.map(event=>event.step??0))
  assert.ok(kaneLimits(task,persona).maxSteps>lastStep)
 }
 const objective=replayObjective(task,'keyboard-only')
 assert.match(objective,/Type headphones as a single text entry/)
 assert.match(objective,/observe whether the header reads Cart \(1\)/)
 assert.doesNotMatch(objective,/outside the sequential Tab order/)
})
test('reject out-of-scope origins, unknown actions and unrestricted CSS',()=>{
 assert(match(original,task.url))
 assert(!match(original,task.url.replace('4317','4318')))
 for(const rule of [{action:'script',value:'anything'},{action:'injectCSS',value:{background:'url(https://example.org)'}}])assert(!match({...original,rules:[{selector:'body',...rule}]},task.url))
})
test('patches match their www twins with the same scheme, port and path',()=>{
 const bare={...original,site:'example.org',match:'https://example.org:8443/catalog'}
 const www={...bare,site:'www.example.org',match:'https://www.example.org:8443/catalog'}
 assert(match(bare,'https://www.example.org:8443/catalog'))
 assert(match(www,'https://example.org:8443/catalog'))
 assert(match(bare,'https://www.example.org:8443/catalog?q=books#results'))
 assert(!match(bare,'https://shop.example.org:8443/catalog'))
 assert(!match(www,'https://www.www.example.org:8443/catalog'))
 assert(!match(bare,'https://www.example.org:8443/catalog/items'))
 assert(!match(bare,'http://www.example.org:8443/catalog'))
 assert(!match(bare,'https://www.example.org/catalog'))
 assert(!match({...bare,site:www.site},www.match))
 assert(match({...bare,match:bare.match+'/*'},'https://www.example.org:8443/catalog/items'))
})
test('fix grants verified status only after failed baseline, passing control and recorded successful replay',async()=>{
 const sequence=['fail','pass','fail','pass']
 let publishes=0,drafts=0
 const actual=await fix(task,{base:'/tmp/unused',run:async()=>result(sequence.shift(),sequence.length),write:async()=>{drafts++;const proposal=structuredClone(original);if(drafts===1) proposal.rules.pop();return proposal},persist:async patch=>{publishes++;assert.equal(patch.evidence.kaneRunIds.length,3)}})
 assert.equal(actual.status,'verified');assert.equal(drafts,2);assert.equal(publishes,1)
 const failed=await fix(task,{base:'/tmp/unused',run:async()=>result('fail',0),write:()=>assert.fail(),persist:()=>assert.fail()})
 assert.equal(failed.status,'inconclusive')
})
test('recheck preserves verified on inconclusive, retires on native pass and invokes repair on patched fail',async()=>{
 for(const [seq,expected] of [[['inconclusive'],'verified'],[['pass'],'retired'],[['fail','fail'],'broken']]){
  const copy=structuredClone(original);copy.status='verified'
  let repaired=false
  await checkPatch(copy,{base:'/tmp/unused',run:async()=>result(seq.shift(),seq.length),persist:async()=>{},repair:async()=>{repaired=true}})
  assert.equal(copy.status,expected);assert.equal(repaired,expected==='broken')
 }
})
test('schema feedback consumes one shared attempt and reaches the next proposal',async()=>{
 const {mkdtemp,rm,readFile}=await import('node:fs/promises')
 const {tmpdir}=await import('node:os')
 const {join}=await import('node:path')
 const directory=await mkdtemp(join(tmpdir(),'curbcut-proposal-test-'))
 let proposals=0
 try {
  const statuses=['fail','pass','pass']
  const replay=await fix(task,{base:directory,run:async()=>result(statuses.shift(),statuses.length),
   write:async(_task,failure)=>{
    proposals++
    if(proposals===1) return {...original,rules:[]}
    assert.match(failure.validationError,/minItems/)
    return structuredClone(original)
   },persist:async()=>{}})
  assert.equal(replay.status,'verified')
  assert.equal(proposals,2)
  assert.equal(statuses.length,0)
  assert.match(await readFile(join(directory,'attempt-1/rejection.txt'),'utf8'),/minItems/)
 }finally{await rm(directory,{recursive:true,force:true})}
})

test('a v3 probe resolves a sealed checkpoint disagreement using witnessed width',async()=>{
 const {judgeProbe}=await import('../core/kane.mjs')
 const task={observedSelector:'#passage',probe:{action:'read'},outcomeChecks:[
  {selector:'#passage',kind:'contains',equals:'Exact quote'},{selector:'#passage',kind:'fits-width'}
 ]}
 const inspection={harness:{documentId:'current'}}
 const event={type:'passage',top:true,targetMatches:true,documentId:'current'}
 const grade=(fits,checks,kaneStatus)=>judgeProbe({task,persona:'low-vision',inspection,checks,kaneStatus,events:[{...event,geometry:{fits}}]})
 assert.equal(grade(true,[true,true],'fail').status,'pass')
 assert.equal(grade(false,[true,false],'pass').status,'fail')
 assert.equal(grade(true,[true,false],'pass').basis,'passage-layout-changed')
 assert.equal(grade(false,[false,false],'pass').basis,'passage-changed')
})

test('a named proxy and a real Tab landing are required for structured persona passes',async()=>{
 const {judgeProbe}=await import('../core/kane.mjs')
 const inspection={harness:{documentId:'current'},target:{visible:true,tabIndex:-1}}
 const task={requiredName:'Search catalog',probe:{action:'type',role:'textbox'}}
 const grade=(persona,events,checks=[true])=>judgeProbe({task,persona,inspection,checks,kaneStatus:'pass',events})
 const text={type:'reader-text',name:'',role:'textbox',targetMatches:true}
 assert.equal(grade('screen-reader-view',[text]).status,'fail')
 assert.equal(grade('screen-reader-view',[{...text,name:task.requiredName}]).status,'pass')
 const input={type:'text',targetMatches:true,documentId:'current'}
 const tabFocus={...input,type:'tab-focus'}
 assert.equal(grade('keyboard-only',[input]).status,'inconclusive')
 assert.equal(grade('keyboard-only',[input,tabFocus]).status,'inconclusive')
 assert.equal(grade('keyboard-only',[tabFocus,input]).status,'pass')
 const tabs=[{type:'tab',documentId:'current'},{type:'tab',documentId:'current'}]
 assert.equal(grade('keyboard-only',tabs,[false]).basis,'target-skipped-by-tab')
})

test('the local oracle screens failing patches before Kane and tolerates an inconclusive Kane baseline',async()=>{
 const probed={...task,observedSelector:'div.add-to-cart',probe:{action:'click'},outcomeChecks:[{kind:'visible',selector:'body'}]}
 const kane=['inconclusive','pass','pass']
 const calls=[]
 let replays=0
 const outcome=await fix(probed,{base:'/tmp/unused-oracle',
  check:async(_task,patch)=>patch?(++replays===1?{status:'fail',reason:'still skipped'}:{status:'pass'}):{status:'confirmed',persona:{snapshot:null}},
  run:async(_task,persona,patch)=>{calls.push(persona+(patch?'+patch':''));return result(kane.shift(),kane.length)},
  write:async(_task,failure)=>{const proposal=structuredClone(original);if(replays===1) assert.match(failure.reason,/still skipped/);return replays===0?{...proposal,rules:proposal.rules.slice(0,1)}:proposal},
  persist:async patch=>assert.equal(patch.evidence.kaneVerdicts.before,'inconclusive')})
 assert.equal(outcome.status,'verified')
 assert.deepEqual(calls,['keyboard-only','control','keyboard-only+patch'])
 const none=await fix(probed,{base:'/tmp/unused-oracle',check:async()=>({status:'no barrier'}),run:()=>assert.fail(),write:()=>assert.fail()})
 assert.equal(none.status,'already-accessible')
})

test('Kane journeys require ordered actions and a witnessed intermediate outcome',()=>{
 const task={barrierClass:4,journey:[
  {selector:'#open',action:'activate',checks:[{kind:'visible',selector:'#dialog'}]},
  {selector:'#dialog',action:'key',key:'Escape',pointer:{action:'click',selector:'#close'}}
 ]}
 const activation={type:'activate',stepTargets:['#open'],top:true}
 const checkpoint={type:'journey-checkpoint',index:0,top:true}
 const escape={type:'key',key:'Escape',stepTargets:['#dialog','#close'],top:true}
 const inputs={task,persona:'keyboard-only',checks:[true],kaneStatus:'pass'}
 assert.equal(judgeJourney({...inputs,events:[activation,checkpoint,escape]}).status,'pass')
 assert.equal(judgeJourney({...inputs,events:[activation,escape]}).status,'inconclusive')
 assert.equal(judgeJourney({...inputs,events:[escape,activation,checkpoint]}).status,'inconclusive')
 assert.equal(judgeJourney({...inputs,events:[activation],kaneStatus:'fail'}).status,'fail')
 const pointerOpen={type:'pointer-click',stepTargets:['#open'],top:true}
 const pointerClose={type:'pointer-click',stepTargets:['#close'],top:true}
 assert.equal(judgeJourney({...inputs,persona:'control',events:[pointerOpen,checkpoint,pointerClose]}).status,'pass')
})

test('Kane hover journeys require visible focused activation and record invisible targets as failures',()=>{
 const task={barrierClass:1,journey:[{selector:'#trigger',action:'focus'},{selector:'#link',action:'activate'}]}
 const focus={type:'tab-focus',stepTargets:['#trigger'],top:true}
 const activate={type:'activate',stepTargets:['#link'],top:true}
 const inputs={task,persona:'keyboard-only',checks:[true],kaneStatus:'pass'}
 assert.equal(judgeJourney({...inputs,events:[focus,activate]}).status,'inconclusive')
 assert.equal(judgeJourney({...inputs,events:[focus,{...activate,focused:true}]}).status,'pass')
 assert.equal(judgeJourney({...inputs,checks:[false],kaneStatus:'inconclusive',
  events:[focus,{...activate,type:'blocked-activation'}]}).basis,'required-keyboard-activation-invisible')
})

test('a hover checkpoint may precede its focus event within the same trusted Tab',()=>{
 const task={barrierClass:1,journey:[
  {selector:'#view',action:'focus',checks:[{kind:'visible',selector:'#layers'}]},
  {selector:'#layers',action:'observe'}
 ]}
 const context={top:true,documentId:'map'}
 const tab={...context,type:'tab'}
 const visible={...context,type:'journey-checkpoint',index:0}
 const focus={...context,type:'tab-focus',stepTargets:['#view']}
 const inputs={task,persona:'keyboard-only',checks:[true],kaneStatus:'pass'}
 assert.equal(judgeJourney({...inputs,events:[tab,visible,focus]}).status,'pass')
 assert.equal(judgeJourney({...inputs,events:[visible,tab,focus]}).status,'inconclusive')
 assert.equal(judgeJourney({...inputs,events:[tab,{...visible,documentId:'old-map'},focus]}).status,'inconclusive')
 assert.equal(judgeJourney({...inputs,events:[tab,visible,{...focus,stepTargets:['#other']}]}).status,'inconclusive')
})

test('the archived OpenSeaMap trace can be rechecked only for its recorded objective',async()=>{
 const attempt='proof/kane/draft-7565c3d5-736d-48b1-b0e2-8c38afd36147/barrier-report/attempt-1'
 const patch=await readJSON(attempt+'/candidate.json')
 const input={directory:attempt+'/after',task:patch,persona:patch.persona,patch}
 const checked=await reviewRecordedJourney(input)
 assert.equal(checked.review.originalStatus,'inconclusive')
 assert.equal(checked.result.status,'pass')
 await assert.rejects(reviewRecordedJourney({...input,task:{...patch,task:'Use the map without a pointer.'}}))
 await assert.rejects(reviewRecordedJourney({...input,patch:{...patch,id:'another-patch'}}))
})

test('the Playwright loop keeps a successful patch as a candidate and preserves the pointer result',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises')
 const {tmpdir}=await import('node:os')
 const {join}=await import('node:path')
 const base=await mkdtemp(join(tmpdir(),'curbcut-local-test-'))
 try {
  const outcomes=['pass','fail','pass','pass']
  const replay=await repairLocally(task,{base,write:async()=>structuredClone(original),
   replay:async()=>({status:outcomes.shift(),runner:'playwright'})})
  assert.equal(replay.runner,'playwright')
  assert.equal(replay.status,'locally-fixed')
  assert.equal(replay.patch.status,'candidate')
  assert.equal(replay.phases.at(-1).name,'attempt-1/control-with-patch')
  assert.equal(outcomes.length,0)
 } finally {await rm(base,{recursive:true,force:true})}
})

test('invalid and previously replayed rules consume an attempt without another replay',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises')
 const {tmpdir}=await import('node:os')
 const {join}=await import('node:path')
 const base=await mkdtemp(join(tmpdir(),'curbcut-retry-test-'))
 const statuses=['pass','fail','fail','fail','pass','pass']
 const drafts=[original.rules.slice(0,2),original.rules.slice(0,3),original.rules.slice(0,2).reverse(),null,original.rules]
 let index=0
 try {
  const outcome=await repairLocally(task,{base,replay:async()=>({status:statuses.shift(),reason:'Measured fixture outcome'}),
   write:async(_task,failure)=>{
    const rules=drafts[index++]
    if(index===3) assert.equal(failure.previousAttempts[0].persona.reason,'Measured fixture outcome')
    if(index===4) throw new ProposalRejected('Missing from the live DOM.',null,{ok:false,matches:[]})
    if(index===5) {
     assert.match(failure.previousAttempts[2].rejection,/repeat an earlier attempt/)
     assert.equal(failure.selectorValidation.ok,false)
    }
    return {...structuredClone(original),rules}
   }})
  assert.equal(outcome.status,'locally-fixed')
  assert.equal(index,5)
  assert.equal(statuses.length,0)
  assert.deepEqual(outcome.phases.filter(phase=>phase.status==='rejected').map(phase=>phase.iteration),[3,4])
 } finally {await rm(base,{recursive:true,force:true})}
})

test('registered destinations can use public subdomains within the same registrable site',()=>{
 const objective={url:'https://www.example.com/',journey:[{checks:[{kind:'url-path',equals:'/guides'}]}],
  outcomeChecks:[{kind:'url-path',equals:'/manual'},{kind:'url-path',equals:'/account'}]}
 assert(taskDestination(objective,new URL('https://docs.example.com/guides')))
 assert(taskDestination(objective,new URL('https://public.docs.example.com/manual')))
 assert(!taskDestination(objective,new URL('https://public.example.com/unregistered')))
 assert(!taskDestination(objective,new URL('https://public.example.com/account')))
 assert(!taskDestination(objective,new URL('https://auth.example.com/manual')))
 assert(!taskDestination(objective,new URL('https://docs.example.net/manual')))
 assert(!taskDestination({...objective,url:'https://another.github.io/'},new URL('https://docs.github.io/manual')))
 const locale={...objective,journey:[{action:'activate'}],outcomeChecks:[{kind:'text',selector:'#language',equals:'Français'}]}
 assert(taskDestination(locale,new URL('https://fr.example.com/accueil')))
})

test('a registered patch requires three sealed Kane results before publication',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises')
 const {tmpdir}=await import('node:os')
 const {join}=await import('node:path')
 const base=await mkdtemp(join(tmpdir(),'curbcut-kane-test-'))
 try {
  const candidate={...structuredClone(original),id:task.id,url:task.url,task:task.task}
  const stages=['fail','pass','inconclusive','pass']
  const verified=[]
  const run=async()=>({...result(stages.shift(),stages.length),runner:'kane',evidenceValid:true})
  const options={base,registeredCandidate:candidate,provenance:{priorAgentProposal:'local/candidate.json',sourceLocalRun:'local/before.json'},
   run,persist:async patch=>verified.push(patch)}
  const actual=await fix(task,options)
  assert.equal(actual.status,'verified')
  assert.equal(verified.length,1)
  assert.equal(stages.length,0)
  stages.push('inconclusive','pass','pass')
  assert.equal((await fix(task,options)).status,'inconclusive')
  assert.equal(verified.length,1)
 } finally {await rm(base,{recursive:true,force:true})}
})

test('extension feed validation accepts each declarative widget action',async()=>{
 const {runInNewContext}=await import('node:vm')
 const {readFile}=await import('node:fs/promises')
 const {ROOT}=await import('../core/io.mjs')
 const scope={}
 for(const file of ['constants','validate']) runInNewContext(await readFile(ROOT+'extension/lib/'+file+'.js','utf8'),scope)
 const journeys=[...await readJSON('fixtures/shop/journeys.json'),...await readJSON('fixtures/shop/widgets.json')]
 for(const journey of journeys) {
  const patch={...structuredClone(original),rules:journey.rules}
  assert.equal(scope.CurbCutExt.validatePatch(patch).ok,true,journey.id)
  assert.equal(match(scope.CurbCutExt.toEnginePatch(patch),task.url),true,journey.id)
 }
 assert.equal(scope.CurbCutExt.validatePatch({...original,rules:[{action:'listboxBehavior',trigger:'button'}]}).ok,false)
})
