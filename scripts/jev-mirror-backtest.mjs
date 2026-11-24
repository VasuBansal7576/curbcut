import {access,mkdir,readFile,rm,stat,writeFile} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {createHash} from 'node:crypto'
import {jevKey} from '../core/jev.mjs'
import {imageAsset,noul} from '../core/jev-policy.js'
import {instant,readJSON,saveJSON,ROOT} from '../core/io.mjs'

const endpoint='https://api.typesafe.ai/v1/systemone'
const outDir=path.join(ROOT,'proof/jev/mirror-backtest')
const frameRoot=process.env.CURBCUT_MIRROR_FRAMES || '/tmp/curbcut-mirror-frames'
const splitFile=path.join(outDir,'split.json')
const journalFile=path.join(outDir,'journal.json')
const resultsFile=path.join(outDir,'results.json')
const paceMs=700
const requestTimeoutMs=60000

const phrasings={
  sameOutcome:{
    id:'sameOutcome',
    instructions:'Does image B show the same outcome the task asks for as image A (same panel, menu, dialog or destination open and reachable)?',
    true:'The same task outcome is visibly achieved in both frames (same panel, menu, dialog, destination, or equivalent completed state).',
    false:'The frames show different outcomes, or B has not reached the outcome visible in A.'
  },
  sameReachableState:{
    id:'sameReachableState',
    instructions:'Ignoring input method chrome, does image B show the keyboard user in the same reachable end state as the mouse user in image A for this task?',
    true:'Both frames show the required destination or control state open and reachable.',
    false:'B is stuck, missing the destination, or shows a different page state than A.'
  },
  taskCompleteMatch:{
    id:'taskCompleteMatch',
    instructions:'Did both sessions complete the stated task to visually equivalent end states?',
    true:'Both end frames display the completed task outcome in an equivalent way.',
    false:'Only one frame shows completion, or the completed states differ.'
  }
}

const stripUrls=value=>String(value??'').replace(/\bhttps?:\/\/[^\s<>"']+/g,address=>{
  try {const url=new URL(address);return url.origin+url.pathname} catch {return '[address]'}
})

async function exists(file) {
  try {await access(file);return true} catch {return false}
}

function run(command,args) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{stdio:['ignore','pipe','pipe']})
    const chunks=[],errors=[]
    child.stdout.on('data',chunk=>chunks.push(chunk))
    child.stderr.on('data',chunk=>errors.push(chunk))
    child.on('error',reject)
    child.on('close',code=>code===0?resolve(Buffer.concat(chunks)):reject(new Error(Buffer.concat(errors).toString('utf8').split('\n')[0]||command+' failed')))
  })
}

async function extractFrame(video,destination,seek='final') {
  await mkdir(path.dirname(destination),{recursive:true})
  if(await exists(destination) && (await stat(destination)).size>1000) return destination
  const args=seek==='earlier'
    ?['-y','-sseof','-1.2','-i',path.join(ROOT,video),'-frames:v','1','-vf','scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2','-q:v','4',destination]
    :['-y','-sseof','-0.05','-i',path.join(ROOT,video),'-frames:v','1','-vf','scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2','-q:v','4',destination]
  await run('ffmpeg',args)
  return destination
}

function framePath(recording,kind) {
  const id=createHash('sha1').update(recording+'|'+kind).digest('hex').slice(0,20)
  return path.join(frameRoot,id+'-'+kind+'.jpg')
}

