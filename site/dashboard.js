const filters = document.querySelector('#filters')
const groups = [...document.querySelectorAll('.ledger-table tbody')]
const previous = document.querySelector('#prev')
const next = document.querySelector('#next')
const count = document.querySelector('#count')
const player = document.querySelector('#player')
const video = player.querySelector('video')
const pageSize = 5
let page = 0

function renderLedger() {
  const values = Object.fromEntries(new FormData(filters))
  const matches = groups.filter(group => group.dataset.site.includes(values.site.trim().toLowerCase()) &&
    ['barrier','persona','proof'].every(key => !values[key] || group.dataset[key] === values[key]))
  const start = page * pageSize
  const visible = new Set(matches.slice(start, start + pageSize))
  for (const group of groups) {
    group.hidden = !visible.has(group)
    if (group.hidden) {
      group.querySelector('.details').hidden = true
      group.querySelector('.expand').setAttribute('aria-expanded', 'false')
    }
  }
  count.textContent = matches.length ? `${start+1}–${Math.min(start+pageSize,matches.length)} of ${matches.length} fixes` : '0 fixes'
  document.querySelector('#empty').hidden = matches.length > 0
  previous.disabled = page === 0
  next.disabled = start + pageSize >= matches.length
}

filters.addEventListener('submit', event => event.preventDefault())
filters.addEventListener('input', () => { page = 0; renderLedger() })
previous.addEventListener('click', () => { page--; renderLedger(); if (previous.disabled) next.focus() })
next.addEventListener('click', () => { page++; renderLedger(); if (next.disabled) previous.focus() })
document.querySelector('#clear').addEventListener('click', () => {
  filters.reset()
  page = 0
  renderLedger()
  filters.elements.site.focus()
})
document.querySelector('.ledger-table').addEventListener('click', event => {
  const button = event.target.closest('.expand')
  if (!button) return
  const detail = document.getElementById(button.getAttribute('aria-controls'))
  detail.hidden = !detail.hidden
  button.setAttribute('aria-expanded', String(!detail.hidden))
})
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-recording]')
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  document.querySelector('#player-title').textContent = link.dataset.recording
  document.querySelector('#original').href = link.href
  const row = link.closest('.replay')
  const clip = link.dataset.phase === 'before' ? row?.dataset.previewBefore :
    link.dataset.phase === 'after' ? row?.dataset.previewAfter : null
  video.src = link.dataset.preview || clip || link.href
  player.showModal()
  video.play().catch(() => {})
})
document.querySelector('#close').addEventListener('click', () => player.close())
player.addEventListener('close', () => {
  video.pause()
  video.removeAttribute('src')
  video.load()
})
renderLedger()
