import path from 'node:path'
import {readFile,readdir} from 'node:fs/promises'
import {execFile,spawn} from 'node:child_process'
import {promisify} from 'node:util'
import {setTimeout as delay} from 'node:timers/promises'
import {parseRun} from '../core/kane.mjs'
import {askJev,noul,imageAsset} from '../core/jev-policy.js'
import {jevKey} from '../core/jev.mjs'
import {ROOT,readJSON,saveJSON,instant} from '../core/io.mjs'

const exec=promisify(execFile)
const directory=path.join(ROOT,'proof/jev')
const key=await jevKey()
if(!key) throw new Error('Jev is not configured.')
const relative=file=>path.relative(ROOT,file)
const entries=await readdir(path.join(ROOT,'proof'),{recursive:true})
const files=entries.filter(file=>file.endsWith('/events.ndjson') && !file.startsWith('jev/')).sort()
const clean=value=>String(value??'').replace(/\bhttps?:\/\/[^\s"'<>]+/g,address=>{
  try {const url=new URL(address);return url.origin+url.pathname} catch {return '[URL]'}
})
const runs=[]
for(const file of files) {
  const folder=path.join(ROOT,'proof',path.dirname(file))
  const result=await readJSON(path.join(folder,'result.json')).catch(error=>{if(error.code!=='ENOENT')throw error})
  const log=await readFile(path.join(ROOT,'proof',file),'utf8')
  const events=log.split('\n').flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}})
  const {runId,status:raw}=parseRun({stdout:log,code:result?.exitCode})
  if(!runId || !result || result.runner!=='kane') continue
  const status=runId===result.runId && result.evidenceValid && (raw===result.status || result.browserVerdict?.status===result.status)?
    result.status:'inconclusive'
  const steps=events.filter(event=>Number.isInteger(event.step))
  const completed=Math.max(0,...steps.filter(event=>['done','failed'].includes(event.status)).map(event=>event.step))
  const started=Math.max(0,...steps.map(event=>event.step))
  const taskId=file.match(/(?:^|\/)((?:v[3456]-)[^/]+)\//)?.[1]??null
  const objective=clean(result.objective??events.find(event=>event.type==='bifurcation')?.flows?.[0]??'')
  runs.push({file:relative(path.join(folder,'result.json')),folder,result,runId,status,raw,completed,started,taskId,objective,events})
}

const byRunId=new Map()
for(const run of runs) if(!byRunId.has(run.runId)) byRunId.set(run.runId,run)
const unique=[...byRunId.values()]
const calibrated=run=>!/^proof\/heldout-v[56]\//.test(run.file)
const knownFalse=run=>run.raw==='pass' && run.status==='inconclusive' &&
  /(?:not-witnessed|missed|requested target|declared outcome|did not observe trusted|required accessible control)/i.test(run.result.integrity??'')
const knownTrue=run=>run.raw==='pass' && run.status==='pass' && run.result.browserVerdict?.status==='pass'
const usable=run=>Number.isFinite(run.result.credits) && run.result.credits>=0

const bins={oneToFive:3,sixToTen:8,elevenToTwenty:15.5,twentyOneToThirty:25.5,thirtyOneToFifty:40.5,overFifty:60}
const bucketNames={oneToFive:'1–5 steps',sixToTen:'6–10 steps',elevenToTwenty:'11–20 steps',
  twentyOneToThirty:'21–30 steps',thirtyOneToFifty:'31–50 steps',overFifty:'51+ steps'}