async function askMirror(key,objective,imageA,imageB,phrasing) {
  const a=imageAsset('data:image/jpeg;base64,'+imageA.toString('base64'))
  const b=imageAsset('data:image/jpeg;base64,'+imageB.toString('base64'))
  const body={
    model:'jev-latest',
    state:{
      objective:stripUrls(objective).slice(0,2200),
      imageA:a.id,
      imageB:b.id,
      note:'Image A is the mouse-control end frame. Image B is the keyboard end frame.'
    },
    assets:{[a.id]:a.asset,[b.id]:b.asset},
    questions:{
      same:noul(phrasing.instructions,phrasing.true,phrasing.false)
    }
  }
  const start=performance.now()
  const response=await fetch(endpoint,{
    method:'POST',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(requestTimeoutMs),
    headers:{
      Authorization:'Bearer '+key,
      'Content-Type':'application/json',
      'TypeSafe-Danger-Zone-Images':'true',
      'TypeSafe-Danger-Zone-Long-Context':'true'
    },
    body:JSON.stringify(body)
  })
  const providerMs=Math.round(performance.now()-start)
  if(!response.ok) throw new Error('Jev request failed with HTTP '+response.status+'.')
  const payload=await response.json()
  return {
    p:payload.answers?.same?.noul??null,
    model:payload.model??null,
    providerMs,
    usage:payload.usage??null
  }
}

function auc(rows) {
  const yes=rows.filter(row=>row.truth==='same' && Number.isFinite(row.p))
  const no=rows.filter(row=>row.truth==='different' && Number.isFinite(row.p))
  const pairs=yes.length*no.length
  if(!pairs) return null
  return yes.reduce((sum,a)=>sum+no.reduce((n,b)=>n+(a.p>b.p?1:a.p===b.p?0.5:0),0),0)/pairs
}

function metrics(rows,threshold) {
  const scored=rows.filter(row=>Number.isFinite(row.p))
  const positives=scored.filter(row=>row.truth==='same')
  const predicted=scored.filter(row=>row.p>=threshold)
  const truePositive=predicted.filter(row=>row.truth==='same').length
  const falsePositive=predicted.filter(row=>row.truth==='different').length
  return {
    threshold,
    scored:scored.length,
    positives:positives.length,
    negatives:scored.length-positives.length,
    predictedSame:predicted.length,
    truePositive,
    falsePositive,
    falseNegative:positives.length-truePositive,
    precision:predicted.length?truePositive/predicted.length:null,
    recall:positives.length?truePositive/positives.length:null,
    auroc:auc(scored)
  }
}

function chooseThreshold(rows) {
  const scores=[...new Set(rows.map(row=>row.p).filter(Number.isFinite))].sort((a,b)=>a-b)
  const grid=[...new Set([0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.4,0.45,0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,...scores])].sort((a,b)=>a-b)
  const sweep=grid.map(threshold=>metrics(rows,threshold))
  const eligible=sweep.filter(row=>row.precision!=null && row.precision>=0.95 && row.recall!=null)
  const selected=eligible.sort((a,b)=>(b.recall-a.recall)||(b.precision-a.precision)||(a.threshold-b.threshold))[0]
    ||sweep.filter(row=>row.precision!=null).sort((a,b)=>(b.precision-a.precision)||(b.recall-a.recall)||(a.threshold-b.threshold))[0]
    ||sweep.at(-1)
  return {selected,sweep,developmentGate:Boolean(selected && selected.precision>=0.95 && selected.recall>=0.5)}
}

function scorePhrasing(rows) {
  const {selected,sweep,developmentGate}=chooseThreshold(rows)
  return {selected,sweep,developmentGate,auroc:auc(rows)}
}

async function loadJournal() {
  return readJSON(journalFile).catch(error=>{
    if(error.code!=='ENOENT') throw error
    return {checkedAt:null,frozenPhrasing:null,frozenThreshold:null,rows:[]}
  })
}

const key=await jevKey()
if(!key) throw new Error('Jev is not configured.')
const split=await readJSON(splitFile)
const usable=split.pairs.filter(pair=>pair.usable)
const journal=await loadJournal()
const rows=new Map(journal.rows.map(row=>[row.key,row]))
const failures=new Map()

await mkdir(frameRoot,{recursive:true})
await mkdir(outDir,{recursive:true})

async function ensureFrames(pair) {
  const controlFinal=framePath(pair.control.recording,'control-final')
  const compareFinal=framePath(pair.compare.recording,'compare-final')
  const controlEarlier=framePath(pair.control.recording,'control-earlier')
  const compareEarlier=framePath(pair.compare.recording,'compare-earlier')
  await extractFrame(pair.control.recording,controlFinal,'final')
  await extractFrame(pair.compare.recording,compareFinal,'final')
  await extractFrame(pair.control.recording,controlEarlier,'earlier').catch(()=>null)
  await extractFrame(pair.compare.recording,compareEarlier,'earlier').catch(()=>null)
  return {controlFinal,compareFinal}
}

