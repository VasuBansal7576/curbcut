import test from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {fixtureServer} from './fixture-server.mjs'
import {guardRequests,session} from '../core/chrome.mjs'
import {preflight} from '../core/preflight.mjs'
import {readJSON} from '../core/io.mjs'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {setTimeout as delay} from 'node:timers/promises'
import path from 'node:path'

test('request callbacks handle rejections from a closed page inside the guard',async()=>{
 let handle
 await guardRequests({async route(_pattern,callback){handle=callback},async routeWebSocket(){}},
  {url:'http://127.0.0.1:4317/fixtures/shop/'})
 const request=method=>({method:()=>method,url:()=> 'http://127.0.0.1:4317/fixtures/shop/',isNavigationRequest:()=>false})
 const fail=async()=>{throw new Error('Target page, context or browser has been closed')}
 await assert.doesNotReject(handle({request:()=>request('GET'),continue:fail,abort:fail}))
 await assert.doesNotReject(handle({request:()=>request('POST'),abort:fail}))
})

test('the free access preflight uses the recorded profile and rejects a blocked document',async()=>{
 const server=await fixtureServer()
 try {
  const task=await readJSON('tasks/low-vision.json')
  const accessible=await preflight(task)
  assert.equal(accessible.runner,'playwright-cdp')
  assert.equal(accessible.status,'pass')
  assert.deepEqual(accessible.lanes.map(lane=>[lane.persona,lane.width,lane.httpStatus]),[['low-vision',320,200],['control',1280,200]])
  const blocked=await preflight({...task,url:new URL('missing-preflight-page',task.url).href})
  assert.equal(blocked.status,'blocked')
  assert.deepEqual(blocked.lanes,[{persona:'low-vision',status:'blocked',reason:'HTTP 404'}])
 } finally {server.close()}
})
test('a second CDP client sees the injected keyboard guard, balanced bindings and repairs after navigation',async()=>{
 let server
 try {server=await fixtureServer()} catch(e){if(e.code!=='EADDRINUSE')throw e}
 const dir=await mkdtemp(path.join(tmpdir(),'curbcut-test-'))
 let browser
 try{
  const task=await readJSON('tasks/keyboard-only.json')
  task.url+='?fixed=0'
  const patch=(await readJSON('extension/demo.json'))[0]
  browser=await session(task,'keyboard-only',null,dir)
  const client=await chromium.connectOverCDP(browser.endpoint)
  const page=client.contexts()[0].pages()[0]
  await page.locator('.add-to-cart').click()
  assert.equal(await page.locator('#cart').innerText(),'Cart (0)')
  await page.evaluate(()=>document.querySelector('.add-to-cart').click())
  assert.equal(await page.locator('#cart').innerText(),'Cart (0)')
  await page.evaluate(p=>{globalThis.releaseOne=CurbCut.apply(p);globalThis.releaseTwo=CurbCut.apply(p)},patch)
  await page.locator('.add-to-cart').focus();await page.keyboard.press('Enter')
  assert.equal(await page.locator('#cart').innerText(),'Cart (1)')
  await page.evaluate(()=>{releaseOne();document.querySelector('.add-to-cart').removeAttribute('tabindex')})
  await page.waitForFunction(()=>document.querySelector('.add-to-cart').tabIndex===0)
  await page.evaluate(()=>{const n=document.createElement('div');n.className='add-to-cart';n.id='added';document.body.append(n)})
  await page.waitForFunction(()=>document.querySelector('#added').tabIndex===0)
  await page.evaluate(()=>releaseTwo())
  assert.equal(await page.locator('#added').getAttribute('role'),null)
  assert.equal(await page.locator('[data-product=headphones] .add-to-cart').getAttribute('tabindex'),null)
  await page.evaluate(p=>{
    const link=document.createElement('a')
    link.id='anchor-without-href'
    document.body.append(link)
    CurbCut.apply({...p,rules:[{selector:'#anchor-without-href',action:'makeFocusable'}]})
  },patch)
  assert.equal(await page.locator('#anchor-without-href').getAttribute('tabindex'),'0')
  await page.reload()
  assert.equal(await page.evaluate(()=>__curbcutState.persona),'keyboard-only')
  const observed=await page.evaluate(async p=>{
    const matching=[]
    const rules=[{selector:'[data-state=available]',action:'makeFocusable'}]
    const stop=CurbCut.apply({...p,rules},index=>matching.push(index))
    const button=document.createElement('div')
    button.dataset.state='available'
    document.body.append(button)
    await new Promise(resolve=>setTimeout(resolve,0))
    const focusable=button.tabIndex===0
    button.dataset.state='used'
    stop()
    return {matching,focusable,remaining:document.querySelectorAll(rules[0].selector).length}
  },patch)
  assert.deepEqual(observed,{matching:[0],focusable:true,remaining:0})
  await client.close()
 }finally{await browser?.abort();await rm(dir,{recursive:true,force:true});server?.close()}
})
test('the Kane attachment holds the 320px viewport through resizes, scrolling and disconnect',async()=>{
 let server,browser,client
 try{server=await fixtureServer()}catch(e){if(e.code!=='EADDRINUSE')throw e}
 const dir=await mkdtemp(path.join(tmpdir(),'curbcut-viewport-test-'))
 try{
  const task=await readJSON('tasks/low-vision.json')
  task.url+='?fixed=0'
  browser=await session(task,'low-vision',null,dir)
  client=await chromium.connectOverCDP(browser.endpoint)
  const page=client.contexts()[0].pages()[0]
  const cdp=await page.context().newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false})
  await cdp.send('Emulation.clearDeviceMetricsOverride')
  await page.reload()
  await page.evaluate(()=>scrollTo(150,120))
  await page.locator('[data-product=speaker] [data-add]').scrollIntoViewIfNeeded()
  await client.close()
  assert.deepEqual(await browser.page.evaluate(()=>[innerWidth,scrollX,__curbcutState.minWidth,__curbcutState.maxWidth,__curbcutState.horizontalScroll]),[320,0,320,320,false])
 }finally{await client?.close();await browser?.abort();await rm(dir,{recursive:true,force:true});server?.close()}
})
test('dialog escape and data-backed timeout repairs release cleanly',async()=>{
 let server,browser
 try{server=await fixtureServer()}catch(e){if(e.code!=='EADDRINUSE')throw e}
 const dir=await mkdtemp(path.join(tmpdir(),'curbcut-dialog-test-'))
 try{
  const task=await readJSON('tasks/keyboard-only.json')
  task.url+='?fixed=0'
  const patch={...(await readJSON('extension/demo.json'))[0],rules:[
   {selector:'#shipping-dialog',action:'removeFocusTrap'},
   {selector:'#start-reservation',action:'extendTimeout',value:60000},
   {selector:'html',action:'setLang',value:'en-GB'}
  ]}
  browser=await session(task,'control',null,dir)
  const page=browser.page
  await page.locator('#shipping').click();await page.keyboard.press('Escape')
  assert(await page.locator('#shipping-dialog').isVisible())
  await page.evaluate(p=>{globalThis.release=CurbCut.apply(p)},patch)
  await page.keyboard.press('Escape')
  assert(!await page.locator('#shipping-dialog').isVisible())
  assert.equal(await page.locator('#start-reservation').getAttribute('data-timeout'),'60000')
  await page.evaluate(()=>release())
  assert.equal(await page.locator('#start-reservation').getAttribute('data-timeout'),'5000')
  assert.equal(await page.locator('html').getAttribute('lang'),'en')
 }finally{await browser?.abort();await rm(dir,{recursive:true,force:true});server?.close()}
})
test('trusted activation survives a document transition and follows the focused recorded popup',{timeout:12000},async()=>{
 let server
 try{server=await fixtureServer()}catch(error){if(error.code!=='EADDRINUSE')throw error}
 const dir=await mkdtemp(path.join(tmpdir(),'curbcut-navigation-test-'))
 let browser
 try{
  const task=await readJSON('tasks/keyboard-only.json')
  task.url+='?fixed=0'
  browser=await session({...task,observedSelector:'#destination'},'keyboard-only',null,dir)
  const page=browser.page
  await page.evaluate(url=>{
   const link=document.createElement('a')
   Object.assign(link,{id:'destination',href:url+'&destination=1',textContent:'Destination',target:'_blank'})
   document.body.prepend(link)
   link.focus()
  },task.url)
  const [popup]=await Promise.all([page.waitForEvent('popup',{timeout:6000}),page.keyboard.press('Enter')])
  await popup.waitForLoadState('domcontentloaded')
  await popup.bringToFront()
  assert((await browser.activePage(popup.url()))===popup)
  assert.deepEqual((await browser.lineage(popup)).map(target=>target.url()),[page.url(),popup.url()])
  assert.equal(await popup.evaluate(()=>__curbcutState.keys.activate),0)
  assert(browser.observations.get(page).events.some(event=>event.type==='activate' && event.targetMatches))
  assert(browser.observations.get(popup).events.some(event=>event.type==='document' && event.top))
 }finally{await browser?.abort();await rm(dir,{recursive:true,force:true});server?.close()}
})

