import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {serve} from '../core/server.mjs'

const server = await serve(Number(process.env.CURBCUT_LAYOUT_PORT ?? 43824))
const browser = await chromium.launch({channel:'chromium',args:['--mute-audio']})
try {
  for (const width of [390,1440]) {
    const page = await browser.newPage({viewport:{width,height:width === 390 ? 844 : 900}})
    await page.goto('http://127.0.0.1:'+server.address().port+'/site/')
    await page.evaluate(() => document.fonts.ready)
    await page.waitForSelector('.site-switcher:visible')
    const samples = await page.evaluate(async () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const ranges = []
      while (walker.nextNode()) {
        const node = walker.currentNode
        const parent = node.parentElement
        const group = parent.closest('h1,h2,h3,figcaption,figure,section,header,footer')
        if (parent.closest('details:not([open])') && !parent.closest('summary')) continue
        if (!group || !node.textContent.trim() || parent.closest('.sr,script,style,[aria-hidden="true"]')) continue
        const range = document.createRange()
        range.selectNodeContents(parent.id === 'spoken-name' ? parent : node)
        ranges.push({range,group,node})
      }
      const last = document.documentElement.scrollHeight - innerHeight
      if (last < 1000) throw Error('Landing page missing')
      let samples = 0
      for (let y = 0;; y += 100) {
        scrollTo(0,Math.min(y,last))
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        const visible = []
        for (const {range,group,node} of ranges) {
          for (const rect of range.getClientRects()) {
            const left = Math.max(0,rect.left), right = Math.min(innerWidth,rect.right)
            const top = Math.max(0,rect.top), bottom = Math.min(innerHeight,rect.bottom)
            if (right <= left || bottom <= top) continue
            for (const other of visible) {
              if (group !== other.group && left < other.right && right > other.left && top < other.bottom && bottom > other.top) {
                throw Error('Text collision at '+innerWidth+'px, scroll '+scrollY+'px: '+node.textContent+' / '+other.text)
              }
            }
            visible.push({group,left,right,top,bottom,text:node.textContent})
          }
        }
        samples++
        if (y >= last) return samples
      }
    })
    const buttons = page.locator('.site-switcher button')
    assert.equal(await buttons.count(),3)
    for (const button of await buttons.all()) {
      await button.focus()
      await page.keyboard.press('Enter')
      assert.equal(await page.locator('.replay:visible').count(),1)
      assert.equal(await page.locator('.replay:visible h3').textContent(),await button.textContent())
    }
    console.log(width+'px: '+samples+' scroll positions and three site selections passed.')
    await page.close()
  }
} finally {
  await browser.close()
  server.closeAllConnections()
  server.close()
}
