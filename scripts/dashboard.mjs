import path from 'node:path'
import {cp, mkdir, writeFile} from 'node:fs/promises'
import {ROOT, readJSON} from '../core/io.mjs'

const repo = 'https://github.com/VasuBansal7576/curbcut'
const raw = 'https://raw.githubusercontent.com/VasuBansal7576/curbcut/main/'
const proof = file => readJSON(path.join(ROOT, 'proof', file + '.json'))
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]))
const link = file => {
  const encoded = file.split('/').map(encodeURIComponent).join('/')
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
const mark = '<span class="mark" aria-hidden="true"></span>'
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
  return `<article class="replay"><div class="still">${videoLink(entry, after, `<img src="assets/${slug}.jpg" width="680" height="372" alt="" loading="lazy"><span class="play" aria-hidden="true"></span>`)}</div>
    <div class="replay-copy"><h3>${name}</h3><p>${task}</p><div class="replay-actions">${videoLink(entry,before,'<b>FAIL</b> Before','verdict fail')}
    ${videoLink(entry,after,'<b>PASS</b> After','verdict pass')} ${proofLink(after.pack,'Pack '+arrow)}</div></div></article>`
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
  await Promise.all([cp(path.join(ROOT,'launch/film/fonts'),path.join(assets,'fonts'),{recursive:true}),
    ...[['launch/curbcut-launch-thumbnail.png','curbcut-launch-thumbnail.png'],['launch/captions/launch.vtt','launch.vtt'],
      ['extension/icons/icon32.png','icon.png']].map(([source,name])=>cp(path.join(ROOT,source),path.join(assets,name)))])
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Curb Cut — Accessibility repair evidence</title><meta name="description" content="Explore the recordings and local measurements behind Curb Cut’s browser accessibility repairs.">
<link rel="icon" href="assets/icon.png"><link rel="stylesheet" href="style.css"><script defer src="dashboard.js"></script></head>
<body><a href="#main" class="skip">Skip to content</a>
<header class="top"><div class="frame top-inner"><a class="wordmark" href="#main">${mark}Curb Cut</a>
<nav aria-label="Sections"><a href="#results">Results</a><a href="#recordings">Recordings</a><a href="#evidence"><span class="nav-full">Evidence ledger</span><span class="nav-short">Ledger</span> <span class="nav-arrow" aria-hidden="true">↓</span></a></nav></div></header>
<main id="main"><section class="hero"><div class="frame hero-grid"><div class="pitch">
<p class="eyebrow"><span class="rule"></span> Chrome accessibility extension</p>
<h1><span>Fixes the web for the people it shuts out.</span> <em>Every fix proven by Kane.</em></h1>
<div class="hero-actions"><a class="button" href="${repo}/releases/tag/v1.0">Download extension <span aria-hidden="true">↓</span></a><a class="github" href="${repo}">GitHub ${arrow}</a></div></div>
<figure class="film"><video id="film" controls playsinline preload="none" poster="assets/curbcut-launch-thumbnail.png" src="${raw}launch/curbcut-launch.mp4" aria-label="Curb Cut launch film"><track kind="captions" src="assets/launch.vtt" srclang="en" label="English"></video>
<figcaption><button type="button" id="start-film" hidden><b aria-hidden="true">▶</b> Play launch film</button><span class="film-label">Launch film</span><span>English captions <i>/</i> CC</span></figcaption></figure></div>
<div class="frame inventory" aria-label="Shipped extension repairs"><div><strong>${bundled.length}</strong><span>Bundled fixes</span></div><div><strong>${kaneCount}</strong><span>Kane-verified</span></div><div><strong>${bundled.length-kaneCount}</strong><span>With local proof</span></div><a href="#evidence">Browse fixes <span aria-hidden="true">↓</span></a></div></section>
<section class="protocol" aria-labelledby="protocol-title"><div class="frame protocol-inner"><h2 id="protocol-title">The Kane protocol</h2>
<ol>${[['Keyboard fails','Kane tries the task.'],['Mouse passes','A pointer reaches it.'],['Apply the fix','A scoped rule runs.'],['Keyboard passes','Kane records the replay.']].map(([title,copy],i)=>`<li><span class="step">0${i+1}</span><div><strong>${title}</strong><small>${copy}</small></div></li>`).join('')}</ol></div></section>
<section class="results section frame" id="results"><h2>Results</h2><div class="study-grid"><div class="coverage"><h3>Six common failure types</h3>
<p>Share of home pages in the <a href="${webAim.source}">WebAIM Million ${webAim.year}</a>. Repair rates use our registered tasks.</p>
<table class="scores"><caption class="sr">WebAIM prevalence and Curb Cut task results by failure type</caption><thead><tr><th scope="col">Failure type</th><th scope="col">Pages</th><th scope="col">Local</th><th scope="col">Kane</th><th scope="col">Proof</th></tr></thead><tbody>${rows}</tbody></table>
<p class="footnote">Language also passed on ${proofLink('proof/heldout-v6/development-language/summary.json',tally(languageDev.rows,row=>row.status==='locally-fixed')+' development pages')}. Kane rates cover sampled tasks.</p></div>
<div class="studies"><h3>Held-out studies</h3>${studies.map(([version,sites,local,kane,sample,note])=>`<article><header><span class="version">${version}</span><a href="${link('proof/heldout-'+version+'/README.md')}">${sites.toLocaleString('en-US')} sites scouted ${arrow}</a></header>
<div class="study-numbers"><div><strong>${local}</strong><span>Local repairs</span></div><div><strong>${kane}</strong><span>Kane · ${sample}</span></div></div><p>${note}</p></article>`).join('')}</div></div></section>
<section class="recordings section" id="recordings"><div class="frame"><div class="section-intro"><h2>See the fix</h2><p>Three tasks, before and after, recorded by Kane.</p></div>
<div class="replays">${featured.map(item=>replayCard(item,entries)).join('')}</div></div></section>
<section class="section frame ledger" id="evidence"><div class="section-intro"><h2>Evidence ledger</h2><p>Open a fix to inspect its task and proof.</p></div>
<form id="filters" role="search" aria-label="Filter evidence"><label class="search"><span>Site</span><input name="site" type="search" placeholder="Search by domain" autocomplete="off"></label>
${select('barrier','Barrier',entries.map(r=>r.barrier))}${select('persona','Persona',entries.map(r=>r.persona))}${select('proof','Proof',entries.map(r=>r.proofType))}</form>
<noscript><p>${proofLink('patches/index.json','Open the complete fix index')} to inspect all fixes.</p></noscript>
<table class="ledger-table"><caption class="sr">Bundled fixes and supporting evidence</caption><thead><tr><th scope="col">Site</th><th scope="col">Barrier</th><th class="persona" scope="col">Persona</th><th scope="col">Proof</th></tr></thead>
${entries.map(ledgerRow).join('\n')}</table><p id="empty" hidden>No matching fixes. <button type="button" id="clear">Clear filters</button></p>
<div class="pager"><span id="count" role="status" aria-live="polite"></span><div><button id="prev" type="button" aria-label="Previous page">← Previous</button><button id="next" type="button" aria-label="Next page">Next →</button></div></div></section>
<section class="experiment"><div class="frame experiment-inner"><div><p class="eyebrow">Experimental</p><h2>Jev live naming</h2></div>
<div class="jev-score"><strong>${ratio(jev.adjudication.correct,jev.summary.appliedNames)}</strong><span>names correct</span></div>
<div><p>The opt-in extension named ${jev.summary.appliedNames} of ${jev.summary.unnamedControls} unnamed controls in a ${jev.summary.attemptedSites}-site run. Manual review marked ${jev.adjudication.vague} names vague.</p>${proofLink('proof/jev/live-naming-real-sites.json','Inspect the reviewed names '+arrow)}</div></div></section>
</main><footer><div class="frame footer-inner"><div class="wordmark">${mark}Curb Cut</div><div><h2>Verify locally</h2><code>npm test &amp;&amp; npm run build</code><br><code>node scripts/verify-evidence.mjs</code></div>
<nav aria-label="Project documentation"><a href="${repo}/blob/main/README.md">README ${arrow}</a><a href="${repo}/blob/main/ARCHITECTURE.md">Architecture ${arrow}</a>${proofLink('proof/README.md','Proof index '+arrow)}</nav></div></footer>
<dialog id="player" aria-labelledby="player-title"><div class="player-head"><h2 id="player-title">Kane recording</h2><button type="button" id="close">Close ×</button></div><video controls playsinline preload="none" aria-labelledby="player-title"></video><a id="original">Open original recording ${arrow}</a></dialog>
</body></html>\n`
  await writeFile(path.join(ROOT,'site/index.html'),html)
}