test('a real Tab move records target focus while locator focus alone does not',async()=>{
 const server=await fixtureServer()
 let browser
 try {
  const task={...await readJSON('tasks/keyboard-only.json'),observedSelector:'#shipping'}
  browser=await session(task,'keyboard-only',null,tmpdir(),{local:true})
  const {page,observations}=browser
  const focused=()=>observations.get(page).events.some(event=>event.type==='tab-focus' && event.targetMatches)
  await page.locator('#shipping').focus()
  assert.equal(focused(),false)
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  assert.equal(focused(),true)
 } finally {await browser?.abort();server.close()}
})

test('invisible keyboard targets cannot activate and a focus-revealed link can',async()=>{
 const server=await fixtureServer()
 let browser
 try {
  const task={...await readJSON('tasks/keyboard-only.json'),observedSelector:'[data-visibility-test]'}
  browser=await session(task,'keyboard-only',null,tmpdir(),{local:true})
  const {page,observations}=browser
  await page.evaluate(()=>{
   const panel=document.createElement('div')
   panel.innerHTML=`<style>#revealed{opacity:0}#revealed:focus{opacity:1}</style>
    <div style="opacity:.09"><button id="transparent" data-visibility-test>Transparent</button></div>
    <div aria-hidden="true"><button id="hidden-tree" data-visibility-test>Hidden tree</button></div>
    <div inert><button id="inert-target">Inert</button></div>
    <button id="hidden-style" style="visibility:hidden">Hidden style</button>
    <button id="off-screen" data-visibility-test style="position:fixed;left:-600px">Off screen</button>
    <button id="clipped" data-visibility-test style="clip-path:inset(50%)">Clipped</button>
    <div style="width:0;height:0;overflow:hidden"><button id="overflow">Overflow</button></div>
    <a id="revealed" data-visibility-test href="#activated">Revealed on focus</a>`
   document.body.prepend(panel)
   globalThis.activations=[]
   panel.addEventListener('click',event=>activations.push(event.target.id))
   panel.querySelector('#revealed').addEventListener('keydown',event=>{
    if(event.key==='ArrowDown') panel.querySelector('#transparent').click()
   })
  })
  for(const id of ['inert-target','hidden-style','off-screen','overflow','clipped']) {
   assert(await page.locator('#'+id).evaluate(element=>CurbCut.keyboardVisibility(element)),id)
  }
  for(const id of ['transparent','hidden-tree','off-screen','clipped']) {
   await page.locator('#'+id).focus()
   await page.keyboard.press('Enter')
   await page.keyboard.press('Space')
  }
  await page.locator('#revealed').focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  assert.deepEqual(await page.evaluate(()=>activations),['revealed'])
  assert.equal(new URL(page.url()).hash,'#activated')
  const events=observations.get(page).events
  assert(events.some(event=>event.type==='blocked-activation' && event.targetMatches && event.eventType==='click'))
  assert.deepEqual(events.filter(event=>event.type==='activate').map(event=>event.focused),[true])
 } finally {await browser?.abort();server.close()}
})

