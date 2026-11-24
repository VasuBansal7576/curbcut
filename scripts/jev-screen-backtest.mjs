import {execFile,spawn} from 'node:child_process'
import {readFile,readdir} from 'node:fs/promises'
import {promisify} from 'node:util'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {askJev,imageAsset,noul} from '../core/jev-policy.js'
import {choosePreflight} from '../core/jev-preflight.mjs'
import {jevKey} from '../core/jev.mjs'
import {readJSON,saveJSON,instant} from '../core/io.mjs'

const exec=promisify(execFile)
const key=await jevKey()
const mode=process.argv[2]
if(!['barrier','preflight'].includes(mode)) throw new Error('Use barrier or preflight.')
const file='proof/jev/'+mode+'-backtest.json'
const ledger=await readJSON('proof/kane/ledger.json')
const unique=new Map()
for(const run of ledger) {
  if(!run.sessionId) continue
  const prior=unique.get(run.sessionId)
  if(!prior || !prior.evidencePack && run.evidencePack || prior.status==='inconclusive' && run.status!=='inconclusive') unique.set(run.sessionId,run)
}
const verified=new Set()
for(const run of unique.values()) {
  if(run.phase!=='after' || run.status!=='pass') continue
  const taskRuns=ledger.filter(row=>row.taskId===run.taskId)
  if(taskRuns.some(row=>row.phase==='before' && row.status==='fail') &&
    taskRuns.some(row=>row.phase==='control' && row.status==='pass')) verified.add(run.taskId)
}
const sample=[...unique.values()].filter(run=>mode==='preflight' || run.phase==='before' && ['pass','fail'].includes(run.status))
const previous=await readJSON(file).catch(error=>{if(error.code!=='ENOENT') throw error;return {rows:[]}})
const rows=new Map(previous.rows.map(row=>[row.sessionId,row]))
const failures=new Map()
const stripUrls=value=>String(value??'').replace(/\bhttps?:\/\/[^\s<>"']+/g,address=>{
  try {const url=new URL(address);return url.origin+url.pathname} catch {return '[address]'}
})

function reasonClass(reason) {
  if(/captcha|\bbot\b|cloudflare|verify you are human|verification frame/i.test(reason)) return 'bot'
  if(/cookie (?:consent|wall|dialog|banner)/i.test(reason)) return 'cookie'
  if(/(?:region|country|newsletter) (?:selection|wall|dialog|modal|overlay)/i.test(reason)) return 'region'
  if(/login wall|requires (?:sign.?in|log.?in)|authentication wall/i.test(reason)) return 'login'
  if(/initial.*(?:target|not visible)|target.*(?:initial viewport|start screenshot)/i.test(reason)) return 'target'
  return null
}

async function frameList(pack) {
  const {stdout}=await exec('unzip',['-Z1',pack],{maxBuffer:4000000})
  return stdout.split('\n').flatMap(file=>{
    const match=/\/steps\/(\d+)-\d+-\d+\/screenshot\.jpg$/.exec(file)
    return match?[{file,step:Number(match[1])}]:[]
  }).sort((a,b)=>a.step-b.step)
}

async function frame(pack,file) {
  const {stdout}=await exec('unzip',['-p',pack,file],{encoding:'buffer',maxBuffer:5000000})
  return new Promise((resolve,reject)=>{
    const child=spawn('ffmpeg',['-v','error','-f','image2pipe','-i','pipe:0','-vf',
      'scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2','-frames:v','1','-f','image2pipe','-vcodec','mjpeg','pipe:1'],
      {stdio:['pipe','pipe','ignore']})
    const chunks=[]
    child.stdout.on('data',chunk=>chunks.push(chunk))
    child.stdin.on('error',reject)
    child.on('error',reject)
    child.on('close',status=>status===0?resolve('data:image/jpeg;base64,'+Buffer.concat(chunks).toString('base64')):
      reject(new Error('Unable to resize archived frame.')))
    child.stdin.end(stdout)
  })
}

async function evaluate(run) {
  if(!run.evidencePack || !run.evidencePack.endsWith('.evidence')) return {unavailable:'No sealed screenshot archive.'}
  const result=await readJSON(run.result)
  const objective=stripUrls(result.objective).slice(0,2250)
  const frames=await frameList(run.evidencePack)
  if(!frames.length || !objective) return {unavailable:'Missing screenshot or objective.'}
  if(mode==='preflight') {
    const first=frames[0]
    const decision=await choosePreflight(key,objective,await frame(run.evidencePack,first.file),first.step)
    return {frames:[first.step],...decision}
  }
  const selected=[...new Set([frames[0],frames[Math.floor((frames.length-1)/2)],frames.at(-1)])]
  const assets={}
  const images=[]
  for(const row of selected) {
    const {id,asset}=imageAsset(await frame(run.evidencePack,row.file))
    assets[id]=asset
    images.push({step:row.step,image:id})
  }
  const questions={blocked:noul('Would the stated persona actually be blocked from completing this task on the original site, judging only the visible unpatched browser states?',
    'The control or information is persistently unavailable to the persona or visibly inoperable for the required steps.',
    'A feasible route is visible, the required outcome is already available, or the snapshots give no concrete evidence of a barrier.')}
  const response=await askJev(key,{model:'jev-1.14.0',state:{objective,frames:images},questions,assets})
  return {frames:selected.map(row=>row.step),model:response.model,providerMs:response.providerMs,p:response.answers?.blocked?.noul??null}
}

