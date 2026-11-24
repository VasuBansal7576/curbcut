import gsap from 'gsap'
import { dotPath } from './landing-scenes.mjs'
import { ScrollTrigger } from 'gsap/ScrollTrigger.js'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

const one = (selector) => document.querySelector(selector)
const all = (selector) => [...document.querySelectorAll(selector)]
const motion = gsap.matchMedia()
const demo = one('.demo')
const buttons = all('[data-demo]')
const status = one('#demo-status')
let demoStep = -1

function visit(step) {
  demoStep = step
  const blocked = step === buttons.length - 1
  demo.classList.toggle('blocked', blocked)
  buttons.forEach((button, index) =>
    button.classList.toggle('active', index === step),
  )
  status.textContent = blocked
    ? 'Menu reached. It stays closed. Tab continues beyond the demo.'
    : buttons[step].dataset.demo + ' has focus. Keep going.'
}
buttons.forEach((button, index) => {
  button.addEventListener('focus', () => visit(index))
  button.addEventListener('click', () => visit(index))
})
one('#simulate').addEventListener('click', () =>
  visit((demoStep + 1) % buttons.length),
)

const speak = one('#speak')
if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
  speak.hidden = false
  const label = speak.lastChild
  let speech
  const stop = () => {
    speech = null
    speechSynthesis.cancel()
    label.textContent = ' Hear the difference'
  }
  speak.addEventListener('click', () => {
    if (speech) return stop()
    speech = new SpeechSynthesisUtterance(
      'Before. Button. Button. Link. Button. After. Search. Menu. Cart. Next slide.',
    )
    speech.lang = 'en'
    speech.rate = 0.92
    speech.onend = speech.onerror = () => {
      speech = null
      label.textContent = ' Hear the difference'
    }
    label.textContent = ' Stop listening'
    speechSynthesis.speak(speech)
  })
  window.addEventListener('pagehide', stop)
}

const sectionProgress = (
  trigger,
  onUpdate,
  start = 'top 82%',
  end = 'bottom 58%',
) =>
  ScrollTrigger.create({
    trigger,
    start,
    end,
    onUpdate: (self) => onUpdate(self.progress),
    onRefresh: (self) => onUpdate(self.progress),
  })

