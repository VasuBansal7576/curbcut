import path from 'node:path'
import {mkdtemp,mkdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {setTimeout as delay} from 'node:timers/promises'
import {chromium} from 'playwright'
import {guardRequests} from '../core/chrome.mjs'
import {pageBlock} from '../core/access.mjs'
import {serve} from '../core/server.mjs'
import {match} from '../core/engine.js'
import {ROOT,readJSON,saveJSON,command,instant} from '../core/io.mjs'

const folder=path.join(ROOT,'proof/jev')
const taskId=process.argv.find((arg,index)=>index>=2 && !arg.startsWith('--'))??'v4-b35dcf923211-caeef8bd'
const cohort=taskId.startsWith('v5-')?'heldout-v5':'hard-v4'
const registration=await readJSON(path.join(ROOT,'proof',cohort,'registration.json'))
const task=registration.tasks.find(({task})=>task.id===taskId)?.task
if(!task || !task.journey || task.barrierClass!==1) throw new Error('Choose a registered hover navigation journey.')
const bundled=await readJSON(path.join(ROOT,'extension/bundled.json'))
if(bundled.some(patch=>match(patch,task.url))) throw new Error('The demo URL has a bundled Curb Cut patch.')
const extension=path.join(ROOT,'extension')
const profile=await mkdtemp(path.join(tmpdir(),'curbcut-jev-demo-'))
const size={width:1920,height:1080}
const server=await serve().catch(error=>{if(error.code!=='EADDRINUSE')throw error})
const record=!process.argv.includes('--probe')
let context,video,recording
const watchdog=setTimeout(()=>{void context?.close().catch(()=>{})},45000).unref()
async function tabTo(page,selector,limit=45) {
  for(let attempt=0;attempt<limit;attempt++) {
    if(await page.locator(selector).evaluate(node=>document.activeElement===node,null,{timeout:700}).catch(()=>false)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Tab traversal did not reach '+selector)
}
try {
  context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,acceptDownloads:false,
    viewport:size,...(record?{recordVideo:{dir:profile,size}}:{}),
    args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking','--window-size=1920,1080']})
  await guardRequests(context,task,{extension:true,instantBridge:true})
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker',{timeout:8000})
  const page=context.pages()[0]??await context.newPage()
  video=page.video()
  const result=await page.goto(task.url,{waitUntil:'domcontentloaded',timeout:16000})
  const blocked=await pageBlock(page,result)
  if(blocked) throw new Error(blocked)
  const opener=task.journey[0].selector
  const link=task.journey.at(-1).selector
  const outcome=task.outcomeChecks.find(check=>check.kind==='url-path').equals
  await page.locator(opener).waitFor({timeout:6000})
  console.log('Public page and menu opener loaded.')
  await page.bringToFront()
  await tabTo(page,opener)
  console.log('Reached the menu opener by Tab.')
  await delay(850)
  if(await page.locator(link).isVisible()) throw new Error('The keyboard already opened the submenu.')
  if(!record) {
    const result=await worker.evaluate(async url=>{
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true})
      if(tab.url!==url) return {ok:false,reason:'wrong-tab'}
      try { await captureInstantScreenshot(tab.windowId) }
      catch(error) { return {ok:false,reason:"screenshot",detail:error.message} }
      return instantFix(tab.id)
    },page.url())
    if(result.ok) {
      if(!await page.locator(link).isVisible()) throw new Error('The submenu stayed hidden after applying the instant fix.')
      await page.keyboard.press('Escape')
      await page.locator('[data-curbcut-instant]').getByRole('status').filter({hasText:'Instant fix undone.'}).waitFor({timeout:4000})
      if(await page.locator(link).isVisible()) throw new Error('The submenu stayed open after undo.')
      result.undo='verified-with-escape'
      await worker.evaluate(()=>flushInstantQueue())
      const queued=await readJSON(path.join(ROOT,'.curbcut/instant-queue',result.patchId+'.json'))
      if(queued.status!=='queued' || queued.patch.id!==result.patchId) throw new Error('The local candidate was not queued.')
      result.queue='verified-locally'
    } else process.exitCode=1
    console.log(JSON.stringify(result))
  } else {
    await page.evaluate(()=>{
      let start
      document.addEventListener('keydown',event=>{
        if(event.code==='KeyF' && event.altKey && event.shiftKey && event.isTrusted) start=performance.now()
      },true)
      const observer=new MutationObserver(()=>{
        const host=document.querySelector('[data-curbcut-instant]')
        if(!host?.shadowRoot.textContent.includes('Fixed for you') || start===undefined) return
        window.__recordedInstantLatency=Math.round(performance.now()-start)
        observer.disconnect()
      })
      observer.observe(document.documentElement,{childList:true,subtree:true})
    })
    const start=performance.now()
    await page.keyboard.press('Alt+Shift+KeyF')
    console.log('Pressed Alt+Shift+F.')
    await page.locator('[data-curbcut-instant]').getByRole('button',{name:'Undo'}).waitFor({timeout:10000})
    const latencyMs=await page.evaluate(()=>window.__recordedInstantLatency)??Math.round(performance.now()-start)
    if(!await page.locator(link).isVisible()) throw new Error('The badge appeared but the submenu stayed hidden.')
    await delay(1250)
    await tabTo(page,link,8)
    await delay(550)
    await Promise.all([page.waitForURL(url=>url.pathname===outcome,{timeout:10000}),page.keyboard.press('Enter')])
    await delay(1250)
    const completedURL=page.url()
    await context.close()
    context=null
    recording=path.join(folder,'demo.mp4')
    await mkdir(folder,{recursive:true})
    const conversion=await command('ffmpeg',['-loglevel','error','-y','-i',await video.path(),'-c:v','libx264','-preset','fast',
      '-crf','17','-pix_fmt','yuv420p','-movflags','+faststart','-an',recording])
    if(conversion.code!==0) throw new Error(conversion.stderr)
    await saveJSON(path.join(folder,'demo.json'),{runner:'playwright-extension',at:instant(),hotkey:'Alt+Shift+F',
      taskId:task.id,url:task.url,completedURL,latencyMs,viewport:size,shippedPatch:false,
      video:'proof/jev/demo.mp4',timingOverlay:false})
    console.log('Recorded '+recording+' ('+latencyMs+' ms)')
  }
} finally {
  clearTimeout(watchdog)
  await context?.close().catch(()=>{})
  await rm(profile,{recursive:true,force:true})
  server?.close()
}
