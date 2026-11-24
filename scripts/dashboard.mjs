import path from 'node:path'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {build} from 'esbuild'
import {focusStory} from './focus-story.mjs'
import {dotField, mark} from './landing-scenes.mjs'
import {ROOT, readJSON} from '../core/io.mjs'

import {archiveExtension} from './package-extension.mjs'

async function copyChanged(source, destination) {
  const bytes = await readFile(source)
  const current = await readFile(destination).catch(error => {
    if (error.code !== 'ENOENT') throw error
    return null
  })
  if (!current?.equals(bytes)) await writeFile(destination, bytes)
}
const repo = 'https://github.com/VasuBansal7576/curbcut'
const raw = 'https://raw.githubusercontent.com/VasuBansal7576/curbcut/main/'
const proof = file => readJSON(path.join(ROOT, 'proof', file + '.json'))
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]))
const link = file => {
  const [pathname, anchor] = file.split('#')
  const encoded = pathname.split('/').map(encodeURIComponent).join('/') + (anchor ? '#'+encodeURIComponent(anchor) : '')
  if (process.env.CURBCUT_PAGES !== '1') return '../' + encoded
  return (/\.(mp4|evidence)$/.test(file) ? raw : repo + '/blob/main/') + encoded
}
const barriers = {
  'low-contrast':'Low contrast text', 'missing-alt':'Missing image alternatives', 'missing-label':'Missing form labels',
  'empty-link':'Empty links', 'empty-button':'Empty buttons', 'missing-language':'Missing document language'
}
const personas = {
  'keyboard-only':'Keyboard only', 'screen-reader-view':'Screen reader view', 'low-vision':'Low vision',
  'low-contrast-simulation':'Low contrast sensitivity', 'document-language':'Document language', 'color-blind':'Color vision'
}
const arrow = '<span aria-hidden="true">↗</span>'
const proofLink = (file, label) => `<a href="${link(file)}">${label}</a>`
const ratio = (n, d) => `${n}/${d}`
const score = row => ratio(row.fixed, row.total)
const tally = (rows, pass) => ratio(rows.filter(pass).length, rows.length)
const phases = ['before','control','after']

function barrier(patch) {
  if (patch.evaluation) return barriers[patch.evaluation.category]
  const actions = patch.rules.map(rule => rule.action)
  if (actions.includes('arrowKeyNavigation')) return 'Keyboard navigation'
  if (patch.journey) return 'Keyboard menu'
  if (patch.persona === 'keyboard-only') return 'Keyboard activation'
  if (patch.persona === 'low-vision') return 'Narrow-screen reflow'
  if (patch.persona === 'screen-reader-view') return barriers['missing-label']
  return patch.barrier
}

async function ledgerEntry(patch) {
  const local = patch.status === 'locally-verified'
  const recordings = local ? [] : await Promise.all(phases.map(async phase => {
    const file = patch.evidence[phase]
    const result = await readJSON(path.join(ROOT, path.dirname(file), 'result.json'))
    return {phase, file, pack:result.evidencePack}
  }))
  return {patch, site:patch.site.replace(/^www\./, ''), barrier:barrier(patch),
    persona:personas[patch.persona], proofType:local ? 'Local' : 'Kane', recordings}
}

function videoLink(entry, run, label, className = '') {
  const title = esc(entry.site + ' · ' + run.phase + ' recording')
  return `<a class="${className}" data-recording="${title}" href="${link(run.file)}">${label}<span class="sr"> · ${title}</span></a>`
}

