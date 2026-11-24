import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'

const root = fileURLToPath(new URL('../../', import.meta.url))
const extension = path.join(root, 'extension')
const destination = process.env.CAPTURE_DIR || path.join(tmpdir(), 'curbcut-film-v5-input')
const sites = {
  mass: {url: 'https://www.mass.edu/', nav: '#mainnav > nav > ul > li:first-child', name: 'The DHE', end: '/about/aboutdhe.asp'},
  csc: {url: 'https://csc.gov.in/', nav: '#menuzord > ul > li:nth-of-type(2)', name: 'About MeitY', end: '/meity'}
}
for (const [site, target] of Object.entries(sites)) {
  if (process.env.CAPTURE_SITE && site !== process.env.CAPTURE_SITE) continue
  for (const enabled of [false, true]) {
    const profile = await mkdtemp(path.join(tmpdir(), 'curbcut-film-'))
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: {width: 2732, height: 1700}, deviceScaleFactor: 2,
      args: ['--mute-audio', '--disable-extensions-except=' + extension, '--load-extension=' + extension]
    })
    try {
      const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker')
      const page = context.pages()[0]
      const folder = path.join(destination, site + (enabled ? '-on' : '-off'))
      await mkdir(folder, {recursive: true})
      await worker.evaluate(enabled => chrome.storage.local.set({enabled}), enabled)
      await page.goto(target.url, {waitUntil:'domcontentloaded', timeout:60000})
      const tabId = await worker.evaluate(async url => (await chrome.tabs.query({url}))[0].id, page.url())
      await worker.evaluate(id => chrome.tabs.setZoom(id, 2), tabId)
      await page.waitForFunction(() => devicePixelRatio === 4)
      const trigger = page.locator(target.nav + ' > a').first()
      await trigger.waitFor({timeout:25000})
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(1500)
      const surface = await context.newCDPSession(page)
      const log = []
      async function snap(key) {
        const {layoutViewport,visualViewport} = await surface.send('Page.getLayoutMetrics')
        const origin = ['pageX','pageY'].map(axis=>(layoutViewport[axis]-visualViewport[axis])*2)
        const data = await page.evaluate(({nav,origin}) => {
          const pixels = r => [r.x*devicePixelRatio+origin[0],r.y*devicePixelRatio+origin[1],
            r.width*devicePixelRatio,r.height*devicePixelRatio].map(Math.round)
          const active = document.activeElement
          const trigger = document.querySelector(nav + ' > a')
          const menu = document.querySelector(nav + ' > ul')
          const item = menu?.querySelector('a')
          const box = el => {
            if (!el) return null
            const r = el.getBoundingClientRect()
            return pixels(r)
          }
          function lettering(el) {
            if (!el) return null
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
            let node
            while ((node=walker.nextNode()) && !node.textContent.trim()) continue
            if (!node) return null
            const range = document.createRange()
            range.selectNodeContents(node)
            const r = range.getBoundingClientRect()
            const style = getComputedStyle(el)
            return {text:node.textContent.trim(), cssFont:style.font, bounds:pixels(r)}
          }
          const heading=[...document.querySelectorAll('h1,h2,h3')].find(el=>
            /About the Department of Higher Education|Ministry of Electronics.*Information Technology/i.test(el.innerText))
          return {captureOriginAdjustment:origin,deviceScaleFactor:2, browserZoom:2, pixelsPerCssPixel:devicePixelRatio,
            letters:{trigger:lettering(trigger),item:lettering(item),active:lettering(active),heading:lettering(heading)},
            heading:box(heading),url:location.href, focus:active.innerText?.trim().slice(0,80), rect:box(active), trigger:box(trigger),
            item:box(item), menu:box(menu), visible:!!menu && menu.getBoundingClientRect().height > 0 && getComputedStyle(menu).visibility === 'visible' && Number(getComputedStyle(menu).opacity)>0}
        }, {nav:target.nav,origin})
        const file = String(log.length).padStart(2,'0') + '.png'
        await page.screenshot({path:path.join(folder,file),scale:'device'})
        log.push({file,key,...data})
        await writeFile(path.join(folder,'keys.json'),JSON.stringify(log,null,2)+'\n')
        console.log(site, enabled, file, key, data.focus?.slice(0,30), data.visible, data.url)
      }
      async function press(key) {
        await page.keyboard.press(key)
        await page.waitForTimeout(300)
        await snap(key)
      }
      await snap('load')
      for (let i=0; i<60 && !await trigger.evaluate(el => el===document.activeElement); i++) await press('Tab')
      assert(await trigger.evaluate(el => el===document.activeElement))
      await press('ArrowDown')
      await press('Tab')
      if (enabled) {
        assert.equal(log.at(-1).focus?.toLowerCase(),target.name.toLowerCase())
        assert(log.at(-1).visible)
        await page.keyboard.press('Enter')
        await page.waitForURL(url=>url.pathname===target.end,{timeout:30000})
        await page.waitForTimeout(400)
        await snap('Enter')
      } else {
        assert(!log.at(-2).visible)
      }
    } finally {
      await context.close()
      await rm(profile,{recursive:true,force:true})
    }
  }
}
