const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {chromium}=require('playwright')
const root=path.resolve(__dirname,'../../..'),work=process.env.FILM_CACHE
const address='http://127.0.0.1:4391/fixtures/shop/',ext=path.join(root,'extension')
async function capture(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'curbcut-shop-popup-'))
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',deviceScaleFactor:2,
    args:['--mute-audio','--disable-extensions-except='+ext,'--load-extension='+ext]})
  try{
    const page=context.pages()[0]
    await page.route(address+'**',route=>{
      const file=new URL(route.request().url()).pathname.split('/').pop()||'index.html'
      if(!['index.html','shop.js','shop.css'].includes(file))return route.abort()
      return route.fulfill({path:path.join(root,'fixtures/shop',file)})
    })
    await page.goto(address)
    const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
    await worker.evaluate(()=>ensureSeeded())
    await page.bringToFront()
    const pending=context.waitForEvent('page')
    await worker.evaluate(()=>chrome.tabs.create({url:chrome.runtime.getURL('popup.html'),active:false}))
    const popup=await pending
    await popup.setViewportSize({width:390,height:780})
    await popup.waitForFunction(()=>document.querySelector('#page-url')?.textContent.includes('127.0.0.1'))
    const toggle=popup.locator('#global-toggle')
    const area=popup.locator('#popup-root')
    for(const [key,on] of [['off',false],['on',true]]){
      if(await toggle.isChecked()!==on)await popup.locator('.master').click()
      await popup.waitForFunction(value=>document.querySelector('#global-toggle-status').textContent.trim().toUpperCase()===value,on?'ON':'OFF')
      await area.screenshot({path:path.join(work,'shop-popup-'+key+'.png'),animations:'disabled'})
    }
  }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true})}
}
capture().catch(e=>{console.error(e);process.exitCode=1})
