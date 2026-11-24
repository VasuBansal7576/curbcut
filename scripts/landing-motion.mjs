const plate = document.querySelector('.focus-plate')
const image = plate.querySelector('img')
const buttons = document.querySelectorAll('button[data-step]')
const status = document.querySelector('#focus-status')
const captions = ['About has focus. Its links are hidden.', 'Arrow Down leaves focus on About. The DHE is still hidden.', 'Curb Cut opens the submenu when About receives focus.', 'The next Tab reaches The DHE.']
function show(button) {
  const step = Number(button.dataset.step)
  plate.dataset.step = step
  image.src = 'assets/mass-' + (step < 2 ? 'off' : 'on') + '-10.jpg'
  image.alt = 'Mass.edu navigation with the About menu ' + (step < 2 ? 'closed' : 'open')
  status.textContent = captions[step]
  for (const control of buttons) control.setAttribute('aria-pressed', String(control === button))
}
for (const button of buttons) {
  button.addEventListener('focus', () => show(button))
  button.addEventListener('click', () => show(button))
}
show(buttons[0])
const switcher = document.querySelector('.site-switcher')
const siteButtons = [...switcher.children]
function selectSite(selected) {
  for (const button of siteButtons) {
    const active = button === selected
    const panel = document.getElementById(button.getAttribute('aria-controls'))
    button.setAttribute('aria-pressed', String(active))
    if (!active) panel.querySelector('video').pause()
    panel.hidden = !active
  }
}
for (const button of siteButtons) button.addEventListener('click', () => selectSite(button))
for (const panel of document.querySelectorAll('.replay')) {
  const video = panel.querySelector('video')
  panel.addEventListener('click', event => {
    const link = event.target.closest('a[data-recording]')
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    video.src = link.href
    video.setAttribute('aria-label', link.dataset.recording)
    video.play().catch(() => {})
  })
}
selectSite(siteButtons[0])
switcher.hidden = false
const contrastToggle = document.querySelector('#contrast-toggle')
contrastToggle.addEventListener('click', () => {
  const repaired = contrastToggle.getAttribute('aria-pressed') !== 'true'
  contrastToggle.setAttribute('aria-pressed', String(repaired))
  const photo = document.querySelector('#contrast-photo')
  photo.src = 'assets/contrast-' + (repaired ? 'on' : 'off') + '.jpg'
  photo.alt = 'ExtremeTerrain product page with the ' + (repaired ? 'repaired' : 'original') + ' Details link'
  document.querySelector('#contrast-status').textContent = repaired ? 'Repaired · 4.501 to 1' : 'Original · 4.387 to 1'
})

const ring = document.querySelector('#travel-ring')
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const scrub = matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 640px)')
const protocol = document.querySelector('#protocol')
const track = protocol.querySelector('.run-track')
const stage = track.querySelector('.run-stage')
const phases = [...stage.querySelectorAll('.run')]
const phaseTabs = stage.querySelector('.phase-tabs')
const phaseButtons = [...phaseTabs.children]
const nameButton = document.querySelector('#name-button')
const spoken = document.querySelector('#spoken-name')
let keyboardSubject = null
let frame = 0
let position
let manualName = false

function setName(named) {
  if (nameButton.getAttribute('aria-pressed') === String(named)) return
  nameButton.setAttribute('aria-pressed', String(named))
  spoken.textContent = named ? 'Vorherige Folie.' : 'Button.'
  spoken.lang = named ? 'de' : 'en'
  const capture = document.querySelector('.munich img')
  capture.src = 'assets/reader-' + (named ? 'on' : 'off') + '.jpg'
  capture.alt = named ? 'Munich Airport reading view with the previous-slide name' : 'Munich Airport reading view with an unnamed button'
}
nameButton.addEventListener('click', () => {
  manualName = true
  setName(nameButton.getAttribute('aria-pressed') !== 'true')
})

