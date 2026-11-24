import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {ROOT} from '../core/io.mjs'
import {jevKey} from '../core/jev.mjs'

const url='https://www.iana.org/'
const html=await readFile(new URL('../fixtures/jev-live.html',import.meta.url),'utf8')
const key=await jevKey()
assert(key)
const profile=await mkdtemp(path.join(tmpdir(),'curbcut-keyboard-help-'))
const extension=path.join(ROOT,'extension')
let context
try {
  context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:800},
    args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']})
  const worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension:'))??
    await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension:')})
  await worker.evaluate(async key=>{
    await CurbCutJevConfig.set(key);
    globalThis.testTrace = null;
    const request = fetch;
    globalThis.fetch = (url, options) => {
      if (url === "https://api.typesafe.ai/v1/systemone" && options?.body) {
        const data = JSON.parse(options.body);
        if (data.questions?.stuck) {
          globalThis.testTrace = data.state;
          return Promise.resolve(new Response(JSON.stringify({ answers: { stuck: { noul: .99 } } }), { status: 200 }));
        }
      }
      return request(url, options);
    };
  },key)
  const page=context.pages()[0]
  await page.route(url,route=>route.fulfill({contentType:'text/html',body:html}))
  await page.goto(url)
  await worker.evaluate(()=>chrome.storage.local.set({stuckEnabled:true,liveNamesEnabled:false}))
  const offer=page.locator('[data-curbcut-offer]')
  const controls=page.locator('nav [aria-label]')
  await page.waitForTimeout(250)
  await page.locator('#catalog-search').focus()
  for(let index=0;index<7;index++) {
    await page.keyboard.press('Enter')
    await page.waitForTimeout(160)
  }
  await offer.getByRole('button',{name:'Name controls with Jev'}).waitFor({timeout:8000})
  assert.equal(await controls.count(),0)
  const payload=await worker.evaluate(()=>globalThis.testTrace)
  assert(payload.recentKeyboardNavigation.length>=6)
  assert(!/catalog|library|https|instagram/i.test(JSON.stringify(payload)))
  await page.keyboard.press('Alt+Shift+KeyJ')
  await page.keyboard.press('Enter')
  await controls.first().waitFor({timeout:15000})
  assert.equal(await worker.evaluate(async()=> (await chrome.storage.local.get('liveNamesEnabled')).liveNamesEnabled),false)
  await worker.evaluate(()=>chrome.storage.local.set({enabled:false}))
  await controls.first().waitFor({state:'detached'})
  console.log('Keyboard help sent only trace data, waited for consent, and named the current page without enabling automatic naming.')
} finally {
  await context?.close()
  await rm(profile,{recursive:true,force:true})
}