async function scorePair(pair,phrasing) {
  const keyName=pair.id+'|'+phrasing.id
  if(rows.has(keyName) && Number.isFinite(rows.get(keyName).p)) return rows.get(keyName)
  const start=Date.now()
  let record
  try {
    const frames=await ensureFrames(pair)
    const imageA=await readFile(frames.controlFinal)
    const imageB=await readFile(frames.compareFinal)
    const decision=await askMirror(key,pair.objective,imageA,imageB,phrasing)
    record={
      key:keyName,
      pairId:pair.id,
      phrasing:phrasing.id,
      split:pair.split,
      kind:pair.kind,
      truth:pair.truth,
      cohort:pair.cohort,
      runRoot:pair.runRoot,
      objective:stripUrls(pair.objective).slice(0,500),
      controlRecording:pair.control.recording,
      compareRecording:pair.compare.recording,
      comparePhase:pair.compare.phase,
      p:decision.p,
      model:decision.model,
      providerMs:decision.providerMs,
      usage:decision.usage,
      error:null,
      at:instant()
    }
  } catch(error) {
    const reason=String(error.message||error).split('\n')[0]
    failures.set(reason,(failures.get(reason)??0)+1)
    record={
      key:keyName,
      pairId:pair.id,
      phrasing:phrasing.id,
      split:pair.split,
      kind:pair.kind,
      truth:pair.truth,
      cohort:pair.cohort,
      runRoot:pair.runRoot,
      objective:stripUrls(pair.objective).slice(0,500),
      controlRecording:pair.control.recording,
      compareRecording:pair.compare.recording,
      comparePhase:pair.compare.phase,
      p:null,
      model:null,
      providerMs:null,
      usage:null,
      error:reason,
      at:instant()
    }
  }
  rows.set(keyName,record)
  if(rows.size%5===0) {
    journal.rows=[...rows.values()]
    journal.checkedAt=instant()
    await saveJSON(journalFile,journal)
    console.log('scored',rows.size,'latest',record.pairId,record.phrasing,record.p,record.error||'ok')
  }
  if([...failures.values()].some(count=>count>=2)) throw new Error('Repeated failure: '+[...failures.entries()].filter(([,n])=>n>=2).map(([m])=>m).join(' | '))
  await delay(Math.max(0,paceMs-(Date.now()-start)))
  return record
}

const development=usable.filter(pair=>pair.split==='development')
const test=usable.filter(pair=>pair.split==='test')
const phrasingOrder=[phrasings.sameOutcome,phrasings.sameReachableState,phrasings.taskCompleteMatch]

let frozenPhrasing=journal.frozenPhrasing?phrasings[journal.frozenPhrasing]:null
let frozenThreshold=journal.frozenThreshold
const developmentTrials=[]

if(!frozenPhrasing) {
  for(const phrasing of phrasingOrder) {
    console.log('development phrasing',phrasing.id,development.length)
    for(const pair of development) await scorePair(pair,phrasing)
    const scored=development.map(pair=>rows.get(pair.id+'|'+phrasing.id)).filter(Boolean)
    const summary=scorePhrasing(scored)
    developmentTrials.push({
      phrasing:phrasing.id,
      instructions:phrasing.instructions,
      scored:scored.filter(row=>Number.isFinite(row.p)).length,
      errors:scored.filter(row=>row.error).length,
      selected:summary.selected,
      developmentGate:summary.developmentGate,
      auroc:summary.auroc,
      sweep:summary.sweep.filter(row=>row.predictedSame>0 || row.threshold%0.1<1e-9)
    })
    journal.rows=[...rows.values()]
    journal.developmentTrials=developmentTrials
    journal.checkedAt=instant()
    await saveJSON(journalFile,journal)
    if(summary.developmentGate) {
      frozenPhrasing=phrasing
      frozenThreshold=summary.selected.threshold
      break
    }
  }
  if(!frozenPhrasing) {
    const ranked=[...developmentTrials].sort((a,b)=>{
      const ap=a.selected?.precision??-1,bp=b.selected?.precision??-1
      const ar=a.selected?.recall??-1,br=b.selected?.recall??-1
      return (bp-ap)||(br-ar)||((b.auroc??-1)-(a.auroc??-1))
    })[0]
    frozenPhrasing=phrasings[ranked.phrasing]
    frozenThreshold=ranked.selected?.threshold??0.5
  }
  journal.frozenPhrasing=frozenPhrasing.id
  journal.frozenThreshold=frozenThreshold
  journal.rows=[...rows.values()]
  journal.checkedAt=instant()
  await saveJSON(journalFile,journal)
}

