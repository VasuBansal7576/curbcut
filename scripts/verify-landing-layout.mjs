import {chromium} from 'playwright'
import {serve} from '../core/server.mjs'

async function inspectViewport() {
  const sectionSelector = 'section,header,footer'
  const textGroupSelector = 'h1,h2,h3,figcaption,figure,' + sectionSelector
  const clipping = /^(auto|scroll|hidden|clip)$/
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve))
  const describe = element => element.id ? '#' + element.id : element.localName + (element.classList.length ? '.' + [...element.classList].join('.') : '')

  function item(element, target, group, description) {
    const section = element.closest(sectionSelector)
    if (!section || !element.checkVisibility() || element.closest('.sr,.skip,[hidden],script,style')) return
    const clips = []
    for (let parent = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent)
      const x = clipping.test(style.overflowX)
      const y = clipping.test(style.overflowY)
      if (x || y) clips.push({parent,x,y})
    }
    return {target,section,group,description,clips}
  }

  const text = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    const parent = node.parentElement
    if (!node.textContent.trim() || parent.closest('[aria-hidden="true"],option')) continue
    const range = document.createRange()
    range.selectNodeContents(node)
    const entry = item(parent, range, parent.closest(textGroupSelector), node.textContent.trim().slice(0,80))
    if (entry) text.push(entry)
  }
  const media = []
  for (const element of document.querySelectorAll('figure,img,video,canvas,iframe,svg')) {
    const entry = item(element,element,element,describe(element))
    if (entry) media.push(entry)
  }

  function boxes(entries) {
    const result = []
    for (const entry of entries) {
      for (const rect of entry.target.getClientRects()) {
        let left = Math.max(0,rect.left), right = Math.min(innerWidth,rect.right)
        let top = Math.max(0,rect.top), bottom = Math.min(innerHeight,rect.bottom)
        for (const {parent,x,y} of entry.clips) {
          const bounds = parent.getBoundingClientRect()
          if (x) {
            left = Math.max(left,bounds.left)
            right = Math.min(right,bounds.right)
          }
          if (y) {
            top = Math.max(top,bounds.top)
            bottom = Math.min(bottom,bounds.bottom)
          }
        }
        if (right > left && bottom > top) result.push({entry,left,right,top,bottom})
      }
    }
    return result
  }

  function checkPair(a,b) {
    if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
      throw Error('Collision at scroll '+scrollY+': '+describe(a.entry.section)+' ('+a.entry.description+') overlaps '+describe(b.entry.section)+' ('+b.entry.description+')')
    }
  }

  async function settle() {
    await frame()
    await frame()
    for (;;) {
      const active = document.getAnimations().filter(animation => animation.playState !== 'finished' && animation.playState !== 'idle')
      if (!active.length) return
      let timer
      try {
        await Promise.race([
          Promise.allSettled(active.map(animation => animation.finished)),
          new Promise((_,reject) => { timer = setTimeout(() => reject(Error('Animation did not settle at scroll '+scrollY)), 10000) })
        ])
      } finally {
        clearTimeout(timer)
      }
      await frame()
    }
  }

  const last = document.documentElement.scrollHeight - innerHeight
  if (last < 1000) throw Error('Landing page missing')
  let samples = 0
  for (let y = 0;; y += 100) {
    scrollTo({top:Math.min(y,last),behavior:'instant'})
    await settle()
    const lines = boxes(text)
    const figures = boxes(media)
    for (const [i,line] of lines.entries()) {
      for (let j = 0; j < i; j++) {
        if (line.entry.group !== lines[j].entry.group) checkPair(line,lines[j])
      }
      for (const figure of figures) {
        if (line.entry.section !== figure.entry.section) checkPair(line,figure)
      }
    }
    for (const box of [...figures,...lines]) {
      const {section,description} = box.entry
      const bounds = section.getBoundingClientRect()
      if (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1 || box.left < bounds.left - 1 || box.right > bounds.right + 1) {
        throw Error(description+' extends outside '+describe(section)+' at scroll '+scrollY)
      }
    }
    samples++
    if (y >= last) return samples
  }
}

const server = await serve(Number(process.env.CURBCUT_LAYOUT_PORT ?? 43824))
const browser = await chromium.launch({channel:'chromium',args:['--mute-audio']})
try {
  for (const reducedMotion of ['no-preference','reduce']) {
    for (const width of [320,390,1440]) {
      const page = await browser.newPage({viewport:{width,height:width === 1440 ? 900 : 844},reducedMotion})
      try {
        await page.goto('http://127.0.0.1:'+server.address().port+'/site/')
        await page.evaluate(() => document.fonts.ready)
        const samples = await page.evaluate(inspectViewport)
        console.log(width+'px, '+reducedMotion+': '+samples+' scroll positions passed.')
      } catch (error) {
        throw new Error(width+'px, '+reducedMotion+': '+error.message,{cause:error})
      } finally {
        await page.close()
      }
    }
  }
} finally {
  await browser.close()
  server.closeAllConnections()
  server.close()
}
