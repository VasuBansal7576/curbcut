import {setTimeout as delay} from 'node:timers/promises'
import {readJSON,saveJSON} from '../../core/io.mjs'
import {normalizeTask,siteKey} from '../../core/task.mjs'
import {replayLane} from '../../core/probe.mjs'
import {inherited,recipes,templateFor} from '../../core/recipes.mjs'

const destination='proof/cost/live-results.json'
const registration=await readJSON('proof/heldout-v5/registration.json')
const journeys=registration.tasks.map(row=>row.task).filter(task=>task.journey)
if(journeys.length!==89) throw new Error('Expected 89 registered journeys.')
const bundle=(await readJSON('extension/bundled.json')).filter(patch=>patch.status==='verified')
const family=patch=>patch.rules.some(rule=>rule.action==='bindEnterToClick')?'keyboard activation':
  patch.rules.every(rule=>rule.action==='addLabel')?'addLabel':
    patch.rules.every(rule=>rule.action==='mirrorHoverToFocus')?'CSS hover':null
const candidates=bundle.filter(family)
const legacy=await readJSON('tasks/recheck-keyboard.json')
const retry=process.argv.includes('--retry-browser')
const rows=retry || process.argv.includes('--resume')?await readJSON(destination):
  {startedAt:new Date().toISOString(),liveAgentCalls:0,kaneCredits:0,recipes:[],inheritance:[]}
if(!retry) {
  delete rows.completedAt
  delete rows.interrupted
  rows.inheritance=[]
  rows.pacing={parallelSites:3,minimumLaneGapMs:2000,recipesCompletedBeforeResume:rows.recipes.length}
}
let stop=false
process.once('SIGINT',()=>{stop=true})
process.once('SIGTERM',()=>{stop=true})

let nextLane=0
let checkpoint=Promise.resolve()
function save() {
  checkpoint=checkpoint.then(()=>saveJSON(destination,rows))
  return checkpoint
}

async function bySite(items,work) {
  const sites=[...Map.groupBy(items,item=>siteKey(new URL(item.url))).values()]
  const workers=Array.from({length:Math.min(3,sites.length)},async()=>{
    while(!stop && sites.length) {
      for(const item of sites.shift()) {
        if(stop) break
        await work(item)
      }
    }
  })
  const outcomes=await Promise.allSettled(workers)
  const rejected=outcomes.find(outcome=>outcome.status==='rejected')
  if(rejected && !stop) throw rejected.reason
}

