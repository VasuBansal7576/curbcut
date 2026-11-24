import path from 'node:path'
import {createHash} from 'node:crypto'
import {access,mkdir,readdir,readFile,writeFile} from 'node:fs/promises'
import {isDeepStrictEqual} from 'node:util'
import {ROOT,readJSON,saveJSON} from '../core/io.mjs'
import {catalog} from '../core/loop.mjs'
import {fixtureURL} from '../core/task.mjs'
import {archiveKane} from './kane-archive.mjs'
import {buildDashboard} from './dashboard.mjs'
import {publicMetrics} from './public-metrics.mjs'
const read=async(file,fallback)=>{try{return await readJSON(path.join(ROOT,file))}catch(e){if(e.code==='ENOENT')return fallback;throw e}}
const patchList=await catalog()
const recorded=patchList.filter(p=>['verified','broken','retired'].includes(p.status) && p.evidence.kaneRunIds)
const active=recorded.filter(p=>p.status==='verified')
const locallyVerified=patchList.filter(p=>p.status==='locally-verified')
const bundled=[...active,...locallyVerified]
const retired=patchList.filter(p=>p.status==='retired')
const shipped=[...bundled,...retired]
const isFixture=patch=>fixtureURL(new URL(patch.url??patch.match))
const fixtureRepairs=recorded.filter(isFixture)
const publicRepairs=recorded.filter(patch=>!isFixture(patch))
const labels={'keyboard-only':'Keyboard only','low-vision':'320px reflow','screen-reader-view':'Screen-reader view','color-blind':'Color simulation','low-contrast-simulation':'Low contrast sensitivity simulation','document-language':'Document language'}
const archive=await archiveKane()
const publicTasks=await Promise.all((await readdir(path.join(ROOT,'tasks/public/kane'))).filter(file=>file.endsWith('.json')).sort().map(file=>read('tasks/public/kane/'+file,null)))
await publicMetrics({patches:publicRepairs,kaneTasks:publicTasks,archive})
const [hardLocal,v5Local,v5Rerun,v5Sample,v6Local,v6Kane]=await Promise.all([
  'hard-v4/local-summary','heldout-v5/local-summary','heldout-v5/kane-rerun-50/summary',
  'heldout-v5/kane-sample-20/summary','heldout-v6/local-summary','heldout-v6/kane-summary'
].map(file=>readJSON(path.join(ROOT,'proof',file+'.json'))))
const knownRepairs=new Set(recorded.map(patch=>patch.id))
const openTasks=publicTasks.filter(task=>!knownRepairs.has(task.id)).flatMap(task=>{
  const runs=archive.filter(run=>run.taskId===task.id)
  if(!runs.length) return []
  const baseline=runs.findLast(run=>run.phase==='before')
  const latest=runs.findLast(run=>run.phase==='after')??baseline??runs.at(-1)
  const status=baseline?.status==='pass'?'Baseline passed':baseline?.status==='fail'?'Baseline failed · repair open':'Inconclusive'
  return [{site:new URL(task.url).hostname,task,latest,status}]
})
const corrections={
 setContrast:['1.4.3 Contrast (Minimum)','Set the measured color on this source selector.'],
 makeFocusable:['2.1.1 Keyboard','Use a native interactive element in the normal tab order.'],bindEnterToClick:['2.1.1 Keyboard','Prefer a native button with built-in keyboard activation.'],setRole:['4.1.2 Name, Role, Value','Choose a semantic HTML element matching the interaction.'],addLabel:['4.1.2 Name, Role, Value','Associate a persistent label with the control in the source.'],restoreFocusOutline:['2.4.7 Focus Visible','Style :focus-visible with a clearly visible outline.'],removeFocusTrap:['2.1.2 No Keyboard Trap','Provide a keyboard-operable close control and restore focus.'],setAltText:['1.1.1 Non-text Content','Supply appropriate alternative text in the source.'],injectCSS:['1.4.10 Reflow','Review the applied style in its layout context and fix the responsive stylesheet.'],extendTimeout:['2.2.1 Timing Adjustable','Provide user control over timing and warn before expiry.'],setLang:['3.1.1 Language of Page','Declare the correct language on the document element.'],
 mirrorHoverToFocus:['2.1.1 Keyboard','Expose the submenu to keyboard focus as well as pointer hover.'],
 mirrorHoverEventToFocus:['2.1.1 Keyboard','Open the submenu on keyboard focus and keep it open while focus stays inside.'],
 toggleOnActivate:['4.1.2 Name, Role, Value','Use a button to toggle the panel and announce its expanded state.'],
 arrowKeyNavigation:['2.1.1 Keyboard','Implement keyboard navigation among the widget controls.'],
 dialogBehavior:['2.4.3 Focus Order','Move focus into the dialog, contain focus, and return focus after dismissal.'],
 listboxBehavior:['4.1.2 Name, Role, Value','Prefer a native select or provide correctly named keyboard-operable options.']}
