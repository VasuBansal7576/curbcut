import path from 'node:path'
import {copyFile, mkdir, writeFile} from 'node:fs/promises'
import {opening, navigation, features} from './landing-opening.mjs'
import {examples, howChapter, mapChapter, ownerChapter, developerChapter, closing} from './landing-chapters.mjs'
import {ROOT, readJSON} from '../core/io.mjs'

import {esc, evidenceLink, ledgerRow} from '../site/ledger.js'
import {archiveExtension} from './package-extension.mjs'

const repo = 'https://github.com/VasuBansal7576/curbcut'
const pages = process.env.CURBCUT_PAGES === '1'
const link = file => evidenceLink(file, pages)
const barriers = {
  'low-contrast':'Low contrast text', 'missing-alt':'Missing image alternatives', 'missing-label':'Missing form labels',
  'empty-link':'Empty links', 'empty-button':'Empty buttons', 'missing-language':'Missing document language'
}
const personas = {
  'keyboard-only':'Keyboard only', 'screen-reader-view':'Screen reader view', 'low-vision':'Low vision',
  'low-contrast-simulation':'Low contrast sensitivity', 'document-language':'Document language', 'color-blind':'Color vision'
}
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
    const localVerdict = patch.evidence.localOracle?.[phase]
    const different = localVerdict && localVerdict !== result.status
    return {phase, file, pack:result.evidencePack,
      ...(different && {verdict:result.status, localVerdict})}
  }))
  return {id:patch.id, domain:patch.site, task:patch.task, measurement:patch.evidence.localMeasurement, site:patch.site.replace(/^www\./, ''), barrier:barrier(patch),
    persona:personas[patch.persona], proofType:local ? 'Local' : 'Kane', recordings}
}

function select(name, label, values) {
  return `<label><span>${label}</span><select name="${name}"><option value="">All ${label === 'Proof' ? 'proof' : label.toLowerCase()+'s'}</option>${[...new Set(values)].sort().map(value => `<option>${esc(value)}</option>`).join('')}</select></label>`
}

export async function buildDashboard({bundled}) {
  const entries = await Promise.all(bundled.map(ledgerEntry))
  const featured = ['v4-86f207deeb57-7bc09a21', 'draft-7565c3d5-736d-48b1-b0e2-8c38afd36147']
  const rank = entry => featured.includes(entry.id) ? featured.indexOf(entry.id) : featured.length
  entries.sort((a,b) => rank(a)-rank(b) || a.site.localeCompare(b.site,'en') || a.id.localeCompare(b.id,'en'))
  const kaneCount = entries.filter(entry=>entry.proofType==='Kane').length
  const assets = path.join(ROOT,'site/assets')
  await mkdir(assets,{recursive:true})
  const download = 'assets/curbcut-extension.zip'
  await archiveExtension({output:path.join(assets,'curbcut-extension.zip')})
  const mass = entries.find(entry=>entry.id==='v4-86f207deeb57-7bc09a21')
  const [review, plates] = await Promise.all([
    readJSON(path.join(ROOT,'proof/jev/live-naming-real-sites.json')),
    readJSON(path.join(ROOT,'launch/film/plates/index.json'))
  ])
  const film = 'launch/curbcut-launch.mp4'
  const map = entries.find(entry=>entry.id==='draft-7565c3d5-736d-48b1-b0e2-8c38afd36147')
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
  const initialRows = entries.slice(0,5).map((entry,index) => ledgerRow(entry,index,pages))
  await writeFile(path.join(ROOT,'site/library.js'), `export const pages = ${pages}\nexport const entries = ${JSON.stringify(entries.slice(5), null, 2)}\n`)
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Curb Cut — Accessibility fixes for Chrome</title><meta name="theme-color" content="#ffffff"><meta name="description" content="Curb Cut fixes mouse-only menus, unnamed buttons and faint text as you browse. Watch a real repair and inspect the evidence.">
<link rel="icon" href="assets/icon.png"><link rel="preload" as="image" href="assets/product/mass-before-680.webp" media="(max-width:760px)" fetchpriority="high"><link rel="preload" as="image" href="assets/product/mass-before-1360.webp" media="(min-width:761px)" fetchpriority="high"><link rel="preload" href="assets/fonts/inter-tight.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="style.css"><script type="module" src="dashboard.js"></script><script defer src="keystroke.js"></script><script defer src="chapters.js"></script><noscript><style>[data-panel][hidden]{display:block!important;margin-block:24px}.choices,.try-copy{display:none}</style></noscript></head>
<body><a class="skip" href="#title">Skip to content</a>${navigation(repo)}<main id="main">${opening(download, link)}
${features()}
${examples(link,plates)}
${howChapter(link,review,mass.recordings)}
${mapChapter(map.recordings, link, file=>process.env.CURBCUT_PAGES === '1' ? mapMedia.get(file) : link(file))}
${ownerChapter(link)}
${developerChapter(link)}
<section class="section wrap ledger" id="evidence"><div><h2>Fix library</h2><p class="ledger-intro">Search all ${entries.length} fixes. ${kaneCount} have Kane recordings and ${entries.length-kaneCount} have local browser measurements. Open a row to inspect the task and its evidence. <a href="#kane-label">How to read a Kane badge</a> · ${proofLink('proof/kane-batch-2026-11-25/README.md','November 25 verification results')}.</p>
<form id="filters" role="search" aria-label="Filter evidence"><label class="search"><span>Site</span><input name="site" type="search" placeholder="Search by domain" autocomplete="off"></label>
${select('barrier','Barrier',entries.map(r=>r.barrier))}${select('persona','Browsing method',entries.map(r=>r.persona))}${select('proof','Proof',entries.map(r=>r.proofType))}</form>
<noscript><p>${proofLink('patches/index.json','Open the complete fix index')} to inspect all fixes.</p></noscript>
<table class="ledger-table"><caption class="sr">Bundled fixes and supporting evidence</caption><thead><tr><th scope="col">Site</th><th scope="col">Barrier</th><th class="persona" scope="col">Browsing method</th><th scope="col">Proof</th></tr></thead>
${initialRows.join('\n')}</table><p id="empty" hidden>No matching fixes. <button type="button" id="clear">Clear filters</button></p>
<div class="pager"><span id="count" role="status" aria-live="polite"></span><div><button id="prev" type="button" aria-label="Previous page">← Previous</button><button id="next" type="button" aria-label="Next page">Next →</button></div></div></div></section>

${closing({download,link,film:process.env.CURBCUT_PAGES === '1' ? pagesFilm : link(film)})}
</main><footer class="wrap"><a class="wordmark" href="#opening"><i aria-hidden="true"></i>Curb Cut</a><a href="${repo}">GitHub ↗</a></footer>
<dialog id="player" aria-labelledby="player-title"><div class="player-head"><h2 id="player-title">Kane recording</h2><button type="button" id="close">Close</button></div><video muted controls playsinline preload="none" aria-labelledby="player-title"></video><a id="original">Open complete recording ↗</a></dialog>
</body></html>\n`
  await writeFile(path.join(ROOT,'site/index.html'),html)
}