function syncRuns() {
  protocol.classList.toggle('scrubbing', scrub.matches)
  phaseTabs.hidden = !scrub.matches
  const bounds = track.getBoundingClientRect()
  const travel = Math.max(1, bounds.height - stage.offsetHeight)
  const progress = Math.min(3.9999, Math.max(0, -bounds.top / travel * phases.length))
  const active = Math.floor(progress)
  phases.forEach((phase, index) => {
    phase.hidden = scrub.matches && index !== active
    phaseButtons[index].setAttribute('aria-pressed', String(index === active))
    const video = phase.querySelector('video')
    if (!video || !scrub.matches || index !== active || bounds.top > innerHeight || bounds.bottom < 0) return
    if (!video.hasAttribute('src')) {
      video.src = video.dataset.src
      video.preload = 'auto'
    }
    if (!video.seeking && Number.isFinite(video.duration)) {
      const time = Math.min(video.duration - .04, video.duration * (progress - active))
      if (video.seekable.length && time <= video.seekable.end(video.seekable.length - 1) && Math.abs(video.currentTime - time) > .12) video.currentTime = Math.max(0,time)
    }
  })
}
for (const video of stage.querySelectorAll('video')) {
  video.addEventListener('loadedmetadata', schedule)
  video.addEventListener('seeked', schedule)
}
phaseButtons.forEach((button,index) => button.addEventListener('click', () => {
  const distance = track.offsetHeight - stage.offsetHeight
  scrollBy({top:track.getBoundingClientRect().top + distance * (index + .015) / phases.length, behavior:'instant'})
  keyboardSubject = phases[index].querySelector('[data-subject]')
  schedule()
}))

const subjects = [...document.querySelectorAll('[data-subject],.inventory strong,.replay h3,.ledger-table caption + thead th:first-child,.label-sheet strong')]
function visibleRect(el) {
  if (!el || !el.getClientRects().length) return null
  const rect = el.getBoundingClientRect()
  return rect.bottom > 0 && rect.top < innerHeight && rect.width ? rect : null
}
function draw() {
  frame = 0
  syncRuns()
  const reader = document.querySelector('.reader-target')
  if (!manualName) setName(reader.getBoundingClientRect().top < innerHeight * .5)
  let subject = visibleRect(keyboardSubject) ? keyboardSubject : null
  if (!subject) {
    let nearest = Infinity
    for (const el of subjects) {
      const rect = visibleRect(el)
      if (!rect) continue
      const distance = Math.abs(rect.top + rect.height / 2 - innerHeight * .48)
      if (distance < nearest) { nearest = distance; subject = el }
    }
  }
  if (subject?.parentNode === plate && plate.dataset.step === '1') {
    ring.hidden = true
    return
  }
  const rect = subject?.getBoundingClientRect()
  const destination = rect
    ? [rect.left - 5, rect.top - 5, rect.width + 10, rect.height + 10]
    : [12, innerHeight * .48, 22, 16]
  if (!position || reduced.matches) position = destination.slice()
  const moving = position.some((v,i) => Math.abs(v - destination[i]) > .6)
  const lastX = position[0], lastY = position[1]
  position = position.map((v,i) => moving ? v + (destination[i] - v) * .23 : destination[i])
  ring.hidden = false
  ring.classList.toggle('moving',moving)
  ring.style.transform = 'translate3d('+position[0]+'px,'+position[1]+'px,0)'
  ring.style.width = position[2]+'px'
  ring.style.height = position[3]+'px'
  ring.style.setProperty('--trail-x',Math.max(-16,Math.min(16,lastX-position[0]))+'px')
  ring.style.setProperty('--trail-y',Math.max(-16,Math.min(16,lastY-position[1]))+'px')
  if (moving) schedule()
}
function schedule() { if (!frame) frame = requestAnimationFrame(draw) }
document.addEventListener('focusin', event => {
  const target = event.target
  keyboardSubject = target.matches('[data-step]') ? plate.querySelector('[data-subject]') :
    target === nameButton ? document.querySelector('.reader-target') :
    target === contrastToggle ? document.querySelector('.details-target') : target
  schedule()
})
for (const type of ['wheel','touchmove']) window.addEventListener(type, () => { keyboardSubject = null }, {passive:true})
for (const type of ['scroll','resize','load']) window.addEventListener(type,schedule,{passive:true})
scrub.addEventListener('change',schedule)
document.fonts.ready.then(schedule)
schedule()
