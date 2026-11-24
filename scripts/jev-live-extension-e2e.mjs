import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {ROOT} from '../core/io.mjs'
import {jevKey} from '../core/jev.mjs'

const url='https://www.iana.org/'
const key=await jevKey()
assert(key)
const html=await readFile(new URL('../fixtures/jev-live.html',import.meta.url),'utf8')
const profile=await mkdtemp(path.join(tmpdir(),'curbcut-jev-smoke-'))
const extension=path.join(ROOT,'extension')
let context
try {
  context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:800},
    args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']})
  const worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension:'))??
    await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension:')})
  await worker.evaluate(key=>CurbCutJevConfig.set(key),key)
  const page=context.pages()[0]
  await page.route(url,route=>route.fulfill({contentType:'text/html',body:html}))
  await page.goto(url)
  const controls=page.locator('nav button[aria-label],nav a[aria-label]')
  assert.equal(await controls.count(),0)
  await worker.evaluate(()=>chrome.storage.local.set({liveNamesEnabled:true}))
  await controls.first().waitFor({timeout:15000})
  const names=await controls.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))
  assert(names.length>=2,JSON.stringify(names))
  const tab=await worker.evaluate(async url=>(await chrome.tabs.query({url}))[0].id,url)
  const popup=await context.newPage()
  await popup.goto(new URL('popup.html',worker.url()).href)
  await worker.evaluate(tabId=>chrome.storage.local.set({capturedTabId:tabId,pendingStuck:true}),tab)
  await popup.reload()
  await popup.getByText(/named by Jev · unverified/).waitFor()
  await worker.evaluate(()=>chrome.storage.local.set({liveNamesEnabled:false}))
  await controls.first().waitFor({state:'detached'})
  console.log('Installed Chromium extension named '+names.length+' fixture controls, displayed their Jev status, and removed names when disabled.')
} finally {
  await context?.close()
  await rm(profile,{recursive:true,force:true})
}
