function choices(id, label, names) {
  return `<fieldset class="choices"><legend class="sr">${label}</legend>${names.map((name,i)=>`<label><input type="radio" name="${id}" value="${i}" aria-controls="${id}-${i}" ${i===0?'checked':''}><span>${name}</span></label>`).join('')}</fieldset>`
}

function panel(id, index, content) {
  return `<div id="${id}-${index}" data-panel ${index?'hidden':''}>${content}</div>`
}

function clip(src, poster, label, captions = '') {
  return `<a class="clip-launch" href="${src}" data-clip="${label}" data-captions="${captions}" aria-label="Play ${label}"><img src="${poster}" loading="lazy" width="960" height="540" alt=""><span><i class="play-glyph" aria-hidden="true"></i>Play recording</span></a>`
}

export function readerChapter(link) {
  const names = [
    ['Button.', 'The first slideshow button has a role, but no name.', 'reader-off'],
    ['Previous slide.', 'Its German name, <span lang="de">Vorherige Folie</span>, tells you what the button does.', 'reader-on']
  ]
  return `<section class="chapter reader" id="names" aria-labelledby="names-title" data-choices><div class="frame">
    <div class="chapter-meta"><span>Screen reader</span><span>Munich Airport</span></div>
    <h2 id="names-title">What does “button” do?</h2>
    <div class="reader-stage"><figure class="airport"><img src="assets/munich.jpg" width="680" height="372" loading="lazy" alt="Munich Airport’s homepage slideshow"><figcaption>munich-airport.de</figcaption></figure>
    <div class="speech"><p class="overline">Announcement in English</p><div aria-live="polite" aria-atomic="true">${names.map(([name,desc,asset],i)=>panel('reader',i,`<p class="spoken">“${name}”</p><p>${desc}</p><img class="reader-strip" loading="lazy" width="840" height="130" src="assets/story/${asset}.webp" alt="Recorded Reading view row in German">`)).join('')}</div>
    ${choices('reader','Compare the Munich Airport button name',['Without name','With name'])}</div></div>
    <a class="source-link" href="${link('evidence/v6-5193be8805ece27f858e/report.md')}">Read the Munich Airport evidence ↗</a></div></section>`
}

export function contrastChapter(link, plates) {
  const states=['off','on'].map(key=>plates['contrast-'+key].measurement.ratio.toFixed(3))
  return `<section class="chapter contrast" id="contrast" aria-labelledby="contrast-title" data-choices><div class="frame">
    <div class="chapter-meta"><span>Low vision</span><span>ExtremeTerrain</span></div>
    <div class="contrast-grid"><div><h2 id="contrast-title">Read the<br>fine print.</h2><p class="body-copy">The shipping details link fell just below the contrast it needed. Curb Cut changed its colour against the same grey background.</p>
    ${choices('contrast','Compare the link contrast',['Original colour','Repaired colour'])}<a class="source-link" href="${link('proof/heldout-v6/measurements/v6-035402528fb5fd67e4c6.json')}">Inspect the measurement ↗</a></div>
    <figure class="contrast-plate"><img class="store-capture" src="assets/contrast-off.jpg" width="1400" height="570" alt="ExtremeTerrain’s shipping banner above its vehicle and parts navigation" loading="lazy">
    <div class="loupe"><div aria-live="polite" aria-atomic="true">${states.map((ratio,i)=>panel('contrast',i,`<div class="ratio-detail"><img src="assets/story/contrast-${i?'on':'off'}.webp" alt="Magnified Details link" width="390" height="183" loading="lazy"><div><strong>${ratio}<small>:1</small></strong><span>Measured contrast</span></div></div>`)).join('')}</div></div><figcaption>Normal-size text needs at least 4.5:1.</figcaption></figure></div></div></section>`
}

