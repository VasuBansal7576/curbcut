import {browserWindow, icon, installButton} from './landing-opening.mjs'

function choices(id, label, names) {
  return `<fieldset class="choices"><legend class="sr">${label}</legend>${names.map((name,i)=>`<label><input type="radio" name="${id}" value="${i}" aria-controls="${id}-${i}" ${i===0?'checked':''}><span>${name}</span></label>`).join('')}</fieldset>`
}

function panel(id, index, content) {
  return `<div id="${id}-${index}" data-panel ${index?'hidden':''}>${content}</div>`
}

function clip(src, poster, label, captions = '') {
  return `<a class="clip-launch" href="${src}" data-clip="${label}" data-captions="${captions}" aria-label="Play ${label}"><img src="${poster}" loading="lazy" width="960" height="540" alt=""><span><i class="play-glyph" aria-hidden="true"></i>Play recording</span></a>`
}

export function examples(link, plates) {
  const ratios = ['off','on'].map(state=>plates['contrast-'+state].measurement.ratio.toFixed(3))
  return `<div class="examples wrap">
    <section id="names" data-choices aria-labelledby="names-title"><div class="example-intro"><p class="kind">Munich Airport · Screen reader</p><h2 id="names-title">What does “button” do?</h2></div>
    <img class="example-shot" src="assets/munich.jpg" width="680" height="372" alt="Munich Airport’s slideshow" loading="lazy">
    ${choices('reader','Compare the screen reader announcement',['Without name','With name'])}
    <div class="comparison" aria-live="polite">${panel('reader',0,'<h3>“Button.”</h3><p>The slideshow control had no name.</p><img class="reader-strip" src="assets/story/reader-off.webp" width="840" height="130" alt="Recorded German Reading view row before naming" loading="lazy">')}
    ${panel('reader',1,'<h3>“Previous slide.”</h3><p>Its new German name, <span lang="de">Vorherige Folie</span>, explains what it does.</p><img class="reader-strip" src="assets/story/reader-on.webp" width="840" height="130" alt="Recorded German Reading view row with the previous slide name" loading="lazy">')}</div>
    <a class="source-link" href="${link('evidence/v6-5193be8805ece27f858e/report.md')}">Read the button evidence ↗</a></section>
    <section id="contrast" data-choices aria-labelledby="contrast-title"><div class="example-intro"><p class="kind">ExtremeTerrain · Low vision</p><h2 id="contrast-title">Read the shipping details.</h2></div>
    <img class="example-shot store-capture" src="assets/contrast-off.jpg" width="1400" height="570" alt="The shipping details link on ExtremeTerrain" loading="lazy">
    ${choices('contrast','Compare the link contrast',['Original colour','Repaired colour'])}<div class="comparison" aria-live="polite">
    ${ratios.map((ratio,i)=>panel('contrast',i,`<div class="ratio"><img src="assets/story/contrast-${i?'on':'off'}.webp" width="390" height="183" alt="Magnified Details link" loading="lazy"><div><h3>${ratio}:1</h3><p>Measured link contrast. Normal-size text needs 4.5:1.</p></div></div>`)).join('')}</div>
    <a class="source-link" href="${link('proof/heldout-v6/measurements/v6-035402528fb5fd67e4c6.json')}">Inspect the measurement ↗</a></section></div>`
}

export function howChapter(link, review, recordings) {
  const massRuns = recordings.map(run=>`<a href="${link(run.file)}" data-recording="Mass.edu · ${run.phase}" data-preview="assets/previews/kane-${run.phase}.mp4">${{before:'Without fix',control:'Mouse check',after:'With fix'}[run.phase]}</a>`).join('')
  return `<section class="section wrap" id="how"><h2>How it works</h2>
    <div class="how-grid"><div><h3>Match the page.</h3><p>When you visit a site, the extension checks its bundled fixes for one that matches the page and the control.</p></div>
    <div><h3>Apply the repair.</h3><p>Curb Cut changes the control in your browser. Open the toolbar popup to see the fix or turn it off.</p></div>
    <div><h3>Inspect the evidence.</h3><p>See the recorded task or the local measurement behind a fix. Compare Kane’s three Mass.edu recordings.</p><div class="run-links">${massRuns}</div></div></div>
    <div class="jev" id="jev" data-choices><div><p class="kind">Jev · Optional live naming</p><h3>A name on a new site</h3><p>Even without a bundled fix, Jev can name buttons in about a second. When it’s unsure, it leaves the control alone.</p>
    <p>A reviewer found <strong>${review.adjudication.correct} of ${review.summary.appliedNames}</strong> names correct. Two were too vague.</p><a class="source-link" href="${link('proof/jev/live-naming-real-sites.json')}">Read the naming review ↗</a></div>
    <div>${choices('jev','Explore the naming results',['Meridiano','An unnamed link'])}<div aria-live="polite">
    ${panel('jev',0,'<h4 lang="es">Buscar. Menú.</h4><p>Search and menu. Jev named both buttons in Spanish.</p><img src="assets/story/jev-on.webp" width="840" height="225" alt="Meridiano’s recorded menu and search button names" loading="lazy">')}
    ${panel('jev',1,'<h4>No name added.</h4><p>On woah.org, the logo link stayed unnamed after the check.</p><img src="assets/story/woah.webp" width="860" height="567" alt="Recorded Reading view on woah.org" loading="lazy">')}</div></div></div></section>`
}