const provenance={source:'Committed evidence packs, result.json, and event streams',archiveFiles:files.length,labeledFiles:runs.length,uniqueSessions:unique.length}
async function predict(run) {
  if(!run.objective) return {reason:'Missing pre-run objective.'}
  const {answers,model,providerMs}=await askJev(key,{state:{objective:run.objective,limits:run.result.limits??null},
    questions:{
      decisive:noul('Will this browser accessibility task produce a decisive recorded verdict within the given limits?',
        'A clear before or after result is likely to be observable and supported by the required actions.',
        'The recording will likely fail to establish an outcome, miss an intermediate action, or exhaust the limits.'),
      steps:{type:'choice',instructions:'Predict how many steps the runner will use, including any steps spent searching or stuck.',criteria:bucketNames}
    }})
  return {p:answers?.decisive?.noul??null,predictedSteps:bins[answers?.steps?.choice]??null,model,providerMs}
}
function auc(rows) {
  const yes=rows.filter(row=>row.decisive),no=rows.filter(row=>!row.decisive)
  const pairs=yes.length*no.length
  return pairs?yes.reduce((sum,a)=>sum+no.reduce((n,b)=>n+(a.p>b.p?1:a.p===b.p?.5:0),0),0)/pairs:null
}
function impact(rows,cutoff) {
  const skipped=rows.filter(row=>row.p<cutoff)
  return {threshold:cutoff,skipped:skipped.length,decisiveLost:skipped.filter(row=>row.decisive).length,
    decisivePassedLost:skipped.filter(row=>row.status==='pass').length,
    knownCreditsSaved:skipped.filter(row=>Number.isFinite(row.credits)).reduce((sum,row)=>sum+row.credits,0),
    skippedWithoutCreditRecord:skipped.filter(row=>row.credits==null).length}
}

async function listing(pack) {
  return (await exec('unzip',['-Z1',pack],{maxBuffer:5_000_000})).stdout.split('\n')
}
async function extract(pack,name) {
  return (await exec('unzip',['-p',pack,name],{encoding:'buffer',maxBuffer:5_000_000})).stdout
}
function resize(image) {
  return new Promise((resolve,reject)=>{
    const args=['-v','error','-f','image2pipe','-i','pipe:0','-vf','scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2','-frames:v','1','-f','image2pipe','-vcodec','mjpeg','pipe:1']
    const process=spawn('ffmpeg',args,{stdio:['pipe','pipe','ignore']})
    const chunks=[]
    process.stdout.on('data',chunk=>chunks.push(chunk))
    process.on('error',reject)
    process.stdin.on('error',reject)
    process.on('close',code=>code===0?resolve(Buffer.concat(chunks)):reject(new Error('Could not resize an evidence frame.')))
    process.stdin.end(image)
  })
}
async function audit(run) {
  if(!run.result.evidencePack || !run.objective) return {reason:'Missing screenshot archive or objective.'}
  const pack=path.join(ROOT,run.result.evidencePack)
  const frames=(await listing(pack)).flatMap(file=>{
    const match=/\/steps\/(\d+)-\d+-\d+\/screenshot\.jpg$/.exec(file)
    return match?[{file,step:Number(match[1])}]:[]
  }).sort((a,b)=>a.step-b.step)
  if(!frames.length) return {reason:'No recorded screenshot frames.'}
  const trace=run.events.filter(event=>event.status==='done' && Number.isInteger(event.step))
    .map(event=>({step:event.step,summary:clean(event.remark).slice(0,200)}))
  const chosen=[...new Set([frames[Math.max(0,frames.length-3)],frames.at(-1)])]
  const attached={}
  const state={objective:run.objective,claim:clean(run.result.summary).slice(0,700),trace,frames:[]}
  for(const frame of chosen) {
    const image=await resize(await extract(pack,frame.file))
    const {id,asset}=imageAsset('data:image/jpeg;base64,'+image.toString('base64'))
    attached[id]=asset
    state.frames.push({step:frame.step,image:id})
  }
  const {answers,model,providerMs}=await askJev(key,{state,assets:attached,
    questions:{
      frame:noul('Does the last recorded frame visibly show the exact claimed final outcome?', 'The frame directly supports that outcome.',
        'The frame contradicts it, shows a different control, or does not contain enough visible evidence.'),
      sequence:noul('Do the ordered step summaries show all required interactions in the objective, including exact intermediate keys and focus targets when specified?',
        'Every required action and context has explicit supporting evidence in order.',
        'A required action is skipped, performed on a different target, or supported only by the completion claim.')
    }})
  return {frame:answers?.frame?.noul??null,sequence:answers?.sequence?.noul??null,frames:chosen.map(frame=>frame.step),
    flags:[...(answers?.frame?.noul<.5?['frame']:[]),...(answers?.sequence?.noul<.5?['sequence']:[])],model,providerMs}
}

