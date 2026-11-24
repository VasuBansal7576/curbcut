import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'

const ext=new URL('../../extension/',import.meta.url).pathname
const plates=new URL('../film/plates/',import.meta.url)
const updates={}
const profile=await mkdtemp(path.join(tmpdir(),'curbcut-popup-film-'))
let context
try{
  context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:900},deviceScaleFactor:2,args:['--mute-audio','--disable-extensions-except='+ext,'--load-extension='+ext]})
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
  await worker.evaluate(()=>ensureSeeded())
  const page=context.pages()[0]
  for(const [key,url,num] of [['popup-apply-fixes','https://www.mass.edu/',1],['popup-proof-and-report','https://www.mass.edu/',1]]){
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000})
    await page.bringToFront()
    const opened=context.waitForEvent('page')
    await worker.evaluate(()=>chrome.tabs.create({url:chrome.runtime.getURL('popup.html'),active:false}))
    const popup=await opened
    popup.on("pageerror",err=>console.error(err.message))
    await popup.setViewportSize({width:390,height:780})
    const count=popup.locator('#active-count')
    for(let i=0;i<10;i++){
      await popup.waitForFunction(()=>/^\d+$/.test(document.getElementById('active-count')?.textContent||''))
      console.log(url,await count.innerText(),await popup.locator('#page-url').innerText())
      if(Number(await count.innerText())===num)break
      await page.waitForTimeout(600)
      await page.bringToFront()
      await popup.reload()
    }
    assert.equal(Number(await count.innerText()),num,url)
    if(key==='popup-proof-and-report'){
      for(const text of ['Watch proof','Send fix to site owner'])await popup.getByText(text,{exact:true}).click()
    }
    await popup.evaluate(()=>document.fonts.ready)
    const main=popup.locator('#popup-root'),selector=key==='popup-proof-and-report'?'.patch-item details:first-of-type':'.master'
    const target=await popup.locator(selector).first().boundingBox(),origin=await main.boundingBox()
    const file='../../ui/'+key+'.png'
    await main.screenshot({path:new URL(file,plates).pathname,animations:'disabled'})
    updates[key]={file,source:'extension/popup.html',url,method:'Fresh installed extension popup on the active public tab',deviceScaleFactor:2,size:[Math.round(origin.width*2),Math.round(origin.height*2)],rect:[target.x-origin.x,target.y-origin.y,target.width,target.height].map(v=>v*2)}
    console.log(key,updates[key].rect)
    if(key==='popup-apply-fixes'){
      await popup.locator('#global-toggle').uncheck()
      await popup.waitForFunction(()=>document.getElementById('global-toggle-status').textContent.trim().toUpperCase()==='OFF')
      const paused='../../ui/popup-all-paused.png',box=await main.boundingBox()
      await main.screenshot({path:new URL(paused,plates).pathname,animations:'disabled'})
      updates['popup-apply-off']={...updates[key],file:paused,enabled:false,size:[Math.round(box.width*2),Math.round(box.height*2)]}
      await popup.locator('#global-toggle').check()
      await popup.waitForFunction(()=>document.getElementById('global-toggle-status').textContent.trim().toUpperCase()==='ON')
    }
    await popup.close()
  }
  const index=JSON.parse(await readFile(new URL('index.json',plates)))
  await writeFile(new URL('index.json',plates),JSON.stringify({...index,...updates},null,2)+'\n')
}finally{await context?.close();await rm(profile,{recursive:true,force:true})}