motion.add('(prefers-reduced-motion: no-preference)', () => {
  const tween = (
    target,
    from,
    to,
    trigger,
    start = 'top 90%',
    end = 'center 52%',
  ) =>
    gsap.fromTo(target, from, {
      ...to,
      ease: 'none',
      scrollTrigger: { trigger, start, end, scrub: true },
    })

  tween(
    '.browser',
    { rotation: 2.5, y: 0 },
    { rotation: -1.5, y: 16 },
    '.opening',
    'top top',
    'bottom 15%',
  )
  tween(
    '.orbit',
    { rotation: -22 },
    { rotation: 0 },
    '.opening',
    'top top',
    'bottom 15%',
  )
  const voiceNames = all('.voice-word strong')
  const voiceTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '.reader',
      start: 'top 78%',
      end: 'center 50%',
      scrub: true,
    },
  })
  voiceTimeline.set('.read-cursor', { opacity: 1 }, 0)
  voiceNames.forEach((name, i) => {
    voiceTimeline.to(
      '.read-cursor',
      { xPercent: i * 100, duration: 0.65, ease: 'power2.inOut' },
      i,
    )
    voiceTimeline.fromTo(
      name,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 0.55 },
      i + 0.35,
    )
  })
  const faint = one('#faint'),
    ratio = one('#ratio'),
    meter = one('.meter i')
  sectionProgress(
    '.contrast',
    (progress) => {
      const measured = 1.15 + progress * 3.4
      const luminance = 1.05 / measured - 0.05
      const grey = Math.round((1.055 * luminance ** (1 / 2.4) - 0.055) * 255)
      faint.style.color = `rgb(${grey} ${grey} ${grey})`
      const actual = 1.05 / (((grey / 255 + 0.055) / 1.055) ** 2.4 + 0.05)
      ratio.textContent = actual.toFixed(1) + ':1'
      meter.style.transform = 'scaleX(' + progress + ')'
    },
    'top 77%',
    'center 51%',
  )

  const curbTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: '.curb',
      start: 'top 77%',
      end: 'center 50%',
      scrub: true,
    },
  })
  all('.blueprint [data-from]').forEach((face) =>
    curbTimeline.fromTo(
      face,
      { attr: { d: face.dataset.from } },
      { attr: { d: face.dataset.to }, duration: 1, ease: 'power1.inOut' },
      0,
    ),
  )
  all('.blueprint [data-up]').forEach((dot) =>
    curbTimeline.fromTo(
      dot,
      { attr: { cy: dot.dataset.up } },
      { attr: { cy: dot.dataset.down }, duration: 1, ease: 'power1.inOut' },
      0,
    ),
  )

  curbTimeline.fromTo(
    '.wheel',
    { attr: { transform: 'translate(363 132)' } },
    {
      attr: { transform: 'translate(282 258)' },
      duration: 0.52,
      ease: 'power1.inOut',
    },
    0.48,
  )
  curbTimeline.fromTo(
    '.spokes',
    { rotation: -100, svgOrigin: '0 0' },
    { rotation: 0, duration: 0.52, ease: 'none' },
    0.48,
  )

  const dots = one('.dots'),
    fill = one('.dot-fill'),
    total = one('[data-total]')
  sectionProgress(
    '.scale-grid',
    (progress) => {
      const n = Math.round(progress * Number(dots.dataset.count))
      fill.setAttribute('d', dotPath(n))
    },
    'top 81%',
    'center 52%',
  )
  sectionProgress(
    '.inventory',
    (progress) => {
      total.textContent = Math.round(Number(total.dataset.total) * progress)
    },
    'top 92%',
    'center 73%',
  )
  all('.replay').forEach((card, i) =>
    tween(card, { y: 22 + 10 * i }, { y: 0 }, card),
  )
  tween(
    '.ledger h2 em',
    { clipPath: 'inset(0 95% 0 0)' },
    { clipPath: 'inset(0 -10% 0 0)' },
    '.ledger',
  )
  tween(
    '.label-sheet',
    { rotation: -8, y: 18 },
    { rotation: -3, y: 0 },
    '.experiment',
  )
  tween(
    '.label-result',
    { xPercent: 1, rotation: 5 },
    { xPercent: 0, rotation: 2 },
    '.experiment',
  )
  tween('.film', { y: 30, rotation: 2 }, { y: 0, rotation: 0 }, '.ending')
  const resize = new ResizeObserver(() => ScrollTrigger.refresh())
  resize.observe(one('.ledger'))
  resize.observe(one('.studies-more'))
  return () => {
    resize.disconnect()
    faint.style.removeProperty('color')
    ratio.textContent = '4.5:1'
    meter.style.removeProperty('transform')
    const n = Number(dots.dataset.count)
    fill.setAttribute('d', dotPath(n))
    total.textContent = total.dataset.total
  }
})
motion.add(
  '(min-width:761px) and (min-height:640px) and (prefers-reduced-motion: no-preference)',
  () => {
    const protocol = one('.protocol'),
      controls = one('.step-buttons')
    const stepButtons = [...controls.children],
      frames = all('.proof-frame')
    const select = (index) => {
      frames.forEach((frame, i) => {
        frame.hidden = i !== index
      })
      stepButtons.forEach((button, i) =>
        button.setAttribute('aria-pressed', String(i === index)),
      )
    }
    protocol.classList.add('scrub')
    controls.hidden = false
    select(0)
    let scrollStep = 0
    let manual = false
    const resume = () => {
      manual = false
    }
    const onSelect = (event) => {
      const button = event.target.closest('button')
      if (button) {
        manual = true
        select(stepButtons.indexOf(button))
      }
    }
    controls.addEventListener('click', onSelect)
    window.addEventListener('wheel', resume, { passive: true })
    window.addEventListener('touchmove', resume, { passive: true })
    window.addEventListener('keydown', resume)
    sectionProgress(
      protocol,
      (progress) => {
        const index = Math.min(3, Math.floor(progress * 4))
        if (
          !manual &&
          index !== scrollStep &&
          !one('.proof-projector').contains(document.activeElement)
        ) {
          scrollStep = index
          select(index)
        }
      },
      'top top',
      'bottom bottom',
    )
    return () => {
      controls.removeEventListener('click', onSelect)
      window.removeEventListener('wheel', resume)
      window.removeEventListener('touchmove', resume)
      window.removeEventListener('keydown', resume)
      controls.hidden = true
      protocol.classList.remove('scrub')
      frames.forEach((frame) => {
        frame.hidden = false
      })
    }
  },
)
document.fonts.ready.then(() => ScrollTrigger.refresh())

for (const card of all('.replay')) {
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
      one('#player').open
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
