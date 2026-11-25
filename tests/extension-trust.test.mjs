import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {runInNewContext} from 'node:vm'
import {chromium} from 'playwright'
import {enqueueDraft} from '../core/jev-queue.mjs'
import {ROOT,readJSON} from '../core/io.mjs'
import {serve} from '../core/server.mjs'

async function loadExt() {
  const scope={URL}
  for(const file of ['constants','match','validate','select','sensitive']) {
    runInNewContext(await readFile(path.join(ROOT,'extension/lib',file+'.js'),'utf8'),scope)
  }
  return scope.CurbCutExt
}

test('retired patches are listed as site-fixed and evidence URLs follow a configured base',async()=>{
  const Ext=await loadExt()
  const retired={id:'keyboard-add-headphones',site:'127.0.0.1',match:'http://127.0.0.1:4317/fixtures/shop/',
    persona:'keyboard-only',task:'Add headphones',barrier:'Add to cart is not in the tab order.',
    rules:[{selector:'div.add-to-cart',action:'makeFocusable'}],status:'retired',evidence:{}}
  const active={...retired,id:'still-active',status:'verified'}
  const state={enabled:true,pausedPages:[],patches:[retired,active],demoPatches:[],fixturePreview:false}
  const url='http://127.0.0.1:4317/fixtures/shop/'
  assert.equal(Ext.selectActivePatches(url,state).map(patch=>patch.id).join(','),'still-active')
  assert.equal(Ext.selectRetiredPatches(url,state).map(patch=>patch.id).join(','),'keyboard-add-headphones')
  assert.equal(Ext.evidenceHref('proof/demo/before.mp4'),'https://github.com/VasuBansal7576/curbcut/raw/main/proof/demo/before.mp4')
  assert.equal(Ext.evidenceHref('proof/demo/after.mp4','https://evidence.example.org/archive/'),
    'https://evidence.example.org/archive/proof/demo/after.mp4')
})

test('the privacy gate blocks sign-in pages and populated fields',async()=>{
  const Ext=await loadExt()
  assert.equal(Ext.urlLooksSensitive('https://example.org/login'),true)
  assert.equal(Ext.urlLooksSensitive('https://example.org/checkout/pay'),true)
  assert.equal(Ext.canCapturePage('https://example.org/catalog',{
    title:'Shop',
    querySelector:()=>null,
    querySelectorAll:()=>[],
  }).ok,true)
  const field={matches:sel=>sel.includes('input')&&!sel.includes('checkbox'),getClientRects:()=>[{}],value:'user@example.org',isContentEditable:false}
  assert.equal(Ext.canCapturePage('https://example.org/catalog',{
    title:'Shop',
    querySelector:()=>null,
    querySelectorAll:selector=>selector.includes('input')?[field]:[],
  }).ok,false)
})

test('both capture gates distinguish author defaults from edits and always block passwords',async()=>{
  const browser=await chromium.launch({channel:'chromium',headless:true})
  try {
    const page=await browser.newPage()
    await page.setContent('<input type="email" value="Your Email Address"><textarea placeholder="Describe">Default text</textarea>')
    for(const file of ['extension/runtime.js','extension/lib/sensitive.js']) await page.addScriptTag({path:path.join(ROOT,file)})
    const gates=()=>page.evaluate(()=>[CurbCut.instantPrivacy(),CurbCutExt.canCapturePage('https://www.mass.edu/',document).ok])
    assert.deepEqual(await gates(),[true,true])
    await page.locator('textarea').fill('Describe')
    assert.deepEqual(await gates(),[true,true])
    await page.locator('input').fill('user@example.org')
    assert.deepEqual(await gates(),[false,false])
    await page.locator('input').fill('')
    await page.evaluate(()=>{document.querySelector('input').type='password'})
    assert.deepEqual(await gates(),[false,false])
  } finally { await browser.close() }
})

test('a barrier draft is stored on the local verification queue',async()=>{
  const queued=await enqueueDraft({
    url:'http://127.0.0.1:4317/fixtures/shop/',
    title:'Stillroom Supply',
    persona:'keyboard-only',
    task:'Tab to Add to cart',
    focus:{role:'button',name:'Continue',selector:'#continue'},
    keys:[{key:'Tab',focus:1,role:'button',named:true,visible:true,gapMs:200,effect:'focus-change',revisited:false}],
  })
  assert.equal(queued.status,'draft')
  const file=path.join(ROOT,'.curbcut/instant-queue',queued.id+'.json')
  const saved=JSON.parse(await readFile(file,'utf8'))
  assert.equal(saved.status,'draft')
  assert.equal(saved.report.title,'Stillroom Supply')
  assert.equal(saved.task.url,'http://127.0.0.1:4317/fixtures/shop/')
  await rm(file,{force:true})
})

