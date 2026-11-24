import path from 'node:path'
import {mkdir} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {session} from '../core/chrome.mjs'
import {serve} from '../core/server.mjs'
import {readJSON,saveJSON,ROOT,instant,relative} from '../core/io.mjs'
import {propose} from '../core/agent.mjs'
import {checkPatch} from '../core/loop.mjs'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const fresh=process.argv.includes('--agent')
const selected=process.env.CURBCUT_PERSONA
const contract=await readJSON(path.join(ROOT,'fixtures/shop/contract.json'))
const records=[]
let server
try { server=await serve() } catch(e) {if(e.code!=='EADDRINUSE') throw e}
async function tabTo(page,selector) {
  const visited=[]
  for(let i=0;i<26;i++){
    await page.keyboard.press('Tab')
    const target=await page.evaluate(sel=>({matched:document.activeElement.matches(sel),name:document.activeElement.id||document.activeElement.textContent.trim().slice(0,26)||document.activeElement.tagName}),selector)
    if(target.matched) return {found:true,visited}
    if(visited.length>1 && target.name===visited[0]) break
    visited.push(target.name)
    await wait(70)
  }
  return {found:false,visited}
}
async function exercise(page,task,persona) {
  const control=persona==='control'
  if(task.persona==='keyboard-only') {
    if(control) {await page.locator('#search').fill('headphones');await page.locator('#search-form button').click();await page.locator('.add-to-cart').click()}
    else {
      const reached=await tabTo(page,'#search')
      assert(reached.found)
      await page.keyboard.type('headphones',{delay:65})
      await page.keyboard.press('Enter')
      const add=await tabTo(page,'.add-to-cart')
      if(!add.found) {
        await page.locator('.add-to-cart').click()
        assert.equal(await page.locator('#cart').innerText(),'Cart (0)')
        return {pass:false,reason:'Tab traversal skipped the visible Add to cart control; the enforced pointer attempt left Cart (0).',steps:add.visited}
      }
      await page.keyboard.press('Enter')
    }
  } else if(task.persona==='low-vision') {
    const add=page.locator('[data-product=speaker] [data-add]')
    const box=await add.boundingBox()
    const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}))
    if(!control && (box.x<0 || box.x+box.width>metrics.width)) {
      await page.mouse.wheel(0,450)
      return {pass:false,reason:'Porch Speaker Add to cart is outside the 320px viewport. Vertical scrolling cannot reach it.',steps:[JSON.stringify({box,...metrics})]}
    }
    await add.click()
  } else {
    const input=control?page.locator('#search'):page.locator('[data-curbcut-reader]').getByRole('searchbox',{name:'Search products',exact:true})
    if(!await input.count()) return {pass:false,reason:'Reading view lists an unnamed searchbox. No searchbox named Search products exists.',steps:['Find Search products in reading order']}
    await input.fill('speaker')
    await input.press('Enter')
    const pass=await page.locator('#search-status').innerText()==='1 product found.' && await page.locator('[data-product=speaker]').isVisible() && !await page.locator('[data-product=headphones]').isVisible()
    return {pass,reason:pass?'Search submitted, one result: Porch Speaker.':'Search result mismatch.'}
  }
  const pass=await page.locator('#cart').innerText()==='Cart (1)'
  return {pass,reason:await page.locator('#cart-status').innerText()}
}
async function localRun(task,persona,patch,dir) {
  await mkdir(dir,{recursive:true})
  const browser=await session(task,persona,patch,dir)
  try {
    await wait(900)
    const observed=await exercise(browser.page,task,persona)
    await wait(750)
    const snapshot=await browser.page.evaluate(()=>CurbCut.snapshot())
    const harness=await browser.page.evaluate(()=>globalThis.__curbcutState)
    if(persona==='low-vision') assert.equal(harness.horizontalScroll,false)
    const file=dir+'.mp4'
    await browser.finish(file)
    const result={runner:'local-playwright',status:observed.pass?'pass':'fail',reason:observed.reason,steps:observed.steps??[],harness,snapshot,video:relative(file),at:instant()}
    await saveJSON(path.join(dir,'result.json'),result)
    return result
  } catch(e){await browser.abort().catch(()=>{});throw e}
}
try {
  const candidates=[]
  for(const item of contract.tasks.filter(t=>!selected || t.persona===selected)){
    const task=await readJSON(path.join(ROOT,'tasks',item.persona+'.json'))
    const dir=path.join(ROOT,'proof/local',item.persona)
    const before=await localRun(task,task.persona,null,path.join(dir,'before'))
    assert.equal(before.status,'fail',before.reason)
    const control=await localRun(task,'control',null,path.join(dir,'control'))
    assert.equal(control.status,'pass',control.reason)
    let candidate
    if(fresh) candidate=await propose(task,before,null,path.join(dir,'proposal'))
    else {
      try{candidate=await readJSON(path.join(dir,'proposal/candidate.json'))}
      catch(e){if(e.code!=='ENOENT')throw e;candidate={id:task.id,url:task.url,site:'127.0.0.1',match:task.url,persona:task.persona,task:task.task,status:'candidate',barrier:before.reason,rules:item.rules,evidence:{},history:[]}}
    }
    const after=await localRun(task,task.persona,candidate,path.join(dir,'after'))
    assert.equal(after.status,'pass',after.reason)
    let retirement
    const demonstration=structuredClone(candidate)
    demonstration.url+='?fixed=1'
    await checkPatch(demonstration,{run:localRun,persist:async patch=>{retirement=patch.history.at(-1);await saveJSON(path.join(dir,'retirement.json'),{source:'local-playwright',published:false,patch})},base:dir})
    assert.equal(retirement.event,'retired')
    candidates.push({...candidate,evidence:{before:before.video,after:after.video,control:control.video}})
    records.push({persona:task.persona,task:task.task,before:before.status,after:after.status,control:control.status,retirement:'pass',videos:{before:before.video,after:after.video,control:control.video,retirement:retirement.video}})
    console.log(item.persona,before.status,control.status,after.status,retirement.event)
  }
  if(!selected) {
    await saveJSON(path.join(ROOT,'proof/local.json'),{runner:'local-playwright',completedAt:instant(),runs:records})
    await saveJSON(path.join(ROOT,'extension/demo.json'),candidates)
  }
} finally {if(server) await new Promise(resolve=>server.close(resolve))}