function ledgerRow(entry, index) {
  const {patch, site, barrier, persona, proofType, recordings} = entry
  const id = 'detail-' + patch.id
  const runs = recordings.map(run => `<div><strong>${run.phase}</strong> ${videoLink(entry, run, 'Recording')} · ${proofLink(run.pack,'Evidence pack')}</div>`).join('')
  const measurement = patch.evidence.localMeasurement
  return `<tbody data-site="${esc(patch.site)}" data-barrier="${esc(barrier)}" data-persona="${esc(persona)}" data-proof="${proofType}"${index >= 5 ? ' hidden' : ''}>
    <tr><th scope="row"><button class="expand" aria-expanded="false" aria-controls="${id}"><span class="toggle" aria-hidden="true">+</span>${esc(site)}</button></th>
    <td>${esc(barrier)}</td><td class="persona">${esc(persona)}</td><td><span class="proof-kind ${proofType.toLowerCase()}">${proofType}</span></td></tr>
    <tr class="details" id="${id}" hidden><td colspan="4"><p>${esc(patch.task)}</p><p class="detail-persona">Persona · ${esc(persona)}</p>
    <div class="runs">${runs}</div><div class="detail-links">${recordings.length ? proofLink('evidence/'+patch.id+'/report.md', 'Full evidence report') : ''}${measurement ? proofLink(measurement,'Local measurements') : ''}${proofLink('patches/'+patch.id+'.json','Patch JSON')}</div></td></tr></tbody>`
}

const featured = [
  ['mass','v4-86f207deeb57-7bc09a21','Mass.edu','Open About with the keyboard and follow “The DHE.”'],
  ['munich','v6-5193be8805ece27f858e','Munich Airport','Find the unnamed previous-slide button in Reading view.'],
  ['worms','v5-c22b9bdca86b-71a63d77','WoRMS','Open Tools with the keyboard and reach “Match taxa.”']
]
function replayCard([slug, id, name, task], entries) {
  const entry = entries.find(row => row.patch.id === id)
  const [before,,after] = entry.recordings
  return `<article id="replay-${slug}" class="replay" data-preview-before="assets/previews/${slug}-before.mp4" data-preview-after="assets/previews/${slug}-after.mp4"><h3>${name}</h3>
    <video class="site-recording" muted controls playsinline preload="none" poster="assets/${slug}.jpg" src="${link(after.file)}" aria-label="${name} repaired run"></video>
    <p>${task}</p><div class="replay-actions">${videoLink(entry,before,'Play before','verdict fail')}
    ${videoLink(entry,after,'Play after','verdict pass')} ${proofLink(after.pack,'Evidence pack '+arrow)}</div></article>`
}
function select(name, label, values) {
  return `<label><span>${label}</span><select name="${name}"><option value="">All ${label === 'Proof' ? 'proof' : label.toLowerCase()+'s'}</option>${[...new Set(values)].sort().map(value => `<option>${esc(value)}</option>`).join('')}</select></label>`
}