test('a reflow witness distinguishes a reached clipped passage from wrapped text',async()=>{
 const server=await fixtureServer()
 let browser
 try {
  const observedSelector='#trial-passage'
  const task={...await readJSON('tasks/low-vision.json'),observedSelector,probe:{action:'read'},outcomeChecks:[
   {selector:observedSelector,kind:'contains',equals:'trial passage'},
   {selector:observedSelector,kind:'fits-width'}
  ]}
  browser=await session(task,'low-vision',null,tmpdir(),{local:true})
  const {page,observations}=browser
  await page.evaluate(()=>{
   const el=document.createElement('pre')
   el.id='trial-passage'
   el.style.cssText='margin:0;width:100%;overflow-x:hidden;white-space:pre'
   el.textContent='trial passage '.repeat(20)
   document.body.append(el)
   el.scrollIntoView({block:'center'})
  })
  const witnesses=()=>observations.get(page).events.filter(event=>event.type==='passage')
  async function expectWitness(fits) {
   for(let attempt=0;attempt<40 && witnesses().at(-1)?.geometry.fits!==fits;attempt++) await delay(25)
   assert.equal(witnesses().at(-1)?.geometry.fits,fits)
  }
  await expectWitness(false)
  await page.locator('#trial-passage').evaluate(el=>{
   el.style.whiteSpace='pre-wrap'
   window.dispatchEvent(new Event('resize'))
  })
  await expectWitness(true)
 } finally {await browser?.abort();server.close()}
})

