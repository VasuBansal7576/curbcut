const shapes = {
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  cart: '<path d="M2 4h3l3 12h11l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
  next: '<path d="m8 3 9 9-9 9"/>',
  sound: '<path d="M3 9h4l5-5v16l-5-5H3zM16 8q5 4 0 8m3-11q8 7 0 14"/>',
  tab: '<path d="M3 12h15m-6-7 7 7-7 7M21 5v14"/>',
  clipboard:
    '<rect x="4" y="5" width="16" height="17" rx="2"/><rect x="8" y="2" width="8" height="6" rx="1"/>',
}
export const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7">${shapes[name]}</svg>`
export const mark =
  '<svg class="mark" aria-hidden="true" viewBox="0 0 44 25" fill="none"><path stroke="currentColor" stroke-width="5" d="M1 6h12l15 13h15"/></svg>'

export function opening(download) {
  return `<section class="opening" id="opening" aria-labelledby="hero-title">
  <div class="frame hero-grid"><div class="hero-copy"><p class="kicker"><i class="signal"></i> Accessibility, in the browser</p>
  <h1 id="hero-title">Put your<br>mouse <em>down.</em></h1>
  <p class="lead">A Chrome extension that fixes real websites as you browse. Built for keyboard users, screen reader users, and people with low vision.</p>
  <p class="trust">Each fix links to its evidence. Inspect the recorded runs or open the local browser measurement.</p>
  <a class="primary" href="${download}">Download extension <span aria-hidden="true">↗</span></a></div>
  <div class="demo"><div class="orbit" aria-hidden="true"></div><div class="demo-head mono"><span><i class="light"></i> Keyboard simulation</span><a href="#reader-title">Skip demo ↓</a></div>
  <div class="browser"><div class="chrome" aria-hidden="true"><span>● ● ●</span> fieldnotes.example <span>⌁</span></div>
  <div class="mini-nav"><b>Fieldnotes<span>.</span></b><div aria-label="Simulated navigation" role="group"><button type="button" data-demo="Home">Home</button><button type="button" data-demo="Index">Index</button><button type="button" data-demo="Menu">Menu ≡</button></div></div>
  <div class="journal"><img src="assets/steps.jpg" width="1100" height="733" alt="A coral concrete staircase spirals into a lavender sky"><div class="cover"><span>Architecture journal</span><b>Ways<br><i>up.</i></b></div></div></div>
  <div class="demo-tools"><button class="key" id="simulate" type="button" aria-label="Tab — advance simulated focus one step"><span>Tab</span>${icon('tab')}</button><div class="demo-caption"><strong>Try the Tab key.</strong><span id="demo-status" role="status">Follow focus through the menu, or tap Tab here.</span></div></div></div></div>
  <div class="frame hero-foot"><span>For millions of people, this is the web.</span><a href="#reader-title">Scroll to listen <span aria-hidden="true">↓</span></a></div>
  </section>`
}

export function reader() {
  const voices = [
    ['search', 'button', 'Search'],
    ['menu', 'button', 'Menu'],
    ['cart', 'link', 'Cart'],
    ['next', 'button', 'Next slide'],
  ]
  return `<section class="reader paper scene" id="reader"><div class="frame"><p class="kicker"><i class="signal"></i> Screen reader</p>
  <h2 id="reader-title" tabindex="-1">Give it a <em>name.</em></h2><p class="intro">Without an accessible name, the shape of a control disappears when you hear it.</p>
  <div class="voice-deck" aria-hidden="true">${voices.map(([shape, role, name]) => `<div class="voice"><div class="voice-icon">${icon(shape)}</div><div class="voice-word"><span>${role}.</span><strong>${name}.</strong></div></div>`).join('')}<div class="read-cursor"></div></div>
  <div class="reader-foot"><p><b>Before</b> Button. Button. Link. Button.<br><b>After</b> Search. Menu. Cart. Next slide.</p><button type="button" class="outline" id="speak" hidden>${icon('sound')} Hear the difference</button></div></div></section>`
}