export async function buildDashboard({bundled, v5Local, v5Sample, v6Local, v6Kane}) {
  const [v5Scout,v6Scout,v7Local,jev,webAim,languageDev,entries] = await Promise.all([
    proof('heldout-v5/scouting'), proof('heldout-v6/scouting'), proof('heldout-v7/local-summary'),
    proof('jev/live-naming-real-sites'), proof('webaim-million-2026'), proof('heldout-v6/development-language/summary'),
    Promise.all(bundled.map(ledgerEntry))
  ])
  entries.sort((a,b) => a.site.localeCompare(b.site,'en') || a.patch.id.localeCompare(b.patch.id,'en'))
  const kaneCount = entries.filter(row => row.proofType === 'Kane').length
  const labels = v5Local.results.filter(row => row.task.probe?.action === 'type' && row.task.persona === 'screen-reader-view')
  const labelIds = new Set(labels.map(row => row.task.id))
  const sampledLabels = v5Sample.cases.filter(row => labelIds.has(row.id))
  const lang7 = v7Local.counts['missing-language']
  const rows = Object.entries(webAim.homePagePercent).map(([key, percent]) => {
    const form = key === 'missing-label'
    const sample = v6Kane.byCategory[key]
    const local = form ? tally(labels, row => row.status === 'locally-fixed') : score(v6Local.byCategory[key])
    const kane = form ? tally(sampledLabels, row => row.kaneVerified) : sample && ratio(sample.verified,sample.selected)
    const folder = form ? 'heldout-v5/' : 'heldout-v6/'
    return `<tr><th scope="row">${barriers[key]}</th><td>${percent}%</td><td>${proofLink('proof/'+folder+'local-summary.json',local)} <small>v${form?'5':'6'}</small>${key==='missing-language' ? `<br>${proofLink('proof/heldout-v7/local-summary.json',ratio(lang7.localFixed,lang7.registered))} <small>v7</small>` : ''}</td><td>${kane ? proofLink('proof/'+folder+(form?'kane-sample-20/summary.json':'kane-summary.json'),kane) : '—'}</td><td>${kane ? 'Local + Kane' : 'Local only'}</td></tr>`
  }).join('')
  const hard = v5Local.results.filter(row => row.task.journey?.length)
  const studies = [
    ['v5',v5Scout.summary.attempted,score(v5Local),ratio(v5Sample.kaneVerified,v5Sample.started),'random sample', tally(hard,row=>row.status==='locally-fixed')+' multi-step tasks fixed locally.'],
    ['v6',v6Scout.attempted,tally(v6Local.rows,row=>row.status==='locally-fixed'),tally(v6Kane.cases,row=>row.verified),'naming sample','Five failure types tested on new sites.']
  ]
  const assets = path.join(ROOT,'site/assets')
  await mkdir(assets,{recursive:true})
  await Promise.all([build({entryPoints:[path.join(ROOT,'scripts/landing-motion.mjs')],bundle:true,minify:true,legalComments:'eof',outfile:path.join(assets,'story.js')}),
    ...[['launch/curbcut-launch-thumbnail.png','curbcut-launch-thumbnail.png'],['launch/captions/launch.vtt','launch.vtt'],
      ['extension/icons/icon32.png','icon.png']].map(([source,name])=>copyChanged(path.join(ROOT,source),path.join(assets,name)))])
  const download = 'assets/curbcut-extension.zip'
  await archiveExtension({output:path.join(assets,'curbcut-extension.zip')})
  const mass = entries.find(entry=>entry.patch.id===featured[0][1])
  const percent = webAim.homePagesWithDetectedFailuresPercent
  const steps = [
    ['before','Keyboard','The menu stays shut.','Step 2 failed: Arrow Down left About focused and no visible or accessible “The DHE” control appeared.','13-0-13'],
    ['control','Mouse','The pointer gets through.','With a mouse, Kane follows The DHE to its destination.','7-0-8'],
    ['fix','Repair','Give focus the same behavior.','The scoped rule opens the submenu when its parent receives keyboard focus.'],
    ['after','Keyboard','This time it opens.','Kane repeats the task with the repair and reaches The DHE.','13-0-13']
  ]
  const protocol = steps.map(([phase,input,title,caption])=>{
    const run = mass.recordings.find(item=>item.phase===phase)
    const verdict = mass.patch.evidence.kaneVerdicts[phase]?.toUpperCase() ?? 'RULE'
    const subject = run ? input+' / '+verdict : mass.patch.rules[0].action
    return `<article class="run" id="run-${phase}" data-phase="${phase}">
      <h3><span data-subject>${esc(subject)}</span></h3><p>${esc(caption)}</p>
      ${run ? `<video muted playsinline preload="none" poster="assets/protocol-${phase}.jpg" data-src="assets/previews/kane-${phase}.mp4" aria-label="${esc(title)}"></video><div>${videoLink(mass,run,'Play complete run')} · ${proofLink(run.pack,'Evidence pack')}</div>` :
        `<pre>${esc(JSON.stringify(mass.patch.rules[0],null,2))}</pre>${proofLink('patches/'+mass.patch.id+'.json','Open the scoped repair')}`}
    </article>`
  }).join('')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#161419"><title>Curb Cut — Accessibility fixes for the web</title><meta name="description" content="A Chrome extension that fixes keyboard, screen reader and low-vision barriers on real websites. Explore the evidence for every shipped fix.">
<link rel="icon" href="assets/icon.png"><link rel="preload" href="assets/fonts/inter-tight.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="style.css"><script defer src="dashboard.js"></script><script defer src="assets/story.js"></script></head>
<body><a href="#main" class="skip">Skip to content</a><header class="mast"><div class="frame"><a class="wordmark" href="#opening" aria-label="Curb Cut home">${mark}Curb Cut</a><nav aria-label="Sections"><a href="#protocol">How it works</a><a href="#evidence">Evidence</a><a href="${download}">Get extension ↗</a></nav></div></header>
<div id="travel-ring" hidden aria-hidden="true"></div><main id="main">${focusStory()}
<section class="protocol scene" id="protocol"><div class="frame"><p class="kicker">Mass.edu / Kane CLI</p><h2>One menu. Three runs.</h2><p class="intro">Follow the same destination through a keyboard failure, a pointer control and a repaired keyboard run.</p></div>
<div class="run-track"><div class="run-stage"><div class="phase-tabs" hidden role="group" aria-label="Select a Kane phase">${steps.map(([phase],i)=>`<button aria-controls="run-${phase}">${['Keyboard','Pointer','Agent rule','Re-run'][i]}</button>`).join('')}</div>${protocol}</div></div></section>
<section class="scale paper scene" id="results"><div class="frame"><p class="kicker"><i class="signal"></i> The scale</p><div class="scale-grid"><div><h2><span class="stat">${percent}%</span><span class="stat-title">of home pages</span></h2><p class="intro">had detectable WCAG failures in the <a href="${webAim.source}">WebAIM Million ${webAim.year}</a>.</p></div><figure class="dot-figure">${dotField(percent)}<figcaption class="mono">${Math.round(percent*10)} of 1,000 · normalized sample</figcaption></figure></div>
<div class="inventory"><div><strong aria-hidden="true" data-total="${entries.length}">${entries.length}</strong><span><span class="sr">${entries.length} </span>fixes live in the extension</span></div><p><b>${kaneCount}</b> Kane-verified<br><b>${entries.length-kaneCount}</b> with local proof</p></div>
<details class="studies-more"><summary>Explore the study results</summary><div class="study-grid"><div class="coverage"><h3>Six common failure types</h3>
<p>Share of home pages in the <a href="${webAim.source}">WebAIM Million ${webAim.year}</a>. Repair rates use our registered tasks.</p>
<table class="scores"><caption class="sr">WebAIM prevalence and Curb Cut task results by failure type</caption><thead><tr><th scope="col">Failure type</th><th scope="col">Pages</th><th scope="col">Local</th><th scope="col">Kane</th><th scope="col">Proof</th></tr></thead><tbody>${rows}</tbody></table>
<p class="footnote">Language also passed on ${proofLink('proof/heldout-v6/development-language/summary.json',tally(languageDev.rows,row=>row.status==='locally-fixed')+' development pages')}. Kane rates cover sampled tasks.</p></div>
<div class="studies"><h3>Held-out studies</h3>${studies.map(([version,sites,local,kane,sample,note])=>`<article><header><span class="version">${version}</span><a href="${link('proof/heldout-'+version+'/README.md')}">${sites.toLocaleString('en-US')} sites scouted ${arrow}</a></header>
<div class="study-numbers"><div><strong>${local}</strong><span>Local repairs</span></div><div><strong>${kane}</strong><span>Kane · ${sample}</span></div></div><p>${note}</p></article>`).join('')}</div></div></details></div></section>
<section class="recordings scene" id="recordings"><div class="frame"><p class="kicker"><i class="signal"></i> Real recordings</p><h2>See the difference.</h2><p class="intro">Play either run to follow the same task before and after its repair.</p><div class="phase-tabs site-switcher" hidden role="group" aria-label="Choose a recorded site">${featured.map(([slug,,name])=>`<button type="button" aria-controls="replay-${slug}">${name}</button>`).join('')}</div><div class="replays">${featured.map(item=>replayCard(item,entries)).join('')}</div></div></section>
<section class="ledger paper scene" id="evidence"><div class="frame"><p class="kicker"><i class="signal"></i> Evidence ledger</p><h2>Every fix.</h2><p class="intro">Search all ${entries.length} shipped fixes. Open a row for the task, patch, and proof.</p>
<form id="filters" role="search" aria-label="Filter evidence"><label class="search"><span>Site</span><input name="site" type="search" placeholder="Search by domain" autocomplete="off"></label>
${select('barrier','Barrier',entries.map(r=>r.barrier))}${select('persona','Persona',entries.map(r=>r.persona))}${select('proof','Proof',entries.map(r=>r.proofType))}</form>
<noscript><p>${proofLink('patches/index.json','Open the complete fix index')} to inspect all fixes.</p></noscript>
<table class="ledger-table"><caption class="sr">Bundled fixes and supporting evidence</caption><thead><tr><th scope="col">Site</th><th scope="col">Barrier</th><th class="persona" scope="col">Persona</th><th scope="col">Proof</th></tr></thead>
${entries.map(ledgerRow).join('\n')}</table><p id="empty" hidden>No matching fixes. <button type="button" id="clear">Clear filters</button></p>
<div class="pager"><span id="count" role="status" aria-live="polite"></span><div><button id="prev" type="button" aria-label="Previous page">← Previous</button><button id="next" type="button" aria-label="Next page">Next →</button></div></div></div></section>
<section class="experiment scene" id="jev"><div class="frame jev-grid"><div><p class="kicker"><i class="signal"></i> Experimental · opt-in</p><h2>A name,<br>given live.</h2><p class="intro">Jev proposes names for unlabeled controls as you browse. In a ${jev.summary.attemptedSites}-site run, it named ${jev.summary.appliedNames} of ${jev.summary.unnamedControls} unnamed controls.</p>${proofLink('proof/jev/live-naming-real-sites.json','Read the manual review '+arrow)}</div><div class="jev-proof"><div class="label-sheet"><span class="mono">Jev / live naming</span><strong>${jev.adjudication.correct}/${jev.summary.appliedNames}</strong><span>names judged correct</span></div></div></div></section>
<section class="scene"><div class="frame"><p class="kicker">Kane for developers</p><h2>Replay the failure.</h2><p class="intro">Kane records the blocked task, checks the pointer control, gives the coding agent the failed run, and repeats the task with the proposed fix.</p><div><pre data-subject>curbcut check --local &lt;url&gt; "&lt;task&gt;"
curbcut gate --local --config curbcut.gate.json</pre><p>Omit <code>--local</code> for Kane. ${proofLink('docs/gate.md#claude-code-stop-hook','Claude Code Stop hook')} · ${proofLink('docs/pr-bot.md','Pull request bot')}</p></div></div></section>
<section class="ending blue scene" id="download"><div class="frame end-grid"><div><p class="kicker"><i class="signal"></i> Curb Cut for Chrome</p><h2>Take it<br>with you.</h2><ol><li>Download and unzip the extension.</li><li>Open chrome://extensions and enable Developer mode.</li><li>Choose Load unpacked and select the extracted extension folder.</li></ol><div class="end-actions"><a class="primary" data-subject href="${download}">Download extension ↗</a><a href="${repo}">GitHub ↗</a></div></div><figure class="film"><video id="film" controls playsinline preload="none" poster="assets/focus-film.jpg" src="${process.env.CURBCUT_PAGES==='1'?raw+'launch/curbcut-launch.mp4':link('launch/curbcut-launch.mp4')}" aria-label="Curb Cut launch film"><track kind="captions" src="assets/launch.vtt" srclang="en" label="English"></video>
<figcaption><button type="button" id="start-film" hidden>▶ Watch the film</button><span>English captions · CC</span></figcaption></figure></div></section>
</main><footer><div class="frame"><a href="#opening" class="wordmark">${mark}Curb Cut</a><div><h2>Verify locally</h2><code>npm test &amp;&amp; npm run build</code><br><code>node scripts/verify-evidence.mjs</code></div><nav aria-label="Documentation"><a href="${repo}/blob/main/README.md">README ↗</a> ${proofLink('proof/README.md','Proof index '+arrow)}</nav></div></footer>
<dialog id="player" aria-labelledby="player-title"><div class="player-head"><h2 id="player-title">Kane recording</h2><button type="button" id="close">Close ×</button></div><video controls playsinline preload="none" aria-labelledby="player-title"></video><a id="original">Open original recording ${arrow}</a></dialog>
</body></html>\n`
  await writeFile(path.join(ROOT,'site/index.html'),html)
}