const mode=process.argv[2]
if(!['predict','audit'].includes(mode)) throw new Error('Use predict or audit.')
const auditPool=unique.filter(run=>run.raw==='pass' && /^proof\/heldout-v[56]\//.test(run.file))
const sample=mode==='predict'?unique:[...auditPool.filter(knownFalse),...auditPool.filter(knownTrue).slice(0,35),
  ...auditPool.filter(run=>!knownFalse(run) && !knownTrue(run)).slice(0,12)]
const journal=path.join(directory,mode+'-rows.json')
const rows=await readJSON(journal).catch(error=>{if(error.code!=='ENOENT')throw error;return []})
const duplicates=new Set(rows.map(row=>row.runId))
const failures=new Map()
for(const run of sample) {
  if(duplicates.has(run.runId)) continue
  let decision
  const start=Date.now()
  try {decision=await (mode==='predict'?predict(run):audit(run))}
  catch(error) {
    const reason=error.message.split('\n')[0]
    const normalized=/HTTP \d+/.exec(reason)?.[0]??reason
    const count=(failures.get(normalized)??0)+1
    failures.set(normalized,count)
    decision={reason}
  }
  const row={runId:run.runId,file:run.file,taskId:run.taskId,status:run.status,decisive:['pass','fail'].includes(run.status),
    calibration:calibrated(run),steps:run.started,completed:run.completed,credits:usable(run)?run.result.credits:null,
    ...(mode==='audit'?{knownFalsePass:knownFalse(run)?true:knownTrue(run)?false:null}:{}),...decision}
  rows.push(row)
  await saveJSON(journal,rows)
  console.log(mode,rows.length+'/'+sample.length,run.runId,row.p??row.flags??row.reason)
  if([...failures.values()].some(count=>count>=2)) break
  await delay(Math.max(0,1250-(Date.now()-start)))
}
let summary
if(mode==='predict') {
  const scored=rows.filter(row=>Number.isFinite(row.p) && ['pass','fail','inconclusive'].includes(row.status))
  const training=scored.filter(row=>row.calibration),holdout=scored.filter(row=>!row.calibration)
  const candidates=[.1,.2,.3,.4,.5,.6,.7,.8,.9]
  const held=holdout.filter(row=>Number.isFinite(row.predictedSteps) && row.steps>0)
  const average=training.filter(row=>row.steps>0)
  const baselineStepCount=average.reduce((sum,row)=>sum+row.steps,0)/(average.length||1)
  const mae=(predictor)=>held.length?held.reduce((sum,row)=>sum+Math.abs(predictor(row)-row.steps),0)/held.length:null
  const cutoff=Math.max(0,...candidates.filter(threshold=>impact(training,threshold).decisiveLost===0))
  summary={...provenance,attempted:rows.length,scored:scored.length,training:training.length,holdout:holdout.length,
    trainAuc:auc(training),heldoutAuc:auc(holdout),thresholdChosenWithoutDecisiveTrainingLoss:cutoff,
    trainImpact:impact(training,cutoff),heldoutImpact:impact(holdout,cutoff),sweep:candidates.map(threshold=>impact(holdout,threshold)),
    steps:{holdout:held.length,modelMAE:mae(row=>row.predictedSteps),meanStepBaseline:baselineStepCount,baselineMAE:mae(()=>baselineStepCount)}}
} else {
  const scored=rows.filter(row=>row.flags)
  const flagged=scored.filter(row=>row.flags.length)
  const labeled=scored.filter(row=>row.knownFalsePass!==null)
  const knownFlags=flagged.filter(row=>row.knownFalsePass!==null)
  summary={...provenance,eligible:auditPool.length,selected:sample.length,attempted:rows.length,scored:scored.length,flagged:flagged.length,
    labeled:labeled.length,knownFalsePasses:labeled.filter(row=>row.knownFalsePass).length,knownFlags:knownFlags.length,
    trueFlags:knownFlags.filter(row=>row.knownFalsePass).length,
    precision:knownFlags.length?knownFlags.filter(row=>row.knownFalsePass).length/knownFlags.length:null,
    tikfinity:scored.filter(row=>row.taskId==='v5-39c81de4ef43-33ae7f34')}
}
await saveJSON(path.join(directory,mode+'-summary.json'),{finishedAt:instant(),...summary})
console.log(JSON.stringify(summary,null,2))
