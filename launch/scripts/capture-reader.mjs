import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'

const root=fileURLToPath(new URL('../../',import.meta.url))
const extension=path.join(root,'extension')
const plates=path.join(root,'launch/film/plates')
const inventory=JSON.parse(await readFile(path.join(extension,'bundled.json')))
const patch=inventory.find(p=>p.id==='v6-5193be8805ece27f858e')
const index=JSON.parse(await readFile(path.join(plates,'index.json')))
for(const enabled of [false,true]){
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-reader-'))
  let context
  try{
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:720},deviceScaleFactor:3,args:['--mute-audio','--disable-extensions-except='+extension,'--load-extension='+extension]})
    const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
    await worker.evaluate(enabled=>chrome.storage.local.set({enabled}),enabled)
    const page=context.pages()[0]
    await page.goto(patch.url,{waitUntil:'domcontentloaded'})
    const selector=patch.observedSelector
    await page.locator(selector).waitFor({state:'attached'})
    await page.waitForFunction(({selector,enabled})=>!!document.querySelector(selector)?.getAttribute('aria-label')===enabled,{selector,enabled})
    await page.addScriptTag({path:path.join(extension,'runtime.js')})
    const result=await page.evaluate(selector=>{
      CurbCut.reader()
      const {row,info}=CurbCut.readerRow(document.querySelector(selector))
      row.scrollIntoView({block:'center'})
      const range=document.createRange()
      range.selectNodeContents(row.firstChild)
      const box=el=>[el.x,el.y,el.width,el.height].map(v=>v*devicePixelRatio)
      return {rect:box(row.getBoundingClientRect()),words:box(range.getBoundingClientRect()),info}
    },selector)
    assert.equal(result.info.name,enabled?'Vorherige Folie':'')
    const id='reader-'+(enabled?'on':'off'),file=id+'.png'
    await page.screenshot({path:path.join(plates,file)})
    index[id]={file,source:'proof/heldout-v6/measurements/'+patch.id+'.json',patch:patch.id,url:page.url(),enabled,selector,deviceScaleFactor:3,size:[3840,2160],...result}
    console.log(id,result)
  }finally{
    await context?.close()
    await rm(profile,{recursive:true,force:true})
  }
}
await writeFile(path.join(plates,'index.json'),JSON.stringify(index,null,2)+'\n')