console.log('frozen',frozenPhrasing.id,'threshold',frozenThreshold)
console.log('test pairs',test.length)
for(const pair of test) await scorePair(pair,frozenPhrasing)

journal.rows=[...rows.values()]
journal.frozenPhrasing=frozenPhrasing.id
journal.frozenThreshold=frozenThreshold
journal.checkedAt=instant()
await saveJSON(journalFile,journal)

const testRows=test.map(pair=>rows.get(pair.id+'|'+frozenPhrasing.id)).filter(Boolean)
const developmentRows=development.map(pair=>rows.get(pair.id+'|'+frozenPhrasing.id)).filter(Boolean)
const testMetrics=metrics(testRows,frozenThreshold)
const developmentMetrics=metrics(developmentRows,frozenThreshold)
const testSweepFull=chooseThreshold(testRows).sweep
const usefulBarMet=testSweepFull.some(row=>row.precision!=null && row.precision>=0.95 && row.recall!=null && row.recall>=0.5)
const bestPrecisionAtRecall50=testSweepFull.filter(row=>row.recall!=null && row.recall>=0.5).sort((a,b)=>(b.precision??-1)-(a.precision??-1))[0]||null
const killAtFrozen=testMetrics.precision!=null && testMetrics.recall!=null && testMetrics.recall>=0.5 && testMetrics.precision<0.95
const killTriggered=killAtFrozen || (!usefulBarMet && Boolean(bestPrecisionAtRecall50 && bestPrecisionAtRecall50.precision<0.95))

const tokenRows=[...rows.values()].filter(row=>row.usage)
function usagePrompt(usage){return usage?.prompt_tokens??usage?.input_tokens??usage?.prompt??0}
function usageCompletion(usage){return usage?.completion_tokens??usage?.output_tokens??usage?.completion??0}
function usageTotal(usage){return usage?.total_tokens??usage?.total??(usagePrompt(usage)+usageCompletion(usage))}
const tokens={
  requestsWithUsage:tokenRows.length,
  prompt:tokenRows.reduce((sum,row)=>sum+usagePrompt(row.usage),0),
  completion:tokenRows.reduce((sum,row)=>sum+usageCompletion(row.usage),0),
  total:tokenRows.reduce((sum,row)=>sum+usageTotal(row.usage),0),
  rawSample:tokenRows[0]?.usage??null
}

const abstention=[0.35,0.4,0.45,0.5].map(low=>{
  const high=1-low>low?1-low:low+0.1
  const decided=testRows.filter(row=>Number.isFinite(row.p) && (row.p<low || row.p>high))
  const band=testRows.filter(row=>Number.isFinite(row.p) && row.p>=low && row.p<=high)
  return {
    abstainIfBetween:[low,high],
    abstained:band.length,
    decided:decided.length,
    precision:metrics(decided,frozenThreshold).precision,
    recall:metrics(decided,frozenThreshold).recall
  }
})

function failuresFor(list) {
  return list.filter(row=>Number.isFinite(row.p)).flatMap(row=>{
    const predicted=row.p>=frozenThreshold?'same':'different'
    if(predicted===row.truth) return []
    return [{
      pairId:row.pairId,
      truth:row.truth,
      predicted,
      p:row.p,
      cohort:row.cohort,
      runRoot:row.runRoot,
      comparePhase:row.comparePhase,
      objective:row.objective
    }]
  })
}

