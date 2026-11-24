import test from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import brand from '../core/brand-palette.json' with {type:'json'}

test('Reading view owns its typography and keeps keyboard focus visible with reduced motion',async()=>{
  const browser=await chromium.launch({channel:'chromium',headless:true,args:['--mute-audio']})
  try{
    const page=await browser.newPage({reducedMotion:'reduce'})
    await page.setContent('<style>*{font-family:serif !important}span{transition:all 2s}</style><button id="go">Open the menu</button>')
    await page.addScriptTag({path:new URL('../extension/runtime.js',import.meta.url).pathname})
    await page.locator('#go').focus()
    await page.evaluate(()=>{window.closeReader=CurbCut.reader()})
    const row=page.getByRole('dialog').getByRole('button',{name:/Open the menu/})
    await page.keyboard.press('Tab')
    await row.focus()
    const style=await row.evaluate(el=>{
      const text=getComputedStyle(el.firstChild)
      const [r,g,b]=getComputedStyle(el.closest('dialog')).backgroundColor.match(/\d+/g).map(Number)
      return {font:text.fontFamily,background:[r,g,b],focus:getComputedStyle(el).outlineWidth,transition:text.transitionDuration}
    })
    assert.ok(style.font.includes('CurbCutReaderText'))
    assert.deepEqual(style.background,Array.from(Buffer.from(brand.text.slice(1),'hex')))
    assert.equal(style.focus,'3px')
    assert.equal(style.transition,'0s')
    const luminance=hex=>Array.from(Buffer.from(hex.slice(1),'hex')).reduce((sum,ch,i)=>{
      const n=ch/255
      return sum+[.2126,.7152,.0722][i]*(n<=.04045?n/12.92:((n+.055)/1.055)**2.4)
    },0)
    for(const foreground of [brand.ink,brand.surface])assert.ok((luminance(brand.text)+.05)/(luminance(foreground)+.05)>=4.5)
    await page.evaluate(()=>window.closeReader())
    assert.equal(await page.locator('#go').evaluate(el=>el===document.activeElement),true)
  }finally{await browser.close()}
})
