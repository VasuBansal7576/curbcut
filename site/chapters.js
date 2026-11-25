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

const mapChapter = document.querySelector('#proof')
const mapBrowser = mapChapter.querySelector('.browser')
const mapImage = mapChapter.querySelector('#map-image')
const mapStop = mapChapter.querySelector('#map-stop')
const commonStops = ['Zoom in','Zoom out','OpenStreetMap attribution','Permalink','Unnamed button','Unnamed link','Search field']

function scrubMap() {
  const stop = Number(mapStop.value)
  const lane = mapChapter.querySelector('input[name="map"]:checked').value
  const published = lane === 'published'
  const open = published && stop === 8
  const focus = commonStops[stop - 1] || (open ? 'View menu' : 'page body')
  mapImage.src = stop === 8 ? (open ? 'assets/product/view-open.webp' : 'assets/map/missed.webp') :
    'assets/map/' + lane + '-' + stop + '.webp'
  mapImage.alt = open ? 'The View menu is open with Sea Marks visible' : 'OpenSeaMap after Tab reached ' + focus
  mapBrowser.dataset.detail = String(!open)
  mapBrowser.querySelector('.focus-ring').hidden = !open
  mapBrowser.querySelector('.pinned').disabled = !published
  setPopup(mapBrowser,open)
  mapChapter.querySelector('#map-state').textContent = published ? 'With the published fix' : 'Before the report'
  mapChapter.querySelector('#map-result').textContent = stop < 8 ? 'Focus reaches ' + focus + '.' :
    open ? 'The eighth Tab opens View and reveals Sea Marks.' : 'Eight Tabs skip View. Sea Marks stays hidden.'
  mapChapter.querySelector('#map-position').textContent = stop + ' of 8'
  mapStop.setAttribute('aria-valuetext',stop + ' of 8, ' + focus)
}

mapStop.addEventListener('input',scrubMap)
mapChapter.querySelectorAll('input[name="map"]').forEach(radio=>radio.addEventListener('change',scrubMap))
mapStop.setAttribute('aria-valuetext','8 of 8, View menu')
mapChapter.querySelector('.map-controls').hidden = false

document.addEventListener('play', event => {
  if (!(event.target instanceof HTMLVideoElement) || event.target.paused) return
  for (const other of document.querySelectorAll('video')) {
    if (other !== event.target && !other.paused) other.pause()
  }
}, true)

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
