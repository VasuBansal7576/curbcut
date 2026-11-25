export function opening({download, repo, count}) {
  return `<header class="mast"><div class="frame mast-inner">
    <a class="wordmark" href="#opening" aria-label="Curb Cut home"><i class="mark" aria-hidden="true"></i>Curb Cut</a>
    <nav aria-label="Main navigation"><a href="#repair">The repair</a><a href="#evidence">Fix library <span class="nav-count">${count}</span></a></nav>
  </div></header>
  <section class="opening" id="opening" aria-labelledby="title"><div class="opening-stage"><div class="hero frame">
    <div class="hero-copy"><p class="overline"><span class="extension-icon" aria-hidden="true">+</span> Chrome accessibility extension</p>
    <h1 id="title">A way<br> <span class="landing-word">through.</span></h1>
    <p class="summary">For people who use a keyboard, a screen reader or zoom. Curb Cut opens mouse-only menus, names buttons and makes faint text easier to read.</p>
    <div class="actions"><a class="install" href="${download}" download><span class="download-icon" aria-hidden="true"></span>Install for Chrome</a>
    <a class="text-action" href="${repo}">GitHub <span aria-hidden="true">↗</span></a></div></div>
    <figure class="mechanism" aria-label="Exploded illustration of the Tab key, its spring and its circuit board">
      <div class="drawing" aria-hidden="true"><i class="registration nw"></i><i class="registration ne"></i><i class="registration sw"></i><i class="registration se"></i>
        <div class="shadow"></div><div class="assembly">${['foot','spring','cap'].map(layer=>`<img class="key-${layer}" src="assets/tab/${layer}.webp" srcset="assets/tab/${layer}-small.webp 520w, assets/tab/${layer}.webp 1100w" sizes="(max-width:760px) 90vw, 52vw" fetchpriority="high" width="1100" height="1000" alt="">`).join('')}</div>
        <span class="key-caption">Tab switch</span></div>
    </figure>
  </div><div class="hero-foot frame"><a href="#repair"><span class="down" aria-hidden="true">↓</span> Follow the keystroke</a><span class="foot-domain">mass.edu <i aria-hidden="true">/</i> Keyboard navigation</span></div></div></section>`
}

export function repair({recordings, link}) {
  const before = recordings.find(run=>run.phase==='before')
  const after = recordings.find(run=>run.phase==='after')
  return `<section class="repair" id="repair" aria-labelledby="case-title"><div class="case-stage frame">
    <div class="case-top"><p class="overline"><i class="square" aria-hidden="true"></i> A keyboard repair</p><a href="https://www.mass.edu/">Massachusetts Department of Higher Education <span aria-hidden="true">↗</span></a></div>
    <div class="case-grid"><div class="case-copy"><h2 id="case-title">Behind a<br> closed menu.</h2>
    <p>On Mass.edu, a mouse could open the About menu. A keyboard couldn’t reach its first link, “The DHE.”</p>
    <p class="try-copy">Try the About menu with <kbd>↓</kbd>, then switch on the fix and press <kbd>Tab</kbd> from About.</p>
    <button type="button" class="repair-switch" role="switch" aria-checked="false" aria-label="Curb Cut repair" aria-controls="capture" hidden><i aria-hidden="true"></i><span>Curb Cut off</span></button>
    </div>
    <figure class="specimen"><div class="capture-head"><span><i class="rec-dot" aria-hidden="true"></i> Recorded site</span><span>www.mass.edu</span></div>
    <div class="capture" id="capture"><div class="viewport"><img src="assets/story/mass-off-10-1080.webp" srcset="assets/story/mass-off-10-560.webp 560w, assets/story/mass-off-10-1080.webp 1080w" sizes="(max-width:500px) 139vw, (max-width:760px) 96vw, 58vw" width="1400" height="980" alt="Mass.edu’s About menu in the closed state" loading="lazy">
    <img class="open-capture" src="assets/story/mass-on-10-1080.webp" srcset="assets/story/mass-on-10-560.webp 560w, assets/story/mass-on-10-1080.webp 1080w" sizes="(max-width:500px) 139vw, (max-width:760px) 96vw, 58vw" width="1400" height="980" alt="" loading="lazy" aria-hidden="true">
    <button class="about-target" type="button" aria-expanded="false" aria-controls="destination" hidden><span class="sr">About</span></button><a id="destination" href="https://www.mass.edu/about/aboutdhe.asp" hidden><span class="sr">The DHE</span></a></div></div>
    <figcaption><span class="state-label" data-state-label>Without fix</span><span id="case-status" role="status">Arrow Down leaves the menu closed.</span></figcaption></figure></div>
    <div class="case-foot"><p>Kane, an AI tester, tried the same task by keyboard. The first run failed. With the fix, it reached The DHE.</p>
    <div class="run-links">${[[before,'Before'],[after,'After']].map(([run,label])=>`<a href="${link(run.file)}" data-recording="Mass.edu · ${label.toLowerCase()} the repair" data-preview="assets/previews/kane-${run.phase}.mp4"><span class="play-glyph" aria-hidden="true"></span>${label} <span class="sr">· Watch Kane recording</span></a>`).join('')}</div></div>
  </div></section>`
}
