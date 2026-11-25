import path from 'node:path'
import {copyFile, mkdir, writeFile} from 'node:fs/promises'
import {opening, repair} from './landing-opening.mjs'
import {readerChapter, contrastChapter, kaneChapter, jevChapter, mapChapter, ownerChapter, developerChapter, closing} from './landing-chapters.mjs'
import {ROOT, readJSON} from '../core/io.mjs'

import {archiveExtension} from './package-extension.mjs'

const repo = 'https://github.com/VasuBansal7576/curbcut'
const raw = 'https://raw.githubusercontent.com/VasuBansal7576/curbcut/main/'
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

function videoLink(entry, run, label) {
  const title = esc(entry.site + ' · ' + run.phase + ' recording')
  return `<a data-phase="${run.phase}" data-recording="${title}" href="${link(run.file)}">${label}<span class="sr"> · ${title}</span></a>`
}

const previewSites = new Map([
  ['v4-86f207deeb57-7bc09a21', 'mass'],
  ['v6-5193be8805ece27f858e', 'munich'],
  ['v5-c22b9bdca86b-71a63d77', 'worms']
])

function ledgerRow(entry, index) {
  const {patch, site, barrier, persona, proofType, recordings} = entry
  const id = 'detail-' + patch.id
  const runs = recordings.map(run => `<div><strong>${run.phase}</strong> ${videoLink(entry, run, 'Recording')} · ${proofLink(run.pack,'Evidence pack')}</div>`).join('')
  const measurement = patch.evidence.localMeasurement
  const preview = previewSites.get(patch.id)
  const clips = preview ? ` class="replay" data-preview-before="assets/previews/${preview}-before.mp4" data-preview-after="assets/previews/${preview}-after.mp4"` : ''
  return `<tbody${clips} data-site="${esc(patch.site)}" data-barrier="${esc(barrier)}" data-persona="${esc(persona)}" data-proof="${proofType}"${index >= 5 ? ' hidden' : ''}>
    <tr><th scope="row"><button class="expand" aria-expanded="false" aria-controls="${id}"><span class="toggle" aria-hidden="true">+</span>${esc(site)}</button></th>
    <td>${esc(barrier)}</td><td class="persona">${esc(persona)}</td><td><span class="proof-kind ${proofType.toLowerCase()}">${proofType}</span></td></tr>
    <tr class="details" id="${id}" hidden><td colspan="4"><p>${esc(patch.task)}</p><p class="detail-persona">Browsing method · ${esc(persona)}</p>
    <div class="runs">${runs}</div><div class="detail-links">${recordings.length ? proofLink('evidence/'+patch.id+'/report.md', 'Full evidence report') : ''}${measurement ? proofLink(measurement,'Local measurements') : ''}${proofLink('patches/'+patch.id+'.json','Patch JSON')}</div></td></tr></tbody>`
}

function select(name, label, values) {
  return `<label><span>${label}</span><select name="${name}"><option value="">All ${label === 'Proof' ? 'proof' : label.toLowerCase()+'s'}</option>${[...new Set(values)].sort().map(value => `<option>${esc(value)}</option>`).join('')}</select></label>`
}

