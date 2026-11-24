import path from 'node:path'
import {createHash} from 'node:crypto'
import {access,mkdir,readdir,writeFile} from 'node:fs/promises'
import {isDeepStrictEqual} from 'node:util'
import {ROOT,readJSON,saveJSON} from '../core/io.mjs'
import {catalog} from '../core/loop.mjs'
import {fixtureURL} from '../core/task.mjs'
import {archiveKane} from './kane-archive.mjs'
import {publicMetrics} from './public-metrics.mjs'
const read=async(file,fallback)=>{try{return await readJSON(path.join(ROOT,file))}catch(e){if(e.code==='ENOENT')return fallback;throw e}}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const patchList=await catalog()
const recorded=patchList.filter(p=>['verified','broken','retired'].includes(p.status))
const active=recorded.filter(p=>p.status==='verified')
const isFixture=patch=>fixtureURL(new URL(patch.url??patch.match))
const fixtureRepairs=recorded.filter(isFixture)
const publicRepairs=recorded.filter(patch=>!isFixture(patch))
const local=(await read('proof/local.json',{runs:[]})).runs
const scout=(await read('proof/scouting.json',{sites:[]})).sites
const publicRuns=(await read('proof/public.json',{runs:[]})).runs.filter(r=>r.status==='locally-reproduced')
const labels={'keyboard-only':'Keyboard only','low-vision':'320px reflow','screen-reader-view':'Screen-reader view','color-blind':'Color simulation'}
const url=file=>'../'+file.split('/').map(encodeURIComponent).join('/')
const archive=await archiveKane()
const publicTasks=await Promise.all((await readdir(path.join(ROOT,'tasks/public/kane'))).filter(file=>file.endsWith('.json')).sort().map(file=>read('tasks/public/kane/'+file,null)))
const counts=await publicMetrics({patches:publicRepairs,kaneTasks:publicTasks,archive})
const [rechecked,heldout,heldoutV2,heldoutV3,live,hardScout,hardLocal,hardKane,localRecheck,v5Scout,v5Local,v5Kane,v5Rerun,extensionAudit,nightly]=await Promise.all([
  read('proof/recheck/summary.json',null),
  read('proof/heldout/summary.json',null),
  read('proof/heldout-v2/summary.json',null),
  read('proof/heldout-v3/summary.json',null),
  read('proof/live/live-loop.json',null),
  read('proof/hard-v4/scouting.json',null),
  read('proof/hard-v4/local-summary.json',null),
  read('proof/hard-v4/kane-summary.json',null),
  read('proof/hard-v4/regression-summary.json',null),
  read('proof/heldout-v5/scouting.json',null),
  read('proof/heldout-v5/local-summary.json',null),
  read('proof/heldout-v5/kane-summary.json',null),
  read('proof/heldout-v5/kane-rerun-50/summary.json',null),
  read('proof/reliability/extension-e2e.json',null),
  read('proof/reliability/nightly.json',null)
])
const hardClasses={1:'Hover navigation',2:'Disclosures',3:'Tabs and carousels',4:'Modal dialogs',5:'Custom listboxes',6:'Other multi-step journeys'}
const scoreCell=score=>score?score.fixed+' / '+score.total:'0 / 0'
const compareRows=(groups,current,prior)=>Object.entries(groups).map(([key,label])=>
  '<tr><th scope="row">'+esc(label)+'</th><td>'+scoreCell(prior[key])+'</td><td>'+scoreCell(current[key])+'</td></tr>').join('')
const comparisonTable=(caption,title,rows)=>'<table><caption>'+caption+'</caption><thead><tr><th scope="col">'+title+
  '</th><th scope="col">V4 fixed / registered</th><th scope="col">V5 fixed / registered</th></tr></thead><tbody>'+rows+'</tbody></table>'