test('popup lists retired site-fixed notices, Kane proof, and saves a barrier draft without a Jev key',async()=>{
  let server
  try {server=await serve()} catch(error) {
    if(error.code!=='EADDRINUSE') throw error
    server=await serve(0)
  }
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-trust-'))
  const extension=path.resolve('extension')
  const shop='http://127.0.0.1:4317/fixtures/shop/'
  const retired=await readJSON(path.join(ROOT,'patches/keyboard-add-headphones.json'))
  const verified=await readJSON(path.join(ROOT,'patches/v4-86f207deeb57-7bc09a21.json'))
  let context
  try {
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,acceptDownloads:true,
      args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']})
    const worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension:'))??
      await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension:'),timeout:8000})
    await worker.evaluate(port=>{CurbCutExt.TASKS_DRAFT_URL='http://127.0.0.1:'+port+'/tasks/draft'},server.address().port)
    const emptyKey=await worker.evaluate(async()=> {
      if(!globalThis.CurbCutJevConfig) return true
      return (await CurbCutJevConfig.get())==null
    })
    assert.equal(emptyKey,true)
    await worker.evaluate(async patches=>{
      await chrome.storage.local.set({patches,demoPatches:[],lastFeedAt:new Date().toISOString(),enabled:true,evidenceBase:''})
    },[retired,verified])
    const page=context.pages()[0]??await context.newPage()
    await page.goto(shop,{waitUntil:'domcontentloaded',timeout:15000})
    const tabId=await worker.evaluate(async href=>{
      const tabs=await chrome.tabs.query({})
      return tabs.find(tab=>tab.url===href)?.id??null
    },shop)
    assert.ok(tabId)
    await worker.evaluate(async tabId=>{
      await chrome.storage.local.set({pendingStuck:true,capturedTabId:tabId})
    },tabId)
    const popup=await context.newPage()
    await popup.goto(new URL('popup.html',worker.url()).href)
    await popup.locator('#site-fixed').waitFor()
    assert.match(await popup.locator('#site-fixed').innerText(),/works without Curb Cut/)
    assert.equal(await popup.locator('#retired-patches [data-patch-id="keyboard-add-headphones"]').count(),1)
    await popup.close()
    const captured=await worker.evaluate(async tabId=>handleCommand('im-stuck',await chrome.tabs.get(tabId)),tabId)
    assert.equal(captured.ok,true)
    assert.equal(captured.report?.title,'Stillroom Supply')
    for(const extra of context.pages().filter(item=>item!==page)) await extra.close()
    const reportPopup=await context.newPage()
    await reportPopup.goto(new URL('popup.html',worker.url()).href)
    await reportPopup.locator('#barrier-preview').waitFor()
    assert.match(await reportPopup.locator('#barrier-fields').innerText(),/Stillroom Supply/)
    await reportPopup.locator('#task-input').fill('Tab to Add to cart')
    await reportPopup.locator('#task-confirm').check()
    await reportPopup.getByRole('button',{name:'Save draft report'}).click()
    await reportPopup.getByText(/Draft saved|extension and will retry/).waitFor()
    const names=await readdir(path.join(ROOT,'.curbcut/instant-queue')).catch(()=>[])
    const drafts=[]
    for(const name of names.filter(item=>item.startsWith('draft-') && item.endsWith('.json'))) {
      const saved=JSON.parse(await readFile(path.join(ROOT,'.curbcut/instant-queue',name),'utf8'))
      if(saved.report?.task==='Tab to Add to cart' || saved.task?.task==='Tab to Add to cart') drafts.push(name)
    }
    assert.ok(drafts.length || await reportPopup.getByText(/extension and will retry/).count(),'A draft should be queued or held in extension storage.')
    for(const name of drafts) await rm(path.join(ROOT,'.curbcut/instant-queue',name),{force:true})
  } finally {
    try {await context?.close()}
    finally {
      await rm(profile,{recursive:true,force:true})
      server?.close()
    }
  }
},{timeout:60000})

test('popup loads inline Kane clips for a verified fix',async()=>{
  let server
  try {server=await serve()} catch(error) {
    if(error.code!=='EADDRINUSE') throw error
    server=await serve(0)
  }
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-clip-'))
  const extension=path.resolve('extension')
  const shop='http://127.0.0.1:4317/fixtures/shop/'
  const origin='http://127.0.0.1:'+server.address().port+'/'
  const donor=await readJSON(path.join(ROOT,'patches/keyboard-add-headphones.json'))
  const verified={...donor,status:'verified',
    evidence:{...donor.evidence,before:'proof/local/keyboard-only/before.mp4',after:'proof/local/keyboard-only/after.mp4',
      control:'proof/local/keyboard-only/control.mp4'}}
  let context
  try {
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,
      args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']})
    const worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension:'))??
      await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension:'),timeout:8000})
    await worker.evaluate(async ()=>{
      const start=Date.now()
      while(Date.now()-start<8000) {
        const {lastFeedAt}=await chrome.storage.local.get('lastFeedAt')
        if(lastFeedAt) return
        await new Promise(resolve=>setTimeout(resolve,50))
      }
    })
    await worker.evaluate(async ({patches,evidenceBase})=>{
      await chrome.storage.local.set({patches,demoPatches:[],lastFeedAt:new Date().toISOString(),enabled:true,evidenceBase})
    },{patches:[verified],evidenceBase:origin})
    const page=context.pages()[0]??await context.newPage()
    await page.goto(shop,{waitUntil:'domcontentloaded',timeout:15000})
    const tabId=await worker.evaluate(async href=>{
      const tabs=await chrome.tabs.query({})
      return tabs.find(tab=>tab.url===href)?.id??null
    },shop)
    assert.ok(tabId)
    await worker.evaluate(async tabId=>{
      await chrome.storage.local.set({pendingStuck:true,capturedTabId:tabId})
    },tabId)
    const popup=await context.newPage()
    await popup.goto(new URL('popup.html',worker.url()).href)
    const video=popup.locator('#active-patches video')
    await video.first().waitFor({state:'attached',timeout:15000})
    assert.ok(await video.count()>=2)
    const src=await video.first().getAttribute('src')
    assert.match(src,/proof\/local\/keyboard-only\/before\.mp4/)
    assert.equal(await video.first().getAttribute('aria-label'),'Before recording')
    assert.equal(await video.first().getAttribute('muted'),'')
    await popup.locator('#active-patches video').nth(1).evaluate(node=>{
      node.muted=true
      node.pause()
    })
  } finally {
    try {await context?.close()}
    finally {
      await rm(profile,{recursive:true,force:true})
      server?.close()
    }
  }
},{timeout:60000})