for(const patch of recorded) {
  const folder=path.join(ROOT,'evidence',patch.id)
  const videoLink=file=>path.relative(folder,path.join(ROOT,file)).split('/').map(encodeURIComponent).join('/')
  const recommendations=patch.rules.map(rule=>{
    const [criterion,source]=corrections[rule.action]
    if(['injectCSS','setContrast'].includes(rule.action)) {
      const contrast=Object.keys(rule.value).some(key=>key.includes('color'))
      return (contrast?'1.4.3 Contrast (Minimum)':criterion)+' — Review the source stylesheet at `'+rule.selector+'` with `'+Object.entries(rule.value).map(([k,v])=>k+': '+v).join('; ')+'`.'
    }
    const target=rule.selector??rule.trigger??rule.container??rule.dialog
    return criterion+' — '+source+' Target `'+target+'`'+(rule.value?' with value `'+rule.value+'`.':'.')
  })
  async function runLink(key,file,runId) {
    const observations=path.join(path.dirname(file),'result.json')
    const result=await readJSON(path.join(ROOT,observations))
    const logged=archive.find(run=>run.result===observations && run.sessionId===runId)
    const persona=key==='control'?'control':patch.persona
    const recordedPatch=result.inspection?.harness?.patchId??null
    const expected=key==='after' || key==='retirement' || !patch.evidence.localOracle?(key==='before'?'fail':'pass'):patch.evidence.kaneVerdicts?.[key]
    if(logged?.status!==expected || result.video!==file || (result.inspection?.harness?.persona!==persona && !(expected==='inconclusive' && !result.inspection)) || (key==='after'?recordedPatch!==null && recordedPatch!==patch.id:recordedPatch!==null)) throw new Error('Invalid Kane '+key+' evidence for '+patch.id)
    await Promise.all([file,result.evidencePack].map(asset=>access(path.join(ROOT,asset))))
    const pack=' · [Kane evidence pack]('+videoLink(result.evidencePack)+')'
    return '- ['+key+' recording]('+videoLink(file)+') · [Run result]('+videoLink(observations)+')'+pack+' · Kane session '+runId+' · Kane verdict '+logged.status+(patch.evidence.localOracle?' · local oracle '+patch.evidence.localOracle[key==='retirement'?'before':key]:'')
  }
  const phases=await Promise.all(['before','control','after'].map((key,index)=>runLink(key,patch.evidence[key],patch.evidence.kaneRunIds[index])))
  const rechecks=await Promise.all(patch.history.filter(entry=>entry.event==='retired').map(entry=>runLink('retirement',entry.video,entry.runId)))
  const localRetirements=patch.history.filter(entry=>entry.event==='local-retired' && entry.evidence).map(entry=>
    '- [Local regression and retirement]('+videoLink(entry.evidence)+') · '+entry.reason)
  let proposal
  if(patch.evidence.repairMethod) {
    const attempt=path.dirname(path.dirname(patch.evidence.after))
    const provenancePath=attempt+'/provenance.json'
    const provenance=await read(provenancePath,null)
    const candidate=await read(attempt+'/candidate.json',null)
    const before=provenance?.sourceLocalRun && await read(provenance.sourceLocalRun,null)
    const after=provenance?.repairDirectory && await read(provenance.repairDirectory+'/after.json',null)
    const pointer=provenance?.repairDirectory && await read(provenance.repairDirectory+'/control-with-patch.json',null)
    if(before?.runner!=='playwright' || before.status!=='fail' || after?.runner!=='playwright' || after.status!=='pass' ||
      pointer?.runner!=='playwright' || pointer.status!=='pass' || !isDeepStrictEqual(candidate?.rules,patch.rules) ||
      !isDeepStrictEqual(candidate?.evidence?.repairMethod,patch.evidence.repairMethod)) {
      throw new Error('Unconfirmed local repair '+patch.id)
    }
    proposal='[Local failure]('+videoLink(provenance.sourceLocalRun)+') · [Local replay]('+videoLink(provenance.repairDirectory+'/after.json')+
      ') · [Repair provenance]('+videoLink(provenancePath)+')'
    const runDirectory=path.dirname(attempt)
    const runtimeAgent=['full-agent','agent-diff'].includes(patch.evidence.repairMethod) &&
      provenance.sourceLocalRun===path.join(runDirectory,'local','before.json')
    if(runtimeAgent) {
      const agentFile=path.join(provenance.repairDirectory,'candidate.json')
      const agentPatch=await read(agentFile,null)
      const agentProvenance=await read(path.join(provenance.repairDirectory,'provenance.json'),null)
      if(path.dirname(provenance.repairDirectory)!==path.join(runDirectory,'local') ||
        !['grok','codex exec'].includes(agentProvenance?.writer) || !isDeepStrictEqual(agentPatch?.rules,patch.rules)) {
        throw new Error('Unconfirmed runtime agent proposal for '+patch.id)
      }
      proposal+=' · [Agent proposal]('+videoLink(agentFile)+')'
    }
  } else if(patch.evaluation) {
    const measured=v6Local?.rows.find(row=>row.id===patch.id && row.status==='locally-fixed')
    const recorded=v6Kane?.cases.find(row=>row.id===patch.id && row.verified)
    const measurement=patch.evidence.localMeasurement
    const artifact='proof/heldout-v6/release/'+patch.id+'.json'
    const shipped='patches/'+patch.id+'.json'
    const [source,live]=await Promise.all([artifact,shipped].map(file=>readFile(path.join(ROOT,file))))
    if(!measured || !recorded || !source.equals(live) || !isDeepStrictEqual(measured.patch.rules,patch.rules) ||
      patch.history[0]?.frozenCommit!==v6Local.frozenCommit ||
      createHash('sha256').update(JSON.stringify(measured.patch)).digest('hex')!==patch.history[0]?.candidateSha256) {
      throw new Error('Unconfirmed frozen v6 repair '+patch.id)
    }
    if(!await read(measurement,null)) throw new Error('Missing v6 measurement for '+patch.id)
    proposal='[Frozen local measurements and proposal]('+videoLink(measurement)+') · [Archived release bytes]('+videoLink(artifact)+')'
  } else {
    const attempt=path.dirname(path.dirname(patch.evidence.after))
    const proposalPaths=[attempt+'/provenance.json',attempt+'/retry/provenance.json']
    const rerunCase=v5Rerun?.cases.find(row=>row.id===patch.id && row.kaneVerified &&
      v5Rerun.runs.some(run=>run.id===patch.id && run.phase==='after' && run.recording===patch.evidence.after))
    if(rerunCase) proposalPaths.push('proof/heldout-v5/kane/'+patch.id+'/attempt-1/provenance.json')
    const provenancePath=(await Promise.all(proposalPaths.map(async file=>await read(file,null)?file:null))).find(Boolean)
    if(!provenancePath) throw new Error('Missing proposal provenance for '+patch.id)
    const provenance=await read(provenancePath,null)
    const candidate=path.join(path.dirname(provenancePath),'candidate.json')
    const agentCandidate=provenance.priorAgentProposal??candidate
    const agentPatch=await read(agentCandidate,null)
    const sampleCase=v5Sample?.cases.find(row=>row.id===patch.id && row.kaneVerified &&
      row.runs.some(run=>run.phase==='after' && run.recording===patch.evidence.after))
    const storedCandidate='patches/'+patch.id+'/candidate.json'
    if(sampleCase) {
      const [original,shipped]=await Promise.all([agentCandidate,storedCandidate].map(file=>readFile(path.join(ROOT,file))))
      const withEvidence={...agentPatch,status:patch.status,evidence:patch.evidence,history:patch.history}
      if(agentCandidate!==sampleCase.candidateFile || !original.equals(shipped) ||
        createHash('sha256').update(shipped).digest('hex')!==sampleCase.candidateSha256 ||
        !isDeepStrictEqual(patch,withEvidence)) throw new Error('Sample proposal changed for '+patch.id)
    }
    if(rerunCase && (agentCandidate!==rerunCase.candidateFile ||
      createHash('sha256').update(JSON.stringify(agentPatch)).digest('hex')!==rerunCase.patchSha256)) throw new Error('Kane rerun proposal changed for '+patch.id)
    const agentProvenance=await read(path.join(path.dirname(agentCandidate),'provenance.json'),null)
    const source=archive.find(run=>run.taskId===patch.id && run.sessionId===agentProvenance?.sourceRunId)
    const sourceLocalRun=provenance.sourceLocalRun
    const localFailure=sourceLocalRun && await read(sourceLocalRun,null)
    const localSource=localFailure?.runner==='playwright' && localFailure.status==='fail' && [hardLocal,v5Local].some(cohort=>
      cohort && provenance.registrationBlob===cohort.registered.blob && cohort.results.some(row=>
        row.task.id===patch.id && row.status==='locally-fixed' && row.phases.some(phase=>phase.name==='before' && phase.file===sourceLocalRun)))
    const kaneSource=!sourceLocalRun && source?.status===(patch.evidence.localOracle?patch.evidence.kaneVerdicts?.before:'fail')
    if(!['codex exec','grok'].includes(agentProvenance?.writer) || (!localSource && !kaneSource) ||
      !isDeepStrictEqual((await read(candidate,null))?.rules,patch.rules) ||
      !isDeepStrictEqual(agentPatch?.rules,patch.rules)) throw new Error('Unconfirmed agent proposal for '+patch.id)
    proposal='[Runtime repair proposal]('+videoLink(agentCandidate)+') · [Repair provenance]('+videoLink(provenancePath)+') · '+
      (sampleCase?'[Frozen catalog candidate]('+videoLink(storedCandidate)+') · ':'')+
      (localSource?'[Local Playwright failure]('+videoLink(sourceLocalRun)+')':'Failure session '+source.sessionId)
  }
  const report=['# '+patch.site,patch.task,'**Persona** '+patch.persona,'**Observed barrier** '+patch.barrier,'**Patch status** '+patch.status,'## Recorded runs',...phases,...rechecks,...localRetirements,proposal,'## Source repair and relevant WCAG criteria','A passing task captures one interaction under the recorded conditions.',...recommendations.map(r=>'- '+r),'Verified '+patch.evidence.verifiedAt].join('\n\n')
  await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'report.md'),report+'\n')
}
for(const patch of locallyVerified.filter(patch=>patch.evidence.verificationPolicy?.mode==='local-sample-bypass')) {
  const record=await read(patch.evidence.localMeasurement,null)
  const phases=await Promise.all((record?.phases??[]).map(async phase=>{
    const result=await read(phase.file,null)
    return {...phase,status:result?.runner==='playwright'?result.status:null}
  }))
  const after=phases.find(phase=>phase.name.endsWith('/after') && phase.status==='pass' &&
    phases.some(pointer=>pointer.name===phase.name.replace(/after$/,'control-with-patch') && pointer.status==='pass'))
  if(record?.id!==patch.id || !isDeepStrictEqual(record.rules,patch.rules) ||
    !isDeepStrictEqual(record.policy,patch.evidence.verificationPolicy) || !after ||
    !phases.some(phase=>phase.name==='before' && phase.status==='fail') ||
    !phases.some(phase=>phase.name==='control' && phase.status==='pass')) throw new Error('Unconfirmed sampled repair '+patch.id)
}
await saveJSON(path.join(ROOT,'patches/index.json'),shipped)
await saveJSON(path.join(ROOT,'extension/bundled.json'),shipped)
const md=value=>String(value??'').replaceAll('|','\\|').replace(/\s+/g,' ').trim()
const runReference=(id,video)=>id?'['+id+'](../../'+path.dirname(video)+'/result.json)':'—'
const runRow=patch=>{
  const site=isFixture(patch)?'Stillroom fixture':patch.site
  const phases=['before','control','after'].map((phase,index)=>runReference(patch.evidence.kaneRunIds[index],patch.evidence[phase]))
  const retired=patch.history.findLast(entry=>entry.event==='retired')
  return '| '+[md(site),'['+patch.id+'](../../evidence/'+patch.id+'/report.md)',md(labels[patch.persona]),...phases,runReference(retired?.runId,retired?.video)].join(' | ')+' |'
}
const openRows=openTasks.map(({site,task,latest,status})=>'| '+[md(site),task.id,status,md(latest.reason),latest.sessionId?'['+latest.sessionId+'](../../'+latest.result+')':'—'].join(' | ')+' |')
const runTable=[
  '| Site | Task | Persona | Before · fail | Control · pass | With repair · pass | Unpatched retirement · pass |',
  '| --- | --- | --- | --- | --- | --- | --- |'
]
const archiveReport=[
  '# Kane proof',
  '',
  'The [session ledger](ledger.json) lists every archived Kane task result, including control runs, incomplete attempts and later rechecks. Each published repair links to its runtime proposal and evidence packs.',
  '',
  '## Verified fixture repairs',
  '',
  ...runTable,
  ...fixtureRepairs.map(runRow),
  '',
  '## Verified public repairs',
  '',
  ...runTable,
  ...publicRepairs.map(runRow),
  '',
  '## Public tasks without a published repair',
  '',
  '| Site | Task | Baseline | Most recent repair finding | Kane session |',
  '| --- | --- | --- | --- | --- |',
  ...openRows,
  '',
  'The [extension toggle](extension-toggle/toggle.json) records installed Chrome behavior locally. The [local fixture](../local.json), [local public replays](../public.json), [keyboard scouting](../scouting-keyboard.json), and [open local keyboard findings](../local-keyboard-findings.json) have their own records.',
  ''
].join('\n')
await writeFile(path.join(ROOT,'proof/kane/README.md'),archiveReport)
await buildDashboard({bundled,v5Local,v5Sample,v6Local,v6Kane})
console.log(`Built dashboard: ${bundled.length} fixes · ${active.length} Kane-verified · ${locallyVerified.length} with local proof`)