const results={
  checkedAt:instant(),
  protocolCommit:'c6851010ce9f6e3ac6fa193bc379f5d3047eec6b',
  killCriterion:'Fail if test precision of same is below 95% at recall of 50% or more.',
  killTriggered,
  ideaSurvives:!killTriggered,
  usefulBarMet,
  testOperatingRegion:{
    bestPrecisionAtRecallAtLeast50:bestPrecisionAtRecall50,
    usefulBarMet
  },
  recommendation:killTriggered
    ?'Do not build the in-tab mirror test. Jev does not separate same vs different end states reliably enough on the held-out archive.'
    :'Mirror test remains eligible under the kill rule; re-check before shipping.',
  frozenPhrasing:{
    id:frozenPhrasing.id,
    instructions:frozenPhrasing.instructions,
    true:frozenPhrasing.true,
    false:frozenPhrasing.false
  },
  frozenThreshold,
  counts:{
    inventory:split.counts,
    developmentUsable:development.length,
    testUsable:test.length,
    developmentScored:developmentRows.filter(row=>Number.isFinite(row.p)).length,
    testScored:testRows.filter(row=>Number.isFinite(row.p)).length
  },
  developmentTrials:journal.developmentTrials||developmentTrials,
  development:developmentMetrics,
  test:testMetrics,
  testSweep:testSweepFull.filter(row=>row.threshold%0.05<1e-9 || row.threshold===frozenThreshold),
  abstentionBand:abstention,
  tokens,
  failureExamples:{
    development:failuresFor(developmentRows).slice(0,12),
    test:failuresFor(testRows).slice(0,20)
  },
  rows:{
    development:developmentRows,
    test:testRows
  }
}

await saveJSON(resultsFile,results)

const pct=value=>value==null?'—':(value*100).toFixed(1)+'%'
const aurocText=value=>value==null?'—':Number(value).toFixed(3)
const readme=`# Mirror-test Jev backtest

Can Jev tell whether a keyboard end frame matches a mouse end frame for the same accessibility task?

## Kill criterion

The idea fails if test-split precision of \`same\` is below 95% at a recall of 50% or more.

## Result

${killTriggered?'**Kill criterion met. Do not build the in-tab mirror test.**':'Kill criterion not met at the frozen threshold.'}

| Split | Usable pairs | Scored | Precision of same | Recall of same | AUROC |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development | ${development.length} | ${results.counts.developmentScored} | ${pct(developmentMetrics.precision)} | ${pct(developmentMetrics.recall)} | ${aurocText(developmentMetrics.auroc)} |
| Test | ${test.length} | ${results.counts.testScored} | ${pct(testMetrics.precision)} | ${pct(testMetrics.recall)} | ${aurocText(testMetrics.auroc)} |

Frozen phrasing: \`${frozenPhrasing.id}\`  
Frozen threshold: **${frozenThreshold}**  
Jev usage: **${tokens.prompt}** input tokens, **${tokens.completion}** output tokens, **${tokens.total}** total across ${tokens.requestsWithUsage} requests.

## Method

Protocol and split were committed before any Jev call. Labels come from archived Kane phases: control pass is the mouse reference; after pass is a positive \`same\` pair; before fail is a negative \`different\` pair. Final frames were extracted with ffmpeg outside the repository and deleted after scoring. Zero Kane credits.

## Files

- [protocol.md](protocol.md)
- [split.json](split.json)
- [results.json](results.json)
- [journal.json](journal.json)
`

await writeFile(path.join(outDir,'README.md'),readme)
console.log(JSON.stringify({
  frozenPhrasing:frozenPhrasing.id,
  frozenThreshold,
  development:developmentMetrics,
  test:testMetrics,
  killTriggered,
  tokens
},null,2))

await rm(frameRoot,{recursive:true,force:true}).catch(()=>{})
console.log('removed',frameRoot)