export function contrast() {
  return `<section class="contrast scene" id="contrast"><div class="frame contrast-grid"><div><p class="kicker"><i class="signal"></i> Low vision</p><h2>Bring it<br>into <em>view.</em></h2><p class="intro">The sample says “Can you read this?” Scroll to raise its contrast until it reaches the AA threshold for ordinary text.</p></div>
  <div class="specimen"><div class="spec-head mono"><span>Contrast specimen</span><span>Aa</span></div><div class="spec-body" aria-hidden="true"><span id="faint"></span></div><p class="sr">The sample reads “Can you read this?” Its contrast increases to 4.5 to 1.</p><div class="meter" aria-hidden="true"><i></i></div><div class="spec-foot"><strong id="ratio" aria-hidden="true">4.5:1</strong><span>AA threshold<br>4.5 to 1</span></div></div></div></section>`
}

function rampArtwork() {
  const project = ([x, y, z]) =>
    [92 + x * 40 + y * 27, 216 + x * 10 - y * 23 - z * 64]
      .map((n) => n.toFixed(1))
      .join(' ')
  const path = (points) => 'M' + points.map(project).join('L') + 'Z'
  const face = (points, fill, start = points) =>
    `<path fill="${fill}" d="${path(points)}"${start === points ? '' : ` data-from="${path(start)}" data-to="${path(points)}"`}/>`
  const slope = (x, y) => (x >= 3 && x <= 7 ? Math.min(1, y / 2.6) : 1)
  const top = (coords, fill) =>
    face(
      coords.map(([x, y]) => [x, y, slope(x, y)]),
      fill,
      coords.map(([x, y]) => [x, y, 1]),
    )
  const slopeFace = top(
    [
      [3, 0],
      [7, 0],
      [7, 2.6],
      [3, 2.6],
    ],
    'var(--ramp)',
  )
  const dots = []
  for (let x = 3.22; x < 7; x += 0.38)
    for (let y = 0.21; y < 0.84; y += 0.24) {
      const coord = project([x, y, slope(x, y)]).split(' ')
      const start = project([x, y, 1]).split(' ')
      dots.push(
        `<ellipse cx="${coord[0]}" cy="${coord[1]}" rx="3.5" ry="1.45" fill="var(--stud)" stroke="none" data-up="${start[1]}" data-down="${coord[1]}"/>`,
      )
    }
  let surfaces = face(
    [
      [0, -1.65, -0.13],
      [10, -1.65, -0.13],
      [10, 3.75, -0.13],
      [0, 3.75, -0.13],
    ],
    'var(--blue-shadow)',
  )
  surfaces += face(
    [
      [0, 0, 0],
      [2, 0, 0],
      [2, 0, 1],
      [0, 0, 1],
    ],
    'var(--kerb-front)',
  )
  surfaces += face(
    [
      [8, 0, 0],
      [10, 0, 0],
      [10, 0, 1],
      [8, 0, 1],
    ],
    'var(--kerb-front)',
  )
  surfaces += face(
    [
      [10, 0, 0],
      [10, 3.5, 0],
      [10, 3.5, 1],
      [10, 0, 1],
    ],
    'var(--kerb-side)',
  )
  surfaces += face(
    [
      [0, 0, 1],
      [2, 0, 1],
      [3, 2.6, 1],
      [0, 2.6, 1],
    ],
    'var(--kerb)',
  )
  surfaces += top(
    [
      [2, 0],
      [3, 0],
      [3, 2.6],
    ],
    'var(--wing)',
  )
  surfaces +=
    slopeFace +
    top(
      [
        [7, 0],
        [8, 0],
        [7, 2.6],
      ],
      'var(--wing)',
    )
  surfaces += face(
    [
      [8, 0, 1],
      [10, 0, 1],
      [10, 2.6, 1],
      [7, 2.6, 1],
    ],
    'var(--kerb)',
  )
  surfaces += face(
    [
      [0, 2.6, 1],
      [10, 2.6, 1],
      [10, 3.5, 1],
      [0, 3.5, 1],
    ],
    'var(--kerb)',
  )
  surfaces += face(
    [
      [2, 0, 0],
      [3, 0, 0],
      [3, 0, 0],
      [2, 0, 1],
    ],
    'var(--kerb-front)',
    [
      [2, 0, 0],
      [3, 0, 0],
      [3, 0, 1],
      [2, 0, 1],
    ],
  )
  surfaces += face(
    [
      [3, 0, 0],
      [7, 0, 0],
      [7, 0, 0],
      [3, 0, 0],
    ],
    'var(--kerb-front)',
    [
      [3, 0, 0],
      [7, 0, 0],
      [7, 0, 1],
      [3, 0, 1],
    ],
  )
  surfaces += face(
    [
      [7, 0, 0],
      [8, 0, 0],
      [8, 0, 1],
      [7, 0, 0],
    ],
    'var(--kerb-front)',
    [
      [7, 0, 0],
      [8, 0, 0],
      [8, 0, 1],
      [7, 0, 1],
    ],
  )
  const wheel = `<g class="wheel" transform="translate(282 258)"><g transform="rotate(17)"><ellipse cx="4" cy="1" rx="24" ry="32" fill="var(--kerb-side)" stroke="var(--ink)" stroke-width="2"/><ellipse rx="24" ry="32" fill="var(--ink)"/><ellipse rx="17" ry="24" fill="var(--kerb)"/><g class="spokes" fill="none" stroke="var(--kerb-side)" stroke-width="2"><path d="M-15 0h30M0-22v44m-11-38 22 32m-22 0 22-32"/></g><path d="M-4 1l-13-36 2-13h9l-1 15L5-2z" fill="var(--coral)" stroke="var(--ink)" stroke-width="1.5"/><ellipse rx="4" ry="5" fill="var(--ink)"/></g></g>`
  return `<svg viewBox="0 35 625 335" role="img" aria-label="An isometric pavement with a lowered central ramp and tactile paving"><g stroke="var(--diagram-line)" stroke-width="1" stroke-linejoin="round">${surfaces}${dots.join('')}</g>${wheel}<g class="diagram-notes" fill="var(--white)" font-size="12" font-family="monospace"><path d="M465 175l28-42h91M178 263l-33 30H53" fill="none" stroke="var(--white)" stroke-width="1"/><text x="493" y="126">Sidewalk</text><text x="53" y="287">Street</text></g></svg>`
}

