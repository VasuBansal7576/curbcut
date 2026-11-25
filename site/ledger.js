const repo = 'https://github.com/VasuBansal7576/curbcut'
const raw = 'https://raw.githubusercontent.com/VasuBansal7576/curbcut/main/'
export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]))
export function evidenceLink(file, pages) {
  const [pathname, anchor] = file.split('#')
  const encoded = pathname.split('/').map(encodeURIComponent).join('/') + (anchor ? '#'+encodeURIComponent(anchor) : '')
  if (!pages) return '../' + encoded
  return (/\.(mp4|evidence)$/.test(file) ? raw : repo + '/blob/main/') + encoded
}
function videoLink(entry, run, label, link) {
  const title = esc(entry.site + ' · ' + run.phase + ' recording')
  return `<a data-phase="${run.phase}" data-recording="${title}" href="${link(run.file)}">${label}<span class="sr"> · ${title}</span></a>`
}

const previewSites = new Map([
  ['v4-86f207deeb57-7bc09a21', 'mass'],
  ['v6-5193be8805ece27f858e', 'munich'],
  ['v5-c22b9bdca86b-71a63d77', 'worms']
])

export function ledgerRow(entry, index, pages) {
  const link = file => evidenceLink(file, pages)
  const proofLink = (file, label) => `<a href="${link(file)}">${label}</a>`
  const {site, domain, barrier, persona, proofType, recordings, measurement, task} = entry
  const id = 'detail-' + entry.id
  const runs = recordings.map(run => `<div><strong>${run.phase}</strong> ${videoLink(entry, run, 'Recording', link)} · ${proofLink(run.pack,'Evidence pack')}${run.localVerdict ? ` · Original trace: ${esc(run.verdict)} · Local check: ${esc(run.localVerdict)}` : ''}</div>`).join('')
  const preview = previewSites.get(entry.id)
  const clips = preview ? ` class="replay" data-preview-before="assets/previews/${preview}-before.mp4" data-preview-after="assets/previews/${preview}-after.mp4"` : ''
  return `<tbody${clips} data-site="${esc(domain)}" data-barrier="${esc(barrier)}" data-persona="${esc(persona)}" data-proof="${proofType}"${index >= 5 ? ' hidden' : ''}>
    <tr><th scope="row"><button class="expand" aria-expanded="false" aria-controls="${id}"><span class="toggle" aria-hidden="true">+</span>${esc(site)}</button></th>
    <td>${esc(barrier)}</td><td class="persona">${esc(persona)}</td><td><span class="proof-kind ${proofType.toLowerCase()}">${proofType}</span></td></tr>
    <tr class="details" id="${id}" hidden><td colspan="4"><p>${esc(task)}</p><p class="detail-persona">Browsing method · ${esc(persona)}</p>
    <div class="runs">${runs}</div><div class="detail-links">${recordings.length ? proofLink('evidence/'+entry.id+'/report.md', 'Full evidence report') : ''}${measurement ? proofLink(measurement,'Local measurements') : ''}${proofLink('patches/'+entry.id+'.json','Patch JSON')}</div></td></tr></tbody>`
}