export function kaneChapter(recordings, link) {
  const runs=[
    ['before','Keyboard','The menu stayed closed.','Arrow Down left focus on About. Kane could not reach The DHE.'],
    ['after','With the fix','The same keys got through.','Kane repeated the keyboard task and reached the Department of Higher Education page.'],
    ['control','Mouse check','The mouse could get there.','Hovering over About revealed the link. The destination already worked for someone using a mouse.']
  ]
  return `<section class="chapter kane" id="proof" aria-labelledby="proof-title" data-choices><div class="frame"><div class="chapter-meta"><span>Kane proof</span><span>Mass.edu</span></div>
    <div class="proof-intro"><h2 id="proof-title">Run it again.</h2><p class="body-copy">Kane is an AI tester. Give it the same task before and after a fix, then watch what it actually reached.</p></div>
    ${choices('kane','Choose a recorded run',runs.map(r=>r[1]))}
    ${runs.map(([phase,,title,desc],i)=>{
      const run=recordings.find(r=>r.phase===phase)
      return panel('kane',i,`<div class="proof-stage"><div><p class="verdict">${phase==='before'?'Fail':'Pass'}</p><h3>${title}</h3><p>${desc}</p><a class="source-link" href="${link(run.pack)}">Evidence for this run ↗</a></div>${clip('assets/previews/kane-'+phase+'.mp4','assets/protocol-'+phase+'.jpg','Mass.edu '+phase+' run')}</div>`)
    }).join('')}</div></section>`
}

export function jevChapter(link, review) {
  const site='proof/jev/live-naming-real-sites.json'
  return `<section class="chapter jev" id="jev" aria-labelledby="jev-title" data-choices><div class="frame"><div class="chapter-meta"><span>Live naming</span><span>Jev · Opt-in</span></div>
    <div class="jev-grid"><div><h2 id="jev-title">A name on<br>a new site.</h2><p class="body-copy">Even on sites without a bundled fix, Jev can name a control in about a second. When it isn’t sure, it leaves the control alone.</p>
    ${choices('jev','Explore the live naming results',['Meridiano','An unnamed link'])}</div>
    <div class="jev-record" aria-live="polite">${panel('jev',0,`<p class="overline">Meridiano · Spanish</p><p class="live-name" lang="es">Buscar. Menú.</p><p>Search and menu. Jev gave both buttons names in the language of the page.</p><div class="naming-replay"><img loading="lazy" src="assets/story/jev-off.webp" width="840" height="225" alt=""><img class="named-rows" loading="lazy" src="assets/story/jev-on.webp" width="840" height="225" alt="Recorded Meridiano rows for the menu and search buttons"></div><button class="replay-names" type="button" hidden>Replay the naming</button><span class="elapsed">1.14 seconds to the first name</span>`)}
    ${panel('jev',1,`<p class="overline">World Organisation for Animal Health</p><p class="live-name">No name added.</p><p>On woah.org, the logo link stayed unnamed after Jev checked it.</p><img class="quiet-capture" src="assets/story/woah.webp" width="860" height="567" loading="lazy" alt="Recorded Reading view on woah.org">`)}</div></div>
    <div class="review-strip"><strong>${review.adjudication.correct}<small> / ${review.summary.appliedNames}</small></strong><div class="ticks" aria-hidden="true">${Array.from({length:review.summary.appliedNames},(_,i)=>`<i class="${i<review.adjudication.correct?'correct':'vague'}"></i>`).join('')}</div><p>Names judged correct in a manual review. Two were too vague. <a href="${link(site)}">Read the review ↗</a></p></div></div></section>`
}

