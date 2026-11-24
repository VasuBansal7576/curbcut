import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {contentWorld} from '../../scripts/jev-live-extension-e2e.mjs'
import {jevKey} from '../../core/jev.mjs'

const extension=new URL('../../extension/',import.meta.url).pathname
const folder=new URL('../film/plates/',import.meta.url)
const updates={}
const inventory=JSON.parse(await readFile(new URL('bundled.json','file://'+extension)))
const patch=inventory.find(p=>p.id==='v6-5193be8805ece27f858e')
const sites=[
  {id:'reader',url:patch.url,selectors:[patch.observedSelector],names:['Vorherige Folie'],source:'proof/heldout-v6/measurements/'+patch.id+'.json'},
  {id:'jev',url:'https://meridiano.net/',selectors:['#open-sidebar','a.btn-buscar'],names:['Menú','Buscar'],source:'proof/jev/live-naming-demo/capture.json'}
]
for(const site of sites.filter(s=>!process.env.FILM_READER||s.id===process.env.FILM_READER)){
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-film-reader-'))
  let browser
  try{
    browser=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:800},deviceScaleFactor:3,args:['--mute-audio','--disable-extensions-except='+extension,'--load-extension='+extension]})
    const worker=browser.serviceWorkers()[0]??await browser.waitForEvent('serviceworker')
    const configure=settings=>worker.evaluate(s=>chrome.storage.local.set(s),settings)
    await worker.evaluate(()=>ensureSeeded())
    if(site.id==='jev'){
      const key=await jevKey()
      assert.ok(key,'A configured Jev key is required for a new live capture')
      await worker.evaluate(key=>CurbCutJevConfig.set(key),key)
    }
    await configure({enabled:false,readerEnabled:false,liveNamesEnabled:false})
    const page=browser.pages()[0]
    const inspect=await contentWorld(browser,page)
    await page.bringToFront()
    await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:50000})
    for(const selector of site.selectors)await page.locator(selector).first().waitFor({state:'attached'})
    for(const enabled of [false,true]){
      if(enabled){
        await configure({enabled:true,liveNamesEnabled:site.id==='jev'})
        try{
          await page.waitForFunction(({selectors,names})=>selectors.every((selector,i)=>document.querySelector(selector)?.getAttribute('aria-label')===names[i]),site,{timeout:35000})
        }catch(error){
          const names=await page.evaluate(s=>s.map(x=>document.querySelector(x)?.getAttribute('aria-label')),site.selectors)
          throw Error(site.url+' returned '+JSON.stringify(names),{cause:error})
        }
      }
      await page.waitForFunction(()=>document.readyState==='complete',null,{timeout:50000})
      const opened=await inspect(()=>{globalThis.closeFilmReader=CurbCut.reader();return true})
      assert.ok(opened,'The installed extension must supply the Reading view')
      const dialog=page.locator('[data-curbcut-reader][open]')
      await dialog.waitFor()
      await dialog.evaluate(async()=>{await document.fonts.ready})
      const targets=await inspect(selectors=>{
        const rows=selectors.map(s=>CurbCut.readerRow(document.querySelector(s)))
        rows[0].row.scrollIntoView({block:'center'})
        const box=node=>{const r=node.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>v*devicePixelRatio)}
        return rows.map(({row,info})=>{
          const range=document.createRange()
          range.selectNodeContents(row.firstChild)
          const css=getComputedStyle(row.firstChild),panel=getComputedStyle(row.closest('dialog'))
          return {text:row.firstChild.textContent,name:info.name,rect:box(row),words:box(range),font:css.fontFamily,color:css.color,background:panel.backgroundColor}
        })
      },site.selectors)
      assert.ok(targets.every(t=>t.font.includes('CurbCutReaderText')),JSON.stringify(targets))
      assert.deepEqual(targets.map(t=>t.name),enabled?site.names:site.names.map(()=>''))
      const id=site.id+'-'+(enabled?'on':'off'),file=id+'.png'
      await page.screenshot({path:new URL(file,folder).pathname})
      updates[id]={file,url:page.url(),source:site.source,method:'Fresh installed-extension Reading view on the public site',enabled,deviceScaleFactor:3,size:[3840,2400],selectors:site.selectors,targets,rect:targets[0].rect,words:targets[0].words}
      console.log(id,JSON.stringify(targets))
      await inspect(()=>{globalThis.closeFilmReader()})
      await dialog.waitFor({state:'detached'})
    }
    const catalog=JSON.parse(await readFile(new URL('index.json',folder)))
    await writeFile(new URL('index.json',folder),JSON.stringify({...catalog,...updates},null,2)+'\n')
  }finally{await browser?.close();await rm(profile,{recursive:true,force:true})}
}
