const hero = document.querySelector('.hero-demo')
const photo = hero.querySelector('.mass-image')
const about = hero.querySelector('.about-target')
const destination = hero.querySelector('#destination')
const repairSwitch = hero.querySelector('.repair-switch')
const heroStatus = hero.querySelector('#case-status')
const key = hero.querySelector('.key')
const prefersMotion = matchMedia('(prefers-reduced-motion:no-preference)')
let enabled = true

function explainFocus(onLink) {
  hero.dataset.focus = onLink ? 'link' : 'about'
  heroStatus.textContent = onLink ? 'The DHE has keyboard focus.' :
    enabled ? 'One Tab press opens About.' : 'About has focus. Its links stay hidden.'
}

function setPopup(browser, visible) {
  browser.querySelector('.popup').hidden = !visible
  browser.querySelector('.pinned').setAttribute('aria-expanded', String(visible))
}

for (const browser of document.querySelectorAll('.browser')) {
  const pinned = browser.querySelector('.pinned')
  pinned.addEventListener('click', () => setPopup(browser, pinned.getAttribute('aria-expanded') !== 'true'))
}

repairSwitch.addEventListener('click', () => {
  enabled = !enabled
  repairSwitch.setAttribute('aria-checked', String(enabled))
  repairSwitch.textContent = enabled ? 'Fix on' : 'Fix off'
  const prefix = 'assets/product/mass-' + (enabled ? 'after-' : 'before-')
  hero.querySelector('picture source').srcset = prefix + '680.webp'
  photo.src = prefix + '1360.webp'
  photo.alt = enabled ? 'About opens with The DHE as the first link' : 'Mass.edu’s About menu remains closed'
  about.setAttribute('aria-expanded', String(enabled))
  destination.hidden = !enabled
  const browser = hero.querySelector('.browser')
  browser.querySelector('.pinned').disabled = !enabled
  setPopup(browser,enabled)
  explainFocus(false)
})
about.addEventListener('focus', () => explainFocus(false))
destination.addEventListener('focus', () => explainFocus(true))
about.addEventListener('click', () => enabled ? destination.focus() : explainFocus(false))
about.addEventListener('keydown', event => {
  if (event.key !== 'ArrowDown') return
  event.preventDefault()
  if (enabled) destination.focus()
  else explainFocus(false)
})
key.addEventListener('click', () => {
  about.focus({preventScroll:true})
  if (prefersMotion.matches) {
    key.querySelector('.k-cap').animate([{transform:'none'},{transform:'translateY(9%)'},{transform:'none'}],{duration:180})
  }
  heroStatus.textContent = enabled ? 'About is open. Press Tab for The DHE.' : 'The menu stayed closed. Turn on the fix to try again.'
})

const menu = document.querySelector('.hamburger')
const links = document.querySelector('.nav-links')
const narrow = matchMedia('(max-width: 880px)')
function setNavigation(open) {
  menu.hidden = !narrow.matches
  links.hidden = narrow.matches && !open
  menu.setAttribute('aria-expanded',String(narrow.matches && open))
}
menu.addEventListener('click', () => setNavigation(links.hidden))
links.addEventListener('click', event => {
  if (!narrow.matches) return
  const selected = event.target.closest('a')
  if (!selected) return
  setNavigation(false)
  const section = document.querySelector(selected.hash)
  section.tabIndex = -1
  section.focus()
})
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && narrow.matches && !links.hidden) {
    setNavigation(false)
    menu.focus()
  }
})
narrow.addEventListener('change', () => setNavigation(false))
setNavigation(false)

let guided = true
let framePending = false
function followRecordedStop() {
  framePending = false
  if (!guided || !prefersMotion.matches) return
  const rect = about.getBoundingClientRect()
  if (rect.bottom < 0 || rect.top > innerHeight) return
  const nextStop = scrollY > 30 && rect.top < innerHeight * .32
  if ((hero.dataset.focus === 'link') === nextStop) return
  hero.dataset.focus = nextStop ? 'link' : 'about'
  heroStatus.textContent = nextStop ? 'The next Tab reaches The DHE.' : 'One Tab press opens About.'
}
hero.addEventListener('focusin', () => { guided = false })
hero.addEventListener('pointerdown', () => { guided = false })
window.addEventListener('scroll', () => {
  if (guided && prefersMotion.matches && !framePending) {
    framePending = true
    requestAnimationFrame(followRecordedStop)
  }
},{passive:true})
