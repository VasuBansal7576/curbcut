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
for (const card of document.querySelectorAll('.replay')) {
  const still = card.querySelector('.still')
  const video = still.querySelector('video')
  const repaired = card.querySelector('a.verdict.pass')
  const stop = () => {
    video.pause()
    still.classList.remove('previewing')
  }
  const play = (event) => {
    if (
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.querySelector('#player').open
    )
      return
    const link = event.target.closest('a')
    const source = link?.dataset.recording ? link : repaired
    if (link && !link.dataset.recording) return stop()
    const clip = source.classList.contains('fail')
      ? card.dataset.previewBefore
      : card.dataset.previewAfter
    if (video.getAttribute('src') !== clip) video.src = clip
    video.muted = true
    video
      .play()
      .then(() => {
        if (!video.paused) still.classList.add('previewing')
      })
      .catch(() => {})
  }
  card.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'mouse') play(event)
  })
  card.addEventListener('focusin', play)
  card.addEventListener('pointerleave', stop)
  card.addEventListener('focusout', (event) => {
    if (!card.contains(event.relatedTarget)) stop()
  })
  card.addEventListener('click', stop)
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') stop()
  })
  video.addEventListener('ended', stop)
  const visibility = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) stop()
  })
  visibility.observe(card)
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener(
    'change',
    stop,
  )
}
const contrastToggle = document.querySelector('#contrast-toggle')
contrastToggle.addEventListener('click', () => {
  const repaired = contrastToggle.getAttribute('aria-pressed') !== 'true'
  contrastToggle.setAttribute('aria-pressed', String(repaired))
  const photo = document.querySelector('#contrast-photo')
  photo.src = 'assets/contrast-' + (repaired ? 'on' : 'off') + '.jpg'
  photo.alt = 'ExtremeTerrain product page with the ' + (repaired ? 'repaired' : 'original') + ' Details link'
  document.querySelector('#contrast-status').textContent = repaired ? 'Repaired · 4.501 to 1' : 'Original · 4.387 to 1'
})
