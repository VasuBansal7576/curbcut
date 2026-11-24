import assert from 'node:assert/strict'
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'

const root=fileURLToPath(new URL('../../',import.meta.url))
const extension=path.join(root,'extension')
const folder=process.env.CAPTURE_DIR || path.join(tmpdir(),'curbcut-film-v5-input')
await mkdir(folder,{recursive:true})
for (const enabled of [false,true]) {
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-detail-'))
  const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:320,height:800},
    deviceScaleFactor:6,args:['--mute-audio','--disable-extensions-except='+extension,'--load-extension='+extension]})
  try {
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker')
    await worker.evaluate(enabled=>chrome.storage.local.set({enabled}),enabled)
    const page=context.pages()[0]
    await page.goto('https://cloudconvert.com/',{waitUntil:'domcontentloaded'})
    const passage=page.getByText('Vendor engines and open-source converters selected per file type',{exact:true}).first()
    await passage.waitFor()
    await page.waitForTimeout(1000)
    await passage.evaluate(el=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-65))
    await page.waitForTimeout(500)
    const bounds=await passage.boundingBox()
    assert(enabled ? bounds.x+bounds.width<321 : bounds.x+bounds.width>320)
    const name=enabled?'zoom-on':'zoom-off'
    await page.screenshot({path:path.join(folder,name+'.png'),clip:{x:0,y:0,width:320,height:240}})
    await writeFile(path.join(folder,name+'.json'),JSON.stringify({rect:[bounds.x,bounds.y,bounds.width,bounds.height].map(v=>v*6),url:page.url(),enabled})+'\n')
    const panel=await context.newPage()
    await panel.setViewportSize({width:360,height:720})
    await panel.goto(new URL('popup.html',worker.url()).href)
    await panel.locator('#global-toggle-status').filter({hasNotText:'Loading'}).waitFor()
    await panel.locator('.hero').screenshot({path:path.join(folder,'switch-'+(enabled?'on':'off')+'.png')})
  } finally {
    await context.close()
    await rm(profile,{recursive:true,force:true})
  }
}