const v5Classes={...hardClasses,'single-control':'Single-control objectives'}
const v5Personas=Object.fromEntries(Object.entries(labels).filter(([persona])=>v5Local?.byPersona[persona]))
const v5Section=v5Scout && v5Local?'<section class="section"><h2>Held-out v5</h2><p><strong>'+v5Local.fixed+' / '+v5Local.total+
  ' tasks repaired in local Playwright</strong> across '+v5Scout.summary.attempted.toLocaleString('en-US')+' scouted sites.</p>'+
  (v5Kane?'<p>In the original study, Kane verified '+v5Kane.fixed+' / '+v5Kane.selected+' selected, with '+v5Kane.started+' started. Before and after verdicts agreed on '+
    v5Kane.agreement.matched+' / '+v5Kane.agreement.paired+' assessed pairs. '+v5Kane.spent+' credits used.</p>':'')+
  (v5Rerun?'<p>The 50-step Kane rerun verified '+v5Rerun.kaneVerified+' / '+v5Rerun.cases.length+' cases.</p>':'')+
  comparisonTable('Local repairs by barrier','Barrier',compareRows(v5Classes,v5Local.byClass,v5Local.v4.byClass))+
  comparisonTable('Local repairs by persona','Persona',compareRows(v5Personas,v5Local.byPersona,v5Local.v4.byPersona))+
  '<p><a href="../proof/heldout-v5/README.md">Read the registration, results, and session evidence</a></p></section>':''
const hardRows=hardLocal?Object.entries(hardLocal.byClass).filter(([kind])=>hardClasses[kind]).map(([kind,score])=>{
  const kane=hardKane?.results.filter(row=>row.task.barrierClass===Number(kind) && row.phases.some(phase=>phase.runner==='kane'))
  return '<tr><th scope="row">'+hardClasses[kind]+'</th><td>'+score.fixed+' / '+score.total+'</td><td>'+
    (kane?.length?kane.filter(row=>row.status==='verified').length+' / '+kane.length:'—')+'</td></tr>'
}).join(''):''
const hardSection=v5Section || (hardScout && hardLocal?'<section class="section"><h2>Hard accessibility barriers</h2><p>'+
  hardScout.summary.sites+' preregistered sites · '+hardLocal.fixed+' / '+hardLocal.total+' tasks repaired in local Playwright · '+
  (hardKane?hardKane.fixed+' / '+hardKane.selected+' Kane-verified in the random subset':'Kane verification pending')+
  '</p><table><caption>Repairs by barrier class</caption><thead><tr><th scope="col">Barrier</th><th scope="col">Local Playwright</th><th scope="col">Kane verified / started</th></tr></thead><tbody>'+
  hardRows+'</tbody></table><p><a href="../proof/hard-v4/README.md">Read the cohort, credit use and individual outcomes</a></p></section>':'')
const installed=new Map((extensionAudit?.results??[]).map(row=>[row.id,row]))
const installedPasses=active.filter(patch=>installed.get(patch.id)?.status==='pass')
const localRecheckSection=nightly && extensionAudit?'<section class="section"><h2>Shipped fix reliability</h2><p>'+installedPasses.length+' / '+active.length+
  ' active patches passed the installed extension audit. '+installedPasses.filter(patch=>patch.journey).length+' recorded journeys passed the extension off and on comparison.</p><p>'+
  (nightly.counts['still-verified']??0)+' tasks passed the local nightly recheck. '+(nightly.dispositions?.length??0)+' retired and '+
  (nightly.counts.inconclusive??0)+' inconclusive.</p><p><a href="../proof/reliability/extension-e2e.json">Installed extension audit</a> · '+
  '<a href="../proof/reliability/nightly.json">Local nightly findings</a></p></section>':localRecheck?'<section class="section"><h2>Local regression recheck</h2><p>'+localRecheck.total+' patch objectives · '+
  Object.entries(localRecheck.counts).map(([status,count])=>count+' '+esc(status)).join(' · ')+
  '</p><p><a href="../proof/hard-v4/regression-summary.json">Per-patch local recheck evidence</a></p></section>':''