export function mapChapter(recordings, link, media) {
  const shot = '<div class="site-photo"><img id="map-image" src="assets/product/view-open.webp" width="1280" height="487" loading="lazy" alt="OpenSeaMap’s View menu open with Sea Marks visible"><span class="focus-ring" aria-hidden="true"></span></div>'
  const playback = (file,title,label)=>`<a class="source-link" data-recording="OpenSeaMap · ${title}" href="${media(file)}">${label} ↗</a>`
  const runs = [
    ['before','Keyboard before the fix','700b66b7','Fail'],
    ['control','Mouse hover','7168aa29','Pass'],
    ['after','Keyboard with the fix','006b53ce','Pass']
  ]
  return `<section class="proof wrap" id="proof" aria-labelledby="map-title"><p class="kind">Proof <i aria-hidden="true">/</i> Keyboard navigation</p><div id="report-to-fix" class="proof-head">
    <h2 id="map-title">Reaching View<br> on OpenSeaMap.</h2><p class="lead">Tab skipped the View menu on a site Curb Cut had never patched. A user reported the barrier. Grok wrote a fix in 16 seconds.</p></div>
    <div class="proof-grid"><figure>${browserWindow('map',shot)}<figcaption class="map-caption"><strong id="map-state">With the published fix</strong><span id="map-result">The eighth Tab opens View and reveals Sea Marks.</span><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></figcaption>
    <div class="map-controls" hidden><fieldset class="choices"><legend>Compare the installed packages</legend><label><input type="radio" name="map" value="before"><span>Before the report</span></label><label><input type="radio" name="map" value="published" checked><span>Published fix</span></label></fieldset>
    <label class="scrub-label" for="map-stop">Recorded Tab stop <output id="map-position" for="map-stop">8 of 8</output></label><input type="range" id="map-stop" min="1" max="8" value="8"></div></figure>
    <div class="checks"><h3>Kane tested the fix</h3><p>The AI tester tried the same menu three ways. Select a check to play its recording.</p><ul>${runs.map(([phase,task,id,result])=>{
      const run=recordings.find(r=>r.phase===phase)
      return `<li><a href="${media(run.file)}" data-recording="OpenSeaMap · ${task}"><span><b>${task}</b><small>Session ${id}</small></span><span class="verdict"><i>${icon(result.toLowerCase(),14)}</i>${result}</span></a></li>`
    }).join('')}</ul><p>The first run stopped before publication. Curb Cut shipped the fix after rechecking the recorded evidence.</p>
    <a class="proof-link" href="${link('proof/report-to-fix/README.md')}">Read the full proof ${icon('external',15)}</a><div class="proof-films">${playback('proof/report-to-fix/browser.mp4','original barrier report','Watch the original report')}${playback('proof/report-to-fix/user-clip.mp4','installed packages','Watch both installed versions')}</div></div></div></section>`
}

export function ownerChapter(link) {
  return `<section class="section wrap owner" id="owner"><div><p class="kind">For site owners</p><h2>So one day, nobody needs us.</h2><p class="lead">The extension helps one browser at a time. Share its report with the site owner so they can fix the original page for everyone.</p></div>
  <div><figure><img src="assets/story/owner.webp" loading="lazy" width="1150" height="546" alt="The Mass.edu report recommends opening About when focus is inside the menu"><figcaption><a class="source-link" href="${link('evidence/v4-86f207deeb57-7bc09a21/report.md')}">Read the source change for Mass.edu ↗</a></figcaption></figure>
  <details class="retirement"><summary>When does a fix retire?</summary><p>Kane repeats the task with the browser repair switched off. At the Stillroom test shop, adding headphones to the cart passed, so the patch retired.</p>${clip('assets/story/retire-kane.mp4','assets/story/retire-kane.webp','Kane rechecks the Stillroom test shop')}<a class="source-link" href="${link('proof/demo/retire/retired-patch.json')}">Retirement record ↗</a></details></div></section>`
}