test('hard-barrier fixture journeys fail unpatched and pass with repairs and pointer controls',async t=>{
  const {confirmBarrier,replayLane}=await import('../core/probe.mjs')
  const {normalizeTask}=await import('../core/task.mjs')
  const server=await fixtureServer()
  try {
    for(const {rules,...definition} of await readJSON('fixtures/shop/journeys.json')) await t.test(definition.id,async()=>{
      const task=await normalizeTask({...definition,url:'http://127.0.0.1:4317/fixtures/shop/journeys.html'})
      const patch={...task,site:'127.0.0.1',match:task.url,rules,barrier:'Deliberate fixture barrier',status:'candidate',evidence:{},history:[]}
      const unpatched=await confirmBarrier(task)
      assert.equal(unpatched.control?.status,'pass',unpatched.control?.reason)
      assert.equal(unpatched.persona?.status,'fail',unpatched.persona?.reason)
      assert.equal(unpatched.status,'confirmed')
      const after=await replayLane(task,task.persona,patch)
      assert.equal(after.status,'pass',JSON.stringify(after.steps)+' '+after.reason)
      const control=await replayLane(task,'control',patch)
      assert.equal(control.status,'pass',JSON.stringify(control.steps)+' '+control.reason)
    })
  } finally {await new Promise(resolve=>server.close(resolve))}
})

test('repair observations include hidden targets, ancestors, hover rules and live selector matches',async()=>{
  const {replayLane,validateLiveSelectors}=await import('../core/probe.mjs')
  const server=await fixtureServer()
  try {
    const url='http://127.0.0.1:4317/fixtures/shop/journeys.html'
    const [{rules,...definition}]=await readJSON('fixtures/shop/journeys.json')
    const task={...definition,url}
    const before=await replayLane(task,task.persona)
    const context=before.snapshot.context
    assert(context.nodes.some(node=>node.selector==='#porch-link' && node.box[2]===0))
    assert(context.nodes.some(node=>node.selector==='#products-menu' && node.children.includes('#products-trigger')))
    assert(context.hoverRules.some(rule=>rule.selector.includes('#products-menu:hover') && rule.declarations.includes('display: block')))
    const live=await validateLiveSelectors(task,rules)
    assert.equal(live.ok,true)
    assert.equal(live.matches[0].matches[0].id,'products-menu')
    const wrong=await validateLiveSelectors(task,[{action:'listboxBehavior',trigger:'#sort-trigger',list:'#sort-options',options:'#products-trigger'}])
    assert.equal(wrong.ok,false)
    const options=wrong.matches.find(match=>match.field==='options')
    assert.equal(options.issue,'no matches')
    assert.equal(options.matches[0].id,'products-trigger')
  } finally {await new Promise(resolve=>server.close(resolve))}
})

test('the hover recipe finds a shared owner beyond the trigger neighborhood',async()=>{
  const server=await fixtureServer()
  let browser
  try {
    const url='http://127.0.0.1:4317/fixtures/shop/journeys.html'
    browser=await session({url},'control',null,tmpdir(),{local:true})
    const rules=await browser.page.evaluate(()=>{
      const trigger=document.querySelector('#products-trigger')
      for(let depth=0;depth<6;depth++) {
        const wrapper=document.createElement('div')
        trigger.before(wrapper)
        wrapper.append(trigger)
      }
      return CurbCut.menuHoverRecipes(trigger,['#porch-link'])
    })
    assert.deepEqual(rules,[{selector:'#products-menu',action:'mirrorHoverToFocus'}])
  } finally {await browser?.abort();server.close()}
})

