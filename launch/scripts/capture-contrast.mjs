import assert from 'node:assert/strict'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'

const root=fileURLToPath(new URL('../../',import.meta.url))
const extension=path.join(root,'extension')
const plates=path.join(root,'launch/film/plates')
const inventory=JSON.parse(await readFile(path.join(extension,'bundled.json')))
const patch=inventory.find(p=>p.id==='v6-035402528fb5fd67e4c6')
const source=await readFile(path.join(root,'core/contrast.js'),'utf8')
const inspect=new Function('node',source.replaceAll('export function','function')+'\nconst model=contrastModel(node); return model && measureContrast(model)')
const index=JSON.parse(await readFile(path.join(plates,'index.json')))
for(const enabled of [false,true]){
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-contrast-'))
  let context
  try{
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:2,args:['--mute-audio','--disable-extensions-except='+extension,'--load-extension='+extension]})
    const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
    await worker.evaluate(enabled=>chrome.storage.local.set({enabled}),enabled)
    const page=context.pages()[0]
    await page.goto(patch.url,{waitUntil:'domcontentloaded',timeout:60000})
    const link=page.locator(patch.observedSelector)
    await link.waitFor()
    await page.evaluate(()=>document.fonts.ready)
    await page.waitForFunction(()=>[...document.images].some(img=>img.complete && img.naturalWidth>400),{},{timeout:15000})
    let measurement
    for(let i=0;i<30;i++){
      measurement=await link.evaluate(inspect)
      if(measurement?.ratio.toFixed(2)===(enabled?'4.50':'4.39'))break
      await page.waitForTimeout(200)
    }
    assert.equal(measurement?.ratio.toFixed(2),enabled?'4.50':'4.39')
    const box=await link.boundingBox()
    const id='contrast-'+(enabled?'on':'off')
    const file=id+'.png'
    await page.screenshot({path:path.join(plates,file),animations:'disabled'})
    index[id]={file,source:'proof/heldout-v6/extension-e2e.json',patch:patch.id,label:'LOCAL PROOF',enabled,url:page.url(),selector:patch.observedSelector,deviceScaleFactor:2,size:[2880,1800],rect:[box.x,box.y,box.width,box.height].map(x=>x*2),measurement}
    console.log(id,measurement.ratio,box)
  }finally{
    await context?.close()
    await rm(profile,{recursive:true,force:true})
  }
}
await writeFile(path.join(plates,'index.json'),JSON.stringify(index,null,2)+'\n')