export function curb() {
  return `<section class="curb blue scene" id="curb"><div class="frame curb-grid"><div><p class="kicker"><i class="signal"></i> The curb cut</p><h2>Make a<br><em>way.</em></h2><p class="intro">Curb cuts were built for wheelchair users. A parent with a stroller, a traveler with luggage, a delivery worker with a cart — everyone gets a way through.</p></div><figure class="blueprint"><div class="draft-grid"></div>${rampArtwork()}<figcaption class="mono"><span>Street section</span><span>Raised curb → level entry</span></figcaption></figure></div></section>`
}

export function dotField(percent) {
  const count = 1000
  const filled = Math.round((count * percent) / 100)
  return `<svg class="dots" viewBox="0 0 500 200" role="img" aria-label="${filled} of ${count} dots" data-count="${filled}"><defs><pattern id="dot-grid" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="3.6" fill="white"/></pattern><mask id="dots-mask"><rect width="500" height="200" fill="url(#dot-grid)"/></mask></defs><g mask="url(#dots-mask)"><rect width="500" height="200" fill="var(--inactive-dot)"/><path class="dot-fill" fill="var(--cobalt)" d="${dotPath(filled)}"/></g></svg>`
}
export function dotPath(n) {
  const rows = Math.floor(n / 50) * 10,
    rest = (n % 50) * 10
  return `M0 0H500V${rows}H${rest}v10H0Z`
}