test('common widget specimens are discovered and work with patched keyboard and pointer input',async t=>{
  const {confirmBarrier,replayLane}=await import('../core/probe.mjs')
  const {normalizeTask}=await import('../core/task.mjs')
  const {candidatesFor,inspectPage}=await import('../scripts/scout-v4.mjs')
  const server=await fixtureServer()
  try {
    for(const {specimen,rules,...definition} of await readJSON('fixtures/shop/widgets.json')) await t.test(specimen,async()=>{
      const task=await normalizeTask({...definition,url:'http://127.0.0.1:4317/fixtures/shop/widgets.html?specimen='+specimen})
      const patch={...task,site:'127.0.0.1',match:'http://127.0.0.1:4317/fixtures/shop/widgets.html',rules,
        barrier:'Fixture interaction requires pointer input',status:'candidate',evidence:{},history:[]}
      const browser=await session(task,'control',null,tmpdir(),{local:true})
      try {
        const discovery=await browser.page.evaluate(inspectPage)
        const proposed=candidatesFor('fixture.local',task.url,discovery,{version:5})
        assert(proposed.some(candidate=>candidate.barrierClass===task.barrierClass),JSON.stringify(discovery.hard))
      } finally {await browser.abort()}
      const before=await confirmBarrier(task)
      assert.equal(before.control.status,'pass',before.control.reason)
      assert.equal(before.persona?.status,'fail',before.persona?.reason)
      const after=await replayLane(task,task.persona,patch)
      assert.equal(after.status,'pass',JSON.stringify(after.steps)+' '+after.reason)
      const pointer=await replayLane(task,'control',patch)
      assert.equal(pointer.status,'pass',JSON.stringify(pointer.steps)+' '+pointer.reason)
    })
  } finally {await new Promise(resolve=>server.close(resolve))}
})

test('dialog traps both Tab directions and a replaced widget is repaired and released cleanly',async()=>{
  const server=await fixtureServer()
  let browser
  try {
    const url='http://127.0.0.1:4317/fixtures/shop/journeys.html'
    const definitions=await readJSON('fixtures/shop/journeys.json')
    const modal=definitions.find(item=>item.barrierClass===4)
    const menu=definitions.find(item=>item.id==='fixture-hover-brands')
    const select=definitions.find(item=>item.barrierClass===5)
    const task={...modal,url}
    const patch={id:'widget-lifecycle',site:'127.0.0.1',match:url,task:modal.task,persona:modal.persona,
      barrier:'Focus is not managed.',rules:[...modal.rules,...menu.rules,...select.rules],status:'candidate',evidence:{},history:[]}
    browser=await session(task,'keyboard-only',null,tmpdir(),{local:true})
    const page=browser.page
    await page.evaluate(patch=>{
      const list=document.querySelector('#sort-options')
      const original=document.querySelector('#sort-trigger')
      const trigger=original.cloneNode(true)
      list.remove()
      original.replaceWith(trigger)
      trigger.addEventListener('click',()=>{
        trigger.after(list)
        list.hidden=false
      })
      globalThis.release=CurbCut.apply(patch)
      globalThis.releaseSecond=CurbCut.apply(patch)
      const previous=document.querySelector('#brands-links')
      previous.replaceWith(previous.cloneNode(true))
    },patch)
    await page.locator('#delivery-trigger').focus()
    await page.keyboard.press('Enter')
    assert.equal(await page.locator(':focus').getAttribute('id'),'delivery-close')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await page.locator(':focus').getAttribute('id'),'delivery-product')
    await page.keyboard.press('Tab')
    assert.equal(await page.locator(':focus').getAttribute('id'),'delivery-close')
    await page.keyboard.press('Escape')
    assert.equal(await page.locator(':focus').getAttribute('id'),'delivery-trigger')
    await page.evaluate(()=>releaseSecond())
    await page.locator('#sort-trigger').focus()
    await page.keyboard.press('ArrowDown')
    assert.equal(await page.locator(':focus').getAttribute('id'),'featured-option')
    await page.keyboard.press('Escape')
    assert.equal(await page.locator(':focus').getAttribute('id'),'sort-trigger')
    await page.locator('#brands-trigger').focus()
    await page.keyboard.press('ArrowDown')
    assert(await page.locator('#brands-links').isVisible())
    await page.keyboard.press('Escape')
    assert(!await page.locator('#brands-links').isVisible())
    await page.evaluate(()=>release())
    assert.equal(await page.locator('#brands-trigger').getAttribute('tabindex'),null)
    assert.equal(await page.locator('#brands-trigger').getAttribute('aria-expanded'),null)
  } finally {
    await browser?.abort()
    await new Promise(resolve=>server.close(resolve))
  }
})