export function ownerChapter(link) {
  return `<section class="chapter owner" id="owner" aria-labelledby="owner-title"><div class="frame"><div class="chapter-meta"><span>Site owner</span><span>The source fix</span></div>
    <div class="owner-grid"><div><h2 id="owner-title">So one day,<br>nobody needs us.</h2><p class="body-copy">A browser fix helps the person using it. They can share a report from the extension showing the site owner how to repair the original page for everyone.</p></div>
    <figure class="report-paper"><div class="paper-binding" aria-hidden="true"></div><img loading="lazy" src="assets/story/owner.webp" width="1150" height="546" alt="Mass.edu source change: apply the menu’s hover styles when focus is inside it"><figcaption><a href="${link('evidence/v4-86f207deeb57-7bc09a21/report.md')}">Read the source report and evidence ↗</a></figcaption></figure></div>
    <details class="retirement"><summary><span>When the site works on its own, the patch retires.</span><span class="disclosure">Watch the recheck</span></summary><div class="retire-stage">${clip('assets/story/retire-kane.mp4','assets/story/retire-kane.webp','Kane completes the Stillroom test shop task without a patch')}<p>In the Stillroom test shop, Kane tried adding headphones to the cart with the browser fix switched off. The task passed, so Curb Cut retired the patch. <a class="source-link" href="${link('proof/demo/retire/retired-patch.json')}">Retirement record ↗</a></p></div></details></div></section>`
}

export function developerChapter(link) {
  return `<section class="chapter developer" id="developers" aria-labelledby="dev-title" data-choices><div class="frame"><div class="chapter-meta"><span>For developers</span><span>Curb Cut CLI</span></div>
    <h2 id="dev-title">Catch it before<br>it ships.</h2>${choices('dev','Choose a developer workflow',['Check a task','Claude Code hook','Pull requests'])}
    ${panel('dev',0,`<div class="dev-stage"><div><h3>Give it a task.</h3><p>Point the command at a page and describe what a person needs to do. In this terminal capture, Kane tests adding headphones to a cart.</p><code>curbcut check &lt;url&gt; "&lt;task&gt;"</code><a class="source-link" href="${link('proof/demo/README.md')}">Open the run log ↗</a><details class="run-summary"><summary>Read the recorded result</summary><p>The keyboard missed Add to cart. The mouse reached it. After the repair, the keyboard reached it too. Kane passed the task. A later publishing step failed while archiving the evidence.</p></details></div>${clip('assets/story/check.mp4','assets/story/check.webp','Terminal capture of curbcut check')}</div>`)}
    ${panel('dev',1,`<div class="dev-stage"><div><h3>Check before Claude stops.</h3><p>A Claude Code Stop hook runs the task again. A failed check gives the agent the blocked step so it can repair the source.</p><code>curbcut gate --config curbcut.gate.json</code><a class="source-link" href="${link('docs/gate.md#claude-code-stop-hook')}">Set up the Stop hook ↗</a><details class="run-summary"><summary>Read the recorded result</summary><p>Tab skipped Add to cart. After the site changed the control to a native button, the same task passed with no failures.</p></details></div>${clip('assets/story/gate.mp4','assets/story/gate.webp','Terminal capture of a failing and passing curbcut gate')}</div>`)}
    ${panel('dev',2,`<div class="dev-stage"><div><h3>Test the preview.</h3><p>The PR bot waits for the preview site, runs the same gate in CI and updates a pull request comment with each task’s result.</p><a class="source-link" href="${link('docs/pr-bot.md')}">Set up the PR bot ↗</a></div><div class="workflow"><span>Pull request opened</span><i aria-hidden="true">↓</i><span>Preview ready</span><i aria-hidden="true">↓</i><span>Gate runs the task</span><i aria-hidden="true">↓</i><strong>Verdict + recording</strong></div></div>`)}</div></section>`
}

export function closing({download, film}) {
  return `<section class="chapter closing" id="install" aria-labelledby="install-title"><div class="frame"><div class="chapter-meta"><span>Curb Cut for Chrome</span><a href="#opening">Back to top ↑</a></div><div class="closing-grid"><div><h2 id="install-title">Take the fix<br>with you.</h2>
    <a class="install" download href="${download}"><span class="download-icon" aria-hidden="true"></span>Install for Chrome</a><ol><li>Download and unzip Curb Cut.</li><li>Open <code>chrome://extensions</code> and enable Developer mode.</li><li>Choose <b>Load unpacked</b> and select the extracted folder.</li></ol></div>
    <figure class="launch-film"><figcaption>Curb Cut launch film</figcaption>${clip(film,'assets/story/launch-poster.webp','Curb Cut launch film','assets/launch.vtt')}</figure></div></div></section>`
}