export function developerChapter(link) {
  return `<section class="section wrap developer" id="developers" aria-labelledby="dev-title" data-choices><div><p class="kind">Developer tools</p>
    <h2 id="dev-title">For developers</h2><p class="lead">Run the same accessibility check while you build, before a coding agent stops, or on a pull request.</p>${choices('dev','Choose a developer workflow',['Check a task','Claude Code hook','Pull requests'])}
    ${panel('dev',0,`<div class="dev-stage"><div><h3>Give it a task.</h3><p>Point the command at a page and describe what a person needs to do. In this terminal capture, Kane tests adding headphones to a cart.</p><code>curbcut check &lt;url&gt; "&lt;task&gt;"</code><a class="source-link" href="${link('proof/demo/README.md')}">Open the run log ↗</a><details class="run-summary"><summary>Read the recorded result</summary><p>The keyboard missed Add to cart. The mouse reached it. After the repair, the keyboard reached it too. Kane passed the task. A later publishing step failed while archiving the evidence.</p></details></div>${clip('assets/story/check.mp4','assets/story/check.webp','Terminal capture of curbcut check')}</div>`)}
    ${panel('dev',1,`<div class="dev-stage"><div><h3>Check before Claude stops.</h3><p>A Claude Code Stop hook runs the task again. A failed check gives the agent the blocked step so it can repair the source.</p><code>curbcut gate --config curbcut.gate.json</code><a class="source-link" href="${link('docs/gate.md#claude-code-stop-hook')}">Set up the Stop hook ↗</a><details class="run-summary"><summary>Read the recorded result</summary><p>Tab skipped Add to cart. After the site changed the control to a native button, the same task passed with no failures.</p></details></div>${clip('assets/story/gate.mp4','assets/story/gate.webp','Terminal capture of a failing and passing curbcut gate')}</div>`)}
    ${panel('dev',2,`<div class="dev-stage"><div><h3>Test the preview.</h3><p>The PR bot waits for the preview site, runs the same gate in CI and updates a pull request comment with each task’s result.</p><a class="source-link" href="${link('docs/pr-bot.md')}">Set up the PR bot ↗</a></div><div class="workflow"><span>Pull request opened</span><i aria-hidden="true">↓</i><span>Preview ready</span><i aria-hidden="true">↓</i><span>Gate runs the task</span><i aria-hidden="true">↓</i><strong>Verdict + recording</strong></div></div>`)}</div></section>`
}

export function closing({download, film}) {
  return `<section class="section wrap closing" id="install"><div><p class="kind">${icon('chrome',20)} Desktop Chrome</p><h2>Install Curb Cut</h2><ol><li>Download and unzip the extension.</li><li>Open <code>chrome://extensions</code> and enable Developer mode.</li><li>Choose <b>Load unpacked</b> and select the extracted folder.</li></ol>${installButton(download)}</div>
    <figure class="launch-film">${clip(film,'assets/product/mass-after-1360.webp','Curb Cut launch film','assets/launch.vtt')}<figcaption>Curb Cut launch film · English captions available</figcaption></figure></section>
    <section class="section wrap faq" id="faq"><h2>FAQ</h2><div>
    <details><summary>Can I turn a fix off?</summary><p>Yes. Open Curb Cut in the Chrome toolbar. You can pause fixes on the current page or switch off Apply fixes for all pages.</p></details>
    <details><summary>What if my site has no fix?</summary><p>Choose “I’m stuck” in the popup or press Ctrl+Shift+U to describe the barrier. Review the page address, focused control and recent keys before saving the report. A developer can run <code>curbcut serve</code> locally to receive it.</p></details>
    <details><summary>Does every page use an AI model?</summary><p>Bundled repairs run in the extension. Live button naming with Jev is optional and can be enabled separately.</p></details>
    <details><summary>What does “Kane-verified” mean?</summary><p>Kane tried the task before and after the repair and checked that it worked with a mouse. Open a fix in the <a href="#evidence">fix library</a> to inspect its recordings. Locally proven fixes link to their browser measurements.</p></details></div></section>`
}