const heldoutV3Table=heldoutV3?'<section class="section"><h2>Held-out v3</h2><p><strong>Held-out v3: '+
  heldoutV3.fixed+' of '+heldoutV3.total+' fixed automatically</strong></p><p>'+
  Object.entries(heldoutV3.byPersona).map(([persona,score])=>esc(labels[persona]??persona)+' '+score.fixed+'/'+score.total).join(' · ')+
  '</p><p>'+Object.entries(heldoutV3.counts).map(([status,count])=>count+' '+esc(status)).join(' · ')+
  '</p><p><a href="../proof/heldout-v3/README.md">Preregistered objectives and freeze audit</a></p><details><summary>Kane sessions by site</summary>'+
  heldoutV3.results.map(row=>'<div class="scout"><strong>'+esc(new URL(row.url).hostname)+'</strong><span>'+esc(row.outcome)+'</span><p>'+
    esc(labels[row.persona]??row.persona)+' · '+esc(row.task)+'</p><p>'+
    row.phases.map(phase=>'<a href="'+url(phase.result)+'">'+esc(phase.stage)+' '+esc(phase.status)+' · '+
      esc(phase.sessionId??phase.runner)+'</a>').join('<br>')+'</p></div>').join('')+'</details></section>':''
const heldoutV2Table=heldoutV2?'<section class="section"><h2>Held-out v2</h2><p><strong>'+
  (heldoutV2.finishedAt?'Held-out v2: '+heldoutV2.fixed+' of '+heldoutV2.total+' fixed automatically':'Held-out v2 in progress · '+heldoutV2.registered+' registered tasks')+
  '</strong></p><p>'+Object.entries(heldoutV2.counts).map(([status,count])=>count+' '+esc(status)).join(' · ')+
  '</p><p><a href="../proof/heldout-v2/README.md">Preregistered objectives, all outcomes and Kane sessions</a></p></section>':''