export async function buildDashboard({bundled}) {
  const entries = await Promise.all(bundled.map(ledgerEntry))
  entries.sort((a,b) => a.site.localeCompare(b.site,'en') || a.patch.id.localeCompare(b.patch.id,'en'))
  const kaneCount = entries.filter(entry=>entry.proofType==='Kane').length
  const assets = path.join(ROOT,'site/assets')
  await mkdir(assets,{recursive:true})
  const download = 'assets/curbcut-extension.zip'
  await archiveExtension({output:path.join(assets,'curbcut-extension.zip')})
  const mass = entries.find(entry=>entry.patch.id==='v4-86f207deeb57-7bc09a21')
  const [review, plates] = await Promise.all([
    readJSON(path.join(ROOT,'proof/jev/live-naming-real-sites.json')),
    readJSON(path.join(ROOT,'launch/film/plates/index.json'))
  ])
  const film = 'launch/curbcut-launch.mp4'
  const map = entries.find(entry=>entry.patch.id==='draft-7565c3d5-736d-48b1-b0e2-8c38afd36147')
  const mapMedia = new Map([
    ['proof/report-to-fix/browser.mp4','media/openseamap-report.mp4'],
    ['proof/report-to-fix/user-clip.mp4','media/openseamap-comparison.mp4'],
    ...map.recordings.map(run=>[run.file,'media/openseamap-'+run.phase+'.mp4'])
  ])
  const pagesFilm = 'media/curbcut-launch.mp4'
  if (process.env.CURBCUT_PAGES === '1') {
    await mkdir(path.join(ROOT,'site/media'),{recursive:true})
    for (const [source, dest] of [[film,pagesFilm], ...mapMedia]) {
      await copyFile(path.join(ROOT,source),path.join(ROOT,'site',dest))
    }
  }
  for (const name of ['check','gate','retire-kane']) {
    await copyFile(path.join(ROOT,'launch/footage',name+'.mp4'),path.join(assets,'story',name+'.mp4'))
  }
  await copyFile(path.join(ROOT,'launch/captions/launch.vtt'),path.join(assets,'launch.vtt'))
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Curb Cut — Accessibility fixes for Chrome</title><meta name="theme-color" content="#E8E4F5"><meta name="description" content="Curb Cut fixes mouse-only menus, unnamed buttons and faint text as you browse. Watch a real repair and inspect the evidence.">
<link rel="icon" href="assets/icon.png"><link rel="preload" as="image" href="assets/story/about-closed.webp" fetchpriority="high"><link rel="preload" href="assets/fonts/inter-tight.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="style.css"><script defer src="dashboard.js"></script><script defer src="keystroke.js"></script><script defer src="chapters.js"></script><noscript><style>[data-panel][hidden]{display:block!important;margin-block:24px}.choices,.try-copy{display:none}</style></noscript></head>
<body><a class="skip" href="#title">Skip to content</a><main id="main"><div class="travel-focus" aria-hidden="true" hidden></div>${opening({download,repo,count:entries.length})}
${repair({recordings:mass.recordings,link})}
${readerChapter(link)}
${contrastChapter(link,plates)}
${kaneChapter(mass.recordings,link)}
${jevChapter(link,review)}
${mapChapter(map.recordings, link, file=>process.env.CURBCUT_PAGES === '1' ? mapMedia.get(file) : link(file))}
${ownerChapter(link)}
${developerChapter(link)}
<section class="ledger" id="evidence"><div class="frame"><p class="overline">Fix library</p><h2>Every fix.</h2><p class="ledger-intro">Search all ${entries.length} fixes. Kane verified ${kaneCount}. The other ${entries.length-kaneCount} have local proof. Open a row for the task, recordings and evidence.</p>
<form id="filters" role="search" aria-label="Filter evidence"><label class="search"><span>Site</span><input name="site" type="search" placeholder="Search by domain" autocomplete="off"></label>
${select('barrier','Barrier',entries.map(r=>r.barrier))}${select('persona','Browsing method',entries.map(r=>r.persona))}${select('proof','Proof',entries.map(r=>r.proofType))}</form>
<noscript><p>${proofLink('patches/index.json','Open the complete fix index')} to inspect all fixes.</p></noscript>
<table class="ledger-table"><caption class="sr">Bundled fixes and supporting evidence</caption><thead><tr><th scope="col">Site</th><th scope="col">Barrier</th><th class="persona" scope="col">Browsing method</th><th scope="col">Proof</th></tr></thead>
${entries.map(ledgerRow).join('\n')}</table><p id="empty" hidden>No matching fixes. <button type="button" id="clear">Clear filters</button></p>
<div class="pager"><span id="count" role="status" aria-live="polite"></span><div><button id="prev" type="button" aria-label="Previous page">← Previous</button><button id="next" type="button" aria-label="Next page">Next →</button></div></div></div></section>

${closing({download,film:process.env.CURBCUT_PAGES === '1' ? pagesFilm : link(film)})}
</main><footer class="frame"><a class="wordmark" href="#opening"><i class="mark" aria-hidden="true"></i>Curb Cut</a><a href="${repo}">GitHub ↗</a></footer>
<dialog id="player" aria-labelledby="player-title"><div class="player-head"><h2 id="player-title">Kane recording</h2><button type="button" id="close">Close</button></div><video muted controls playsinline preload="none" aria-labelledby="player-title"></video><a id="original">Open complete recording ↗</a></dialog>
</body></html>\n`
  await writeFile(path.join(ROOT,'site/index.html'),html)
}
