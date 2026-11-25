const repairSection = document.querySelector('#repair')
const repairToggle = repairSection.querySelector('.repair-switch')
const capture = document.querySelector('#capture')
const about = capture.querySelector('.about-target')
const destination = document.querySelector('#destination')
const statusText = document.querySelector('#case-status')
const stateLabel = document.querySelector('[data-state-label]')
const still = capture.querySelector('img')
const automatic = matchMedia('(min-width:761px) and (min-height:681px) and (prefers-reduced-motion:no-preference)')
let chosenByVisitor = false
let enabled = false

function showMenu(open) {
  capture.dataset.open = String(open)
  about.setAttribute('aria-expanded', String(open))
  destination.hidden = !open
  still.alt = open ? 'Mass.edu’s About menu with The DHE visible as its first link' : 'Mass.edu’s About menu in the closed state'
}

function setRepair(value) {
  enabled = value
  repairToggle.setAttribute('aria-checked', String(value))
  repairToggle.querySelector('span').textContent = value ? 'Curb Cut on' : 'Curb Cut off'
  stateLabel.textContent = value ? 'With fix' : 'Without fix'
  statusText.textContent = value ? 'Keyboard focus opens About. The DHE is reachable.' : 'Arrow Down leaves the menu closed.'
  showMenu(value)
}

function followScroll() {
  if (chosenByVisitor || !automatic.matches) return
  const travel = parseFloat(getComputedStyle(repairSection, '::after').height)
  const value = travel > 0 && repairSection.getBoundingClientRect().top < -travel / 2
  if (enabled !== value) setRepair(value)
}

function tryAbout() {
  chosenByVisitor = true
  showMenu(enabled)
  statusText.textContent = enabled ? 'About is open. Press Tab to reach The DHE.' : 'About has focus. Its links are still hidden.'
}

repairToggle.hidden = false
about.hidden = false
repairToggle.addEventListener('click', () => {
  chosenByVisitor = true
  setRepair(!enabled)
})
about.addEventListener('focus', tryAbout)
about.addEventListener('click', tryAbout)
about.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    tryAbout()
    if (enabled) destination.focus()
    else statusText.textContent = 'Arrow Down leaves the menu closed. Turn Curb Cut on to try the repair.'
  }
})
destination.addEventListener('focus', () => {
  chosenByVisitor = true
  statusText.textContent = 'The DHE has focus. Enter follows the link.'
})
window.addEventListener('scroll', followScroll, {passive:true})
automatic.addEventListener('change', followScroll)
followScroll()