let pending=0
for(const run of sample) {
  if(rows.has(run.sessionId)) continue
  const start=Date.now()
  let decision
  try {decision=await evaluate(run)}
  catch(error) {
    const reason=error.message.split('\n')[0]
    if(/HTTP|fetch failed|aborted/.test(reason)) failures.set(reason,(failures.get(reason)??0)+1)
    decision={unavailable:reason}
  }
  const record={sessionId:run.sessionId,taskId:run.taskId,file:run.result,status:run.status,credits:run.credits,
    verified:verified.has(run.taskId),partition:/^proof\/heldout-v[56]\//.test(run.result)?'later':'development',
    blocker:reasonClass(run.reason??''),...decision}
  rows.set(run.sessionId,record)
  if(++pending%25===0) {
    console.log(mode,rows.size,'/',sample.length)
    await saveJSON(file,{rows:[...rows.values()]})
  }
  if([...failures.values()].some(count=>count>=2)) break
  if(record.frames || /HTTP/.test(record.unavailable??'')) await delay(Math.max(0,640-(Date.now()-start)))
}

const complete=sample.map(run=>rows.get(run.sessionId)??{sessionId:run.sessionId,file:run.result,status:run.status,unavailable:'not-run'})
const development=complete.filter(row=>row.partition==='development')
const later=complete.filter(row=>row.partition==='later')
const scored=complete.filter(row=>Number.isFinite(row.p))
function impact(source,threshold) {
  const flagged=source.filter(row=>Number.isFinite(row.p) && (mode==='preflight'?row.p>=threshold &&
    ['cookie','region','bot','login','target'].includes(row.choice):row.p<threshold))
  const count=pred=>flagged.filter(pred).length
  return {scored:source.filter(row=>Number.isFinite(row.p)).length,flagged:flagged.length,
    ...(mode==='preflight'?{decisiveLost:count(row=>row.status!=='inconclusive'),inconclusiveFlagged:count(row=>row.status==='inconclusive'),
      matchingBlockers:count(row=>row.status==='inconclusive' && row.blocker===row.choice)}:{
      verifiedTasksLost:new Set(flagged.filter(row=>row.verified && row.status==='fail').map(row=>row.taskId)).size,
      failingBaselinesSkipped:count(row=>row.status==='fail'),passingBaselinesSkipped:count(row=>row.status==='pass'),
      passingCreditsSkipped:flagged.filter(row=>row.status==='pass').reduce((sum,row)=>sum+(row.credits??0),0)})}
}
const cutoffs=[0,.03,.05,.08,.1,.15,.2,.3,.4,.5,.6,.7,.8,.85,.9,.95,.98]
if(mode==='barrier') cutoffs.push(...new Set(scored.map(row=>row.p).filter(p=>!cutoffs.includes(p))))
cutoffs.sort((a,b)=>a-b)
const allImpact=cutoffs.map(threshold=>({threshold,...impact(complete,threshold)}))
const developmentImpact=cutoffs.map(threshold=>({threshold,...impact(development,threshold)}))
const threshold=mode==='barrier'?
  developmentImpact.filter(row=>row.verifiedTasksLost===0).at(-1)?.threshold??0:
  developmentImpact.find(row=>row.decisiveLost===0 && row.matchingBlockers>0)?.threshold??1.01
const summary={mode,source:'Kane sealed screenshot archives',checkedAt:instant(),threshold,attempted:rows.size,eligible:sample.length,
  scored:scored.length,knownBlockers:complete.filter(row=>row.status==='inconclusive' && row.blocker).length,
  passingBaselines:complete.filter(row=>row.status==='pass').length,development:impact(development,threshold),later:impact(later,threshold),
  allAtDevelopmentThreshold:impact(complete,threshold),
  allSafeRetrospective:allImpact.filter(row=>mode==='barrier'?row.verifiedTasksLost===0:row.decisiveLost===0),
  sweep:allImpact,rows:complete}
await saveJSON(file,summary)
console.log(JSON.stringify({mode,eligible:summary.eligible,scored:summary.scored,threshold,development:summary.development,later:summary.later}))
