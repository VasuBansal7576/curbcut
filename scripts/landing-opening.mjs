const icons={
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 external:'<path d="M6 18 18 6M7 6h11v11"/>',
 menu:'<path d="M3 7h18M3 16h18"/>',
 chrome:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/><path d="M12 8.4h8.2M8.9 13.8 4.7 6.6M15.1 13.8l-4.2 7.1"/>',
 back:'<path d="m13 5-7 7 7 7M6 12h14"/>',
 forward:'<path d="m11 5 7 7-7 7M18 12H4"/>',
 reload:'<path d="M20 11a8 8 0 1 0-2.7 7M20 4v7h-7"/>',
 tune:'<path d="M3 8h9m5 0h4M3 16h4m5 0h9"/><circle cx="14" cy="8" r="2.3"/><circle cx="9" cy="16" r="2.3"/>',
 puzzle:'<path d="M4 5h5a3 3 0 1 1 6 0h4v5a3 3 0 1 1 0 6v4h-5a3 3 0 1 0-6 0H4z"/>',
 star:'<path d="m12 3 2.8 5.9 6.5.9-4.7 4.6 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.7-4.6 6.5-.9z"/>',
 dots:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m2 0h1m2 0h1m2 0h1m2 0h1M6 12h1m2 0h1m2 0h1m2 0h1m-8 4h8"/>',
 sound:'<path d="M2 11v2m4-6v10m4-14v18m4-16v14m4-11v8m4-6v4"/>',
 contrast:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/>',
 fail:'<path d="m7 7 10 10M17 7 7 17"/>',
 pass:'<path d="m5 12 4.5 4.5L19 7"/>'
};
export function icon(id, size=20) {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[id]}</svg>`
}


export function installButton(download) {
  return `<a class="install" download href="${download}">${icon('download',18)} Install for Chrome</a>`
}

export function navigation(repo) {
  const links = [['What it does','features'],['How it works','how'],['Proof','proof'],['For developers','developers'],['Fix library','evidence'],['Install','install'],['FAQ','faq']]
  return `<header class="mast"><nav class="wrap" aria-label="Main navigation">
    <a class="wordmark" href="#opening"><i aria-hidden="true"></i>Curb Cut</a>
    <button class="hamburger" type="button" aria-expanded="false" aria-controls="navigation-links" aria-label="Navigation menu" hidden>${icon('menu')}</button>
    <div id="navigation-links" class="nav-links">${links.map(([label,id])=>`<a href="#${id}">${label}</a>`).join('')}</div>
    <a class="github" href="${repo}">GitHub ${icon('external',15)}</a></nav></header>`
}

export function browserWindow(kind, contents) {
  const mass = kind === 'mass'
  const domain = mass ? 'mass.edu' : 'map.openseamap.org'
  const title = mass ? 'Massachusetts Department of Higher Education' : 'OpenSeaMap · The free nautical chart'
  return `<div class="browser ${kind}">
    <div class="tabs" aria-hidden="true"><div class="lights"><i></i><i></i><i></i></div><div class="tab">${icon('globe',13)}<span>${title}</span><b>×</b></div><b class="plus">+</b></div>
    <div class="toolbar">${icon('back',16)}${icon('forward',16)}${icon('reload',15)}<div class="address">${icon('tune',13)}<span>${domain}</span>${icon('star',13)}</div>
    <button type="button" class="pinned" aria-label="Curb Cut popup on ${domain}" aria-expanded="${!mass}" ${mass ? 'disabled' : ''} aria-controls="${kind}-popup"><img src="assets/icon.png" width="16" height="16" alt=""></button>${icon('puzzle',16)}${icon('dots',15)}</div>
    <div class="screen">${contents}<div class="popup" id="${kind}-popup" ${mass ? 'hidden' : ''}><img src="assets/product/${kind}-popup.webp" width="544" height="1314" ${mass?'':'loading="lazy"'} alt="Installed Curb Cut popup showing one Kane-verified keyboard fix on ${domain} and its before and after recordings"></div></div></div>`
}

export function opening(download, link) {
  const shot = `<div class="site-photo" id="mass-photo">
    <picture><source media="(max-width:760px)" srcset="assets/product/mass-before-680.webp"><img class="mass-image" src="assets/product/mass-before-1360.webp" width="1360" height="850" alt="Focus is on About on Mass.edu. Its submenu is closed." fetchpriority="high"></picture>
    <span class="focus-ring" aria-hidden="true"></span><button class="about-target" type="button" aria-expanded="false" aria-controls="destination" aria-label="About on the recorded Mass.edu page"></button>
    <a hidden id="destination" href="https://www.mass.edu/about/aboutdhe.asp" aria-label="The DHE on Mass.edu"></a></div>`
  return `<section class="hero wrap" id="opening" aria-labelledby="title"><div class="copy"><p class="kind">${icon('chrome',21)} Chrome extension</p>
    <h1 id="title">This menu<br> needs a mouse.</h1><p class="lead">Focus About on Mass.edu and Tab skips The DHE. Curb Cut opens the menu so your keyboard can reach the link.</p>
    <div class="actions"><a href="#proof" class="secondary">Watch Kane verify this ${icon('arrow',17)}</a>${installButton(download)}</div>
    <ol class="install-note" aria-label="Install in desktop Chrome"><li>Download and unzip the extension.</li><li>Enable <b>Developer mode</b> at <code>chrome://extensions</code>.</li><li>Choose <b>Load unpacked</b> and select the extracted folder.</li></ol></div>
    <figure class="hero-demo" id="repair">${browserWindow('mass',shot)}
    <figcaption class="hero-caption"><button type="button" class="key" aria-label="Try the Tab key on Mass.edu">${['foot','spring','cap'].map(layer=>`<img class="k-${layer}" width="200" height="182" src="assets/product/tab-${layer}.webp" alt="">`).join('')}</button>
    <div><strong id="case-status" role="status">About has focus. The DHE stays hidden.</strong><span><a href="${link('evidence/v4-86f207deeb57-7bc09a21/report.md')}">See the site owner’s report ↗</a></span></div>
    <button class="repair-switch" type="button" role="switch" aria-label="Mass.edu repair" aria-checked="false">Fix off</button></figcaption></figure></section>`
}

export function features() {
  const examples = [
    ['keyboard','Open mouse-only menus','Reach the links inside a menu using the keyboard.','repair'],
    ['sound','Give buttons a name','Hear what each control does with a screen reader.','names'],
    ['contrast','Make faint text readable','Read low-contrast text against its background.','contrast']
  ]
  return `<section class="features wrap" id="features"><h2>What it does</h2><div class="feature-grid">${examples.map(([symbol,title,description,id])=>`<article>${icon(symbol,25)}<div><h3><a href="#${id}">${title}</a></h3><p>${description}</p></div></article>`).join('')}</div></section>`
}