const compact=({status,reason})=>({status,reason})
async function lane(task,persona,patch) {
  if(stop) throw new Error('Interrupted.')
  const now=Date.now()
  const wait=Math.max(0,nextLane-now)
  nextLane=now+wait+2000
  await delay(wait)
  if(stop) throw new Error('Interrupted.')
  return replayLane(task,persona,patch)
}
async function baseline(data) {
  const url=new URL(data.url)
  if(!['http:','https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) {
    throw new Error('Expected a public URL.')
  }
  let task
  try {task=await normalizeTask(data)}
  catch(error) {
    return {task:data,before:{status:'blocked',reason:error.message},control:null,snapshot:null}
  }
  const before=await lane(task,task.persona)
  const control=before.status==='blocked'?null:await lane(task,'control')
  let snapshot=before.snapshot??control?.snapshot
  if(before.snapshot?.url && before.snapshot.url===control?.snapshot?.url) {
    const nodes=new Map(before.snapshot.nodes.map(node=>[node.selector,node]))
    for(const node of control.snapshot.nodes) if(!nodes.has(node.selector)) nodes.set(node.selector,node)
    snapshot={...before.snapshot,nodes:[...nodes.values()],pointerContext:control.snapshot.interactionContext??control.snapshot.context}
  }
  return {task,before,control,snapshot}
}
const healthy=({before,control})=>before.status==='fail' && control?.status==='pass'

async function assay(task,patches) {
  const results=[]
  for(const patch of patches) {
    const after=await lane(task,task.persona,patch)
    const pointer=after.status==='blocked'?null:await lane(task,'control',patch)
    results.push({rules:patch.rules,source:patch.evidence['inherited-from'],templateId:patch.evidence.templateId,
      after:compact(after),pointer:pointer && compact(pointer)})
    if(after.status==='pass' && pointer?.status==='pass') break
  }
  return results
}
const passing=row=>row.after.status==='pass' && row.pointer?.status==='pass'
const blocked=row=>row.after.status==='blocked' || row.pointer?.status==='blocked'
const summarize=({before,control})=>({before:compact(before),control:control && compact(control)})

async function recipeTrial(data) {
  const seen=await baseline(data)
  const patches=healthy(seen)?recipes(seen.task,seen.snapshot):[]
  const verdicts=await assay(seen.task,patches)
  const status=!healthy(seen) || verdicts.length && verdicts.every(blocked)?'page drifted or blocked':
    verdicts.some(passing)?'fixed by recipe':verdicts.length?'recipe matched but oracle failed':'no recipe matched'
  return {id:data.id,url:data.url,persona:data.persona,status,...summarize(seen),verdicts}
}

if(retry) {
  if(!rows.completedAt || rows.interrupted) throw new Error('Finish the live run before retrying browser startup errors.')
  for(const [index,row] of rows.recipes.entries()) {
    const lanes=[row.before,row.control,...row.verdicts.flatMap(verdict=>[verdict.after,verdict.pointer])]
    if(stop || row.browserRetry || !lanes.some(lane=>lane?.reason?.startsWith('browserType.launchPersistentContext:'))) continue
    const result=await recipeTrial(journeys.find(task=>task.id===row.id))
    rows.recipes[index]={...result,browserRetry:{at:new Date().toISOString(),initial:row}}
    await saveJSON(destination,rows)
    console.log('recipe browser retry',result.id,result.status)
  }
  process.exit(0)
}

const completed=new Set(rows.recipes.map(row=>row.id))
await bySite(journeys.filter(task=>!completed.has(task.id)),async data=>{
  const result=await recipeTrial(data)
  rows.recipes.push(result)
  await save()
  console.log('recipe',rows.recipes.length,data.id,result.status)
})

const observed=new Map()
await bySite(candidates,async patch=>{
  const registered=await readJSON('tasks/public/kane/'+patch.id+'.json').catch(error=>{
    if(error.code==='ENOENT') return null
    throw error
  })
  const data={...patch,...registered,...legacy[patch.id]}
  if(patch.id==='fourmilab-prepare-latitude') Object.assign(data,{
    observedSelector:'input[name="lat"]',requiredName:'Latitude',probe:{action:'type',role:'textbox',value:'10'},
    outcomeChecks:[{selector:'input[name="lat"]',kind:'value',equals:'10'},{selector:'input[name="opt"][value="-l"]',kind:'selected'}]
  })
  if(!data.probe && !data.journey && !data.evaluation) {
    if(data.persona==='keyboard-only' && data.observedSelector && data.successSelector) {
      data.probe={action:'click'}
      data.outcomeChecks??=[{selector:data.successSelector,kind:'visible'}]
    }
  }
  const row={id:patch.id,url:patch.url,family:family(patch),site:siteKey(new URL(patch.url))}
  if(!data.probe && !data.journey && !data.evaluation) {
    rows.inheritance.push({...row,status:'no safe declarative objective'})
    await save()
    return
  }
  const seen=await baseline(data)
  observed.set(patch.id,{...seen,patch,row})
  rows.inheritance.push({...row,...summarize(seen),status:'baseline collected'})
  await save()
  console.log('inheritance baseline',patch.id,seen.before.status,seen.control?.status)
})
await bySite(rows.inheritance,async row=>{
  const target=observed.get(row.id)
  const donors=[...observed.values()].filter(source=>source.row.site!==row.site && source.row.family===row.family && source.snapshot && healthy(source))
  row.donorCount=donors.length
  if(!target) return
  if(!healthy(target) && !(target.before.status==='pass' && target.control?.status==='pass')) {
    row.status='page drifted or blocked'
  } else if(!donors.length) {
    row.status='no eligible donor'
  } else {
    const templates=donors.map(source=>templateFor({...source.patch,observedSelector:source.task.observedSelector},source.snapshot))
    const patches=inherited(target.task,target.snapshot,templates)
    if(target.before.status==='pass') {
      row.falseMatches=patches.map(patch=>patch.evidence['inherited-from'])
      row.status=patches.length?'false match on already accessible task':'already accessible, no match'
    } else {
      row.verdicts=await assay(target.task,patches)
      row.status=row.verdicts.some(passing)?'hit':row.verdicts.length && row.verdicts.every(blocked)?'page drifted or blocked':
        row.verdicts.length?'near miss':'no template matched'
      row.falseMatches=row.verdicts.filter(verdict=>verdict.pointer?.status==='fail').map(verdict=>verdict.source)
    }
  }
  await save()
  console.log('inheritance',row.id,row.status)
})
const order=new Map(journeys.map((task,index)=>[task.id,index]))
rows.recipes.sort((left,right)=>order.get(left.id)-order.get(right.id))
rows.inheritance.sort((left,right)=>left.id.localeCompare(right.id))
rows.completedAt=new Date().toISOString()
rows.interrupted=stop
await saveJSON(destination,rows)