const heldoutTable=heldout?' <section class="section"><h2>Original held-out test</h2><p><strong>'+heldout.fixed+' of '+heldout.total+' fixed automatically</strong></p><p><a href="../proof/heldout/README.md">Task list and Kane sessions</a></p></section>':''
const recheckLabels={'still-verified':'Still verified','re-patched':'Re-patched','broken':'Broken','retired':'Retired','inconclusive':'Inconclusive','error':'Error'}
const recheckSection=rechecked?'<section class="section"><h2>Public patch recheck</h2><p>'+Object.entries(recheckLabels).map(([status,label])=>(rechecked.counts[status]??0)+' '+label.toLowerCase()).join(' · ')+'</p>'+rechecked.results.map(row=>'<div class="scout"><strong>'+esc(row.id)+'</strong><span>'+esc(recheckLabels[row.outcome])+'</span></div>').join('')+'<p><a href="../proof/recheck/README.md">Recheck outcomes and Kane sessions</a></p></section>':''
const liveSection=live?'<section class="section"><h2>Live repair from the extension</h2><p>A ColorHexa keyboard report went from hotkey to verified repair in the same open browser tab.</p><p><a href="../proof/live/README.md">Recordings, terminal transcript and Kane sessions</a></p></section>':''
const taskMillion='<section class="section"><h2>Task Million</h2><p>'+counts.tested+' public tasks probed · '+counts.blocked+' with recorded barriers · '+counts.fixed+' Kane-verified fixes · '+counts.open+' open findings</p><p>'+Object.entries(counts.blockedByPersona).map(([persona,count])=>esc(labels[persona]??persona)+' '+count).join(' · ')+'</p><p><a href="../proof/public-metrics.json">Task count and source ledger</a></p></section>'
const knownRepairs=new Set(recorded.map(patch=>patch.id))
const openTasks=publicTasks.filter(task=>!knownRepairs.has(task.id)).flatMap(task=>{
  const runs=archive.filter(run=>run.taskId===task.id)
  if(!runs.length) return []
  const baseline=runs.findLast(run=>run.phase==='before')
  const latest=runs.findLast(run=>run.phase==='after')??baseline??runs.at(-1)
  const status=baseline?.status==='pass'?'Baseline passed':baseline?.status==='fail'?'Baseline failed · repair open':'Inconclusive'
  return [{site:new URL(task.url).hostname,task,latest,status}]
})
const findings=openTasks.map(({site,latest,status})=>'<div class="scout"><strong>'+esc(site)+'</strong><span>'+status+'</span><p>'+esc(latest.reason)+'</p><a href="'+url(latest.result)+'">'+esc(latest.phase)+' run · '+esc(latest.sessionId??'no session ID')+'</a></div>').join('')
const corrections={
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
    if(rule.action==='injectCSS') {
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
  if(agentProvenance?.writer!=='codex exec' || (!localSource && !kaneSource) ||
    !isDeepStrictEqual((await read(candidate,null))?.rules,patch.rules) ||
    !isDeepStrictEqual(agentPatch?.rules,patch.rules)) throw new Error('Unconfirmed agent proposal for '+patch.id)
  const proposal='[Runtime repair proposal]('+videoLink(agentCandidate)+') · [Repair provenance]('+videoLink(provenancePath)+') · '+
    (localSource?'[Local Playwright failure]('+videoLink(sourceLocalRun)+')':'Failure session '+source.sessionId)
  const report=['# '+patch.site,patch.task,'**Persona** '+patch.persona,'**Observed barrier** '+patch.barrier,'**Patch status** '+patch.status,'## Recorded runs',...phases,...rechecks,...localRetirements,proposal,'## Source repair and relevant WCAG criteria','A passing task captures one interaction under the recorded conditions.',...recommendations.map(r=>'- '+r),'Verified '+patch.evidence.verifiedAt].join('\n\n')
  await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'report.md'),report+'\n')
}
await saveJSON(path.join(ROOT,'patches/index.json'),active)
await saveJSON(path.join(ROOT,'extension/bundled.json'),active)
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
const pair=(before,after)=>'<div class="pair">'+[['Before repair',before],['With repair',after]].map(([label,file])=>'<figure><video preload="none" controls playsinline aria-label="'+label+'" src="'+url(file)+'#t=0.1"></video><figcaption>'+label+'</figcaption></figure>').join('')+'</div>'
const cases=local.map(r=>'<article class="case"><h3>'+esc(labels[r.persona])+'</h3><p>'+esc(r.task)+'</p>'+pair(r.videos.before,r.videos.after)+'<div class="links"><a href="'+url(r.videos.control)+'">Pointer control</a><a href="'+url(r.videos.retirement)+'">Native fix recheck</a><a href="../proof/local/'+esc(r.persona)+'/before/result.json">Run observations</a></div></article>').join('')
const verified=recorded.map(p=>'<article class="case"><h3>'+esc(p.site==='127.0.0.1'?'Stillroom fixture':p.site)+'</h3><p>'+esc(labels[p.persona])+' · '+esc(p.status)+'</p><p>'+esc(p.task)+'</p>'+pair(p.evidence.before,p.evidence.after)+'<a href="../evidence/'+esc(p.id)+'/report.md">Evidence report and Kane session IDs</a></article>').join('')
const publicCases=publicRuns.map(r=>'<article class="case"><h3>'+esc(new URL(r.url).hostname)+'</h3><p>'+esc(r.task)+'</p><p>Rightmost text edge at 320px: '+r.phases.before.right+'px before, '+r.phases.after.right+'px after. The wide control passed with the same passage digest.</p>'+pair(r.phases.before.video,r.phases.after.video)+'<div class="links"><a href="'+url(r.phases.control.video)+'">Wide control</a><a href="../proof/public/'+esc(r.id)+'/observations.json">Measurements</a><a href="../proof/public/'+esc(r.id)+'/candidate.json">Candidate rules</a></div></article>').join('')
const localFixed=local.filter(r=>r.before==='fail'&&r.control==='pass'&&r.after==='pass').length
const metrics=[[active.length,'Active Kane repairs'],[fixtureRepairs.length,'Kane-verified fixture tasks'],[publicRepairs.length,'Kane-verified public tasks'],[recorded.filter(p=>p.status==='retired').length,'Retired patches']]
const history=patchList.flatMap(p=>p.history)
const result=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Curb Cut · Task evidence</title><link rel="stylesheet" href="./style.css"></head><body><a class="skip" href="#main">Skip to results</a><div class="wrap"><nav><strong><span class="logo" aria-hidden="true"></span>Curb Cut</strong><a href="#evidence">Evidence ledger ↓</a></nav><main id="main"><header class="hero"><div><h1>Make the task possible.</h1><p>Curb Cut repairs accessibility barriers in your browser, records the task before and after, and retires the repair when the site fixes itself.</p><a class="button" href="../fixtures/shop/">Try the fixture shop ↗</a> <a class="film-link" href="../launch/curbcut-launch.mp4">Watch the film</a></div><div class="figure"><strong>Task evidence</strong><div class="ramp" aria-hidden="true"></div><p>Original page → browser repair → native fix</p></div></header><div class="metrics">${metrics.map(([n,label])=>'<div><b>'+n+'</b><span>'+label+'</span></div>').join('')}</div>${hardSection}${liveSection}${taskMillion}${heldoutV3Table}${heldoutV2Table}${heldoutTable}${recheckSection}${localRecheckSection}<section class="section" id="evidence"><h2>Kane verification</h2><p class="desc">${recorded.length?'Each task includes before and after recordings, the control, and the corresponding Kane session identifiers.':'Kane task repairs verified so far: 0.'}</p>${verified}<p>${patchList.filter(p=>p.status==='broken').length} broken · ${history.filter(h=>h.event==='re-patched').length} re-patched · ${patchList.filter(p=>p.status==='retired').length} retired</p><p><a href="../proof/kane/ledger.json">Kane session ledger</a></p></section>${findings?'<section class="section"><h2>Public Kane findings</h2><p class="desc">These attempts have no published repair. Each entry links to a recorded Kane result.</p>'+findings+'</section>':''}<section class="section"><h2>Local fixture replays</h2><p class="desc">Recorded in local Chrome with Playwright. Each task has a baseline, a pointer control, a patched replay, and an unpatched replay of the native fix.</p>${cases}</section><section class="section"><h2>Local public-page replays</h2><p class="desc">Measured in local Chrome. Each recording covers one reading task on the named page. The candidate rules remain outside the verified feed.</p>${publicCases}</section><section class="section"><h2>Public-site scouting</h2><p class="desc">Each observation covers the page and conditions in the <a href="../proof/scouting.json">scout log</a>. The <a href="../proof/scouting-keyboard.json">keyboard scout</a> and <a href="../proof/scouting-keyboard-followup.json">follow-up</a> contain additional local observations. The <a href="../proof/famous/README.md">familiar-site report</a> links the Grok scout and Kane trials. See the <a href="../proof/local-keyboard-findings.json">open local keyboard findings</a> for the date picker and hover menu. A candidate needs a task-level replay before it can enter the verified list.</p>${scout.map(s=>'<div class="scout"><strong>'+esc(s.site)+'</strong><span>'+esc(s.status.replaceAll('_',' '))+'</span><p>'+esc(s.observation||s.accessReason||(s.barriers?.length?s.barriers.map(b=>b.kind.replaceAll('_',' ')).join(' · '):s.task))+'</p></div>').join('')}</section></main><footer><span class="brand">Curb Cut</span><a href="../patches/index.json">Verified patch feed ↗</a></footer></div></body></html>`
await writeFile(path.join(ROOT,'site/index.html'),result+'\n')
console.log(`Built dashboard: ${active.length} active Kane repairs · ${recorded.length} Kane-verified tasks · ${localFixed} local fixes`)
