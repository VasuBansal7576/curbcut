for (const chapter of document.querySelectorAll('[data-choices]')) {
  const panels = Array.from(chapter.querySelectorAll('[data-panel]'))
  chapter.addEventListener('change', event => {
    const choice = event.target.closest('input[type="radio"]')
    if (!choice) return
    for (const panel of panels) {
      panel.hidden = panel.id !== choice.getAttribute('aria-controls')
      if (panel.hidden) panel.querySelector('video')?.pause()
    }
    if (chapter.id === 'contrast') {
      const capture = chapter.querySelector('.store-capture')
      capture.src = 'assets/contrast-' + (choice.value === '1' ? 'on' : 'off') + '.jpg'
    }
  })
}

document.addEventListener('play', event => {
  if (!(event.target instanceof HTMLVideoElement)) return
  for (const other of document.querySelectorAll('video')) {
    if (other !== event.target && !other.paused) other.pause()
  }
}, true)

const focusTrace = document.querySelector('.travel-focus')
const originWord = document.querySelector('.landing-word')
const sourceKey = document.querySelector('.drawing')
const menuButton = document.querySelector('.about-target')
const motionAllowed = matchMedia('(prefers-reduced-motion:no-preference)')
let nextFrame

function paintTrace() {
  nextFrame = 0
  const viewportHeight = document.documentElement.clientHeight
  const repairTop = document.querySelector('#repair').getBoundingClientRect().top
  if (!motionAllowed.matches || repairTop < -10 || scrollY < 2 || repairTop > viewportHeight * 1.6) {
    focusTrace.hidden = true
    return
  }
  const word = originWord.getBoundingClientRect()
  const key = sourceKey.getBoundingClientRect()
  const menu = menuButton.getBoundingClientRect()
  const early = Math.min(1, scrollY / (viewportHeight * .25))
  const progress = Math.max(0, Math.min(1, (viewportHeight * 1.05 - repairTop) / viewportHeight))
  const mix = (from,to,t) => from + (to - from) * t
  const width = mix(word.width + 20, menu.width + 6, progress)
  const height = mix(word.height + 5, menu.height + 6, progress)
  const startX = mix(key.left + key.width * .5, word.left + word.width / 2, early)
  const startY = mix(key.top + key.height * .5, word.top + word.height / 2, early)
  const x = mix(startX,menu.left + menu.width / 2,progress) - width / 2
  const y = mix(startY,menu.top + menu.height / 2,progress) - height / 2
  focusTrace.hidden = false
  focusTrace.style.cssText = `width:${width}px;height:${height}px;transform:translate3d(${x}px,${y}px,0);opacity:${Math.min(1, scrollY / 80)}`
}

function queueTrace() {
  if (!nextFrame) nextFrame = requestAnimationFrame(paintTrace)
}

window.addEventListener('scroll',queueTrace,{passive:true})
window.addEventListener('resize',queueTrace)
motionAllowed.addEventListener('change',queueTrace)
queueTrace()

for (const launch of document.querySelectorAll('.clip-launch')) {
  launch.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const movie = document.createElement('video')
    movie.className = 'story-clip'
    movie.controls = true
    movie.muted = true
    movie.playsInline = true
    movie.tabIndex = 0
    movie.poster = launch.querySelector('img').src
    movie.setAttribute('aria-label', launch.dataset.clip)
    if (launch.dataset.captions) {
      const track = document.createElement('track')
      track.kind = 'captions'
      track.label = 'English'
      track.srclang = 'en'
      track.src = launch.dataset.captions
      track.default = true
      movie.appendChild(track)
    }
    movie.src = launch.href
    launch.replaceWith(movie)
    movie.focus({preventScroll:true})
    movie.play().catch(() => {})
  })
}

const namingPanel = document.querySelector('#jev-0')
const replayNames = namingPanel.querySelector('.replay-names')
const namedRows = namingPanel.querySelector('.named-rows')
let namingAnimation
function replayNaming() {
  namingAnimation?.cancel()
  if (!motionAllowed.matches) return
  namingAnimation = namedRows.animate(
    [{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 100% 0)',offset:.65},{clipPath:'inset(0 0 0 0)'}],
    {duration:1137,easing:'linear'}
  )
}
replayNames.hidden = !motionAllowed.matches
replayNames.addEventListener('click',replayNaming)
motionAllowed.addEventListener('change',() => {
  replayNames.hidden = !motionAllowed.matches
  if (!motionAllowed.matches) namingAnimation?.cancel()
})
const namingObserver = new IntersectionObserver(entries => {
  if (entries.some(entry => entry.isIntersecting)) {
    replayNaming()
    namingObserver.disconnect()
  }
},{threshold:.5})
namingObserver.observe(namingPanel)
