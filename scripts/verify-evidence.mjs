import {serve} from '../core/server.mjs'
import {chromium} from 'playwright'
import {readJSON,saveJSON,command,instant} from '../core/io.mjs'
import assert from 'node:assert/strict'
import {catalog} from '../core/loop.mjs'
const server=await serve(Number(process.env.CURBCUT_VERIFY_PORT ?? 4317))
let browser
try{
 browser=await chromium.launch({channel:'chromium',headless:true})
 const page=await browser.newPage({viewport:{width:320,height:800}})
 const origin='http://127.0.0.1:'+server.address().port
 await page.goto(origin+'/site/',{waitUntil:'load'})
 await page.evaluate(()=>document.fonts.ready)
 const meta=await page.evaluate(()=>({
   w:innerWidth,scroll:document.documentElement.scrollWidth,
   previews:[...document.querySelectorAll('.replay')].flatMap(card=>[card.dataset.previewBefore,card.dataset.previewAfter]),
   links:[...document.querySelectorAll('a[href],video[src],img[src],track[src],script[src],link[href]')]
     .map(el=>el.href||el.src).concat(performance.getEntriesByType('resource').map(row=>row.name)),
   targets:[...document.querySelectorAll('a[href^="#"]')].map(el=>Boolean(document.getElementById(el.hash.slice(1))))
 }))
 assert.equal(meta.w,meta.scroll)
 assert(meta.targets.every(Boolean),'Missing section anchor')
 assert.equal(new Set(meta.previews).size,6)
 const previewUrls=meta.previews.map(file=>new URL(file,page.url()).href)
 const paths=[...new Set([...meta.links,...previewUrls].map(u=>u.split('#')[0]))]
 for(const url of paths){
   const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(30000)})
   assert.equal(response.status,200,url)
 }
 const inventory=(await catalog()).filter(p=>['verified','locally-verified'].includes(p.status))
 const rows=page.locator('.ledger-table tbody')
 assert.equal(await rows.count(),inventory.length)
 const currentIds=await rows.evaluateAll(groups=>groups.map(group=>group.querySelector('.details').id))
 assert.deepEqual(currentIds.sort(),inventory.map(p=>'detail-'+p.id).sort())
 await page.getByRole('searchbox').fill('mass.edu')
 const mass=page.getByRole('button',{name:'mass.edu',exact:true})
 await mass.focus()
 await page.keyboard.press('Enter')
 assert.equal(await mass.getAttribute('aria-expanded'),'true')
 assert.equal(await page.locator('.details:visible a[data-recording]').count(),3)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320)
 const replay=page.locator('.details:visible a[data-recording]').first()
 await replay.focus()
 await page.keyboard.press('Enter')
 assert(await page.getByRole('dialog').isVisible())
 await page.keyboard.press('Escape')
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.recording),await replay.getAttribute('data-recording'))
 await page.getByRole('searchbox').fill('')
 await page.locator('select[name="proof"]').selectOption('Local')
 assert.equal(await page.locator('tbody[data-proof="Kane"]:visible').count(),0)
 await page.getByRole('button',{name:'Next page'}).click()
 assert.match(await page.locator('#count').textContent(),/^6–/)
 await page.getByRole('searchbox').fill('no.match.invalid')
 assert(await page.locator('#empty').isVisible())
 await page.getByRole('button',{name:'Clear filters'}).click()
 assert.match(await page.locator('#count').textContent(),new RegExp('of '+inventory.length+' fixes$'))
 const local=(await readJSON('proof/local.json')).runs
 const external=(await readJSON('proof/public.json')).runs
 const kane=(await catalog()).filter(p=>['verified','broken','retired'].includes(p.status)).flatMap(p=>[p.evidence.before,p.evidence.control,p.evidence.after,...p.history.filter(h=>h.event==='retired').map(h=>h.video)])
 const files=[...new Set([...kane,...meta.previews.map(file=>'site/'+file),...local.flatMap(r=>Object.values(r.videos)),...external.flatMap(r=>Object.values(r.phases).map(p=>p.video)),'proof/local/toggle.mp4','launch/curbcut-launch.mp4'])]
 const recordings=[]
 for(const file of files){
   const result=await command('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',file])
   assert.equal(result.code,0,file)
   const probe=JSON.parse(result.stdout)
   const seconds=Number(probe.format.duration)
   assert(seconds>0)
   if(file.startsWith('launch/')){
     const {master}=await readJSON('launch/film/word-times.json')
     const authoredSeconds=master.reduce((sum,scene)=>sum+scene.frames,0)/30
     assert((seconds>=90 && seconds<=150) || (seconds>=70 && seconds<=85),'Unexpected launch cut duration')
     assert(Math.abs(seconds-authoredSeconds)<1/30,'Launch recording disagrees with the authored cut')
     assert.equal(probe.streams[0].width,1920)
     assert.equal(probe.streams[0].height,1080)
   }
   recordings.push({file,seconds,...probe.streams[0]})
 }
 await saveJSON('proof/validation.json',{at:instant(),dashboard:{viewport:320,contentWidth:meta.scroll,linkedFilesChecked:paths.length},recordings})
 console.log('Validated',paths.length,'dashboard URLs, 320px reflow and',recordings.length,'videos.')
}finally{await browser?.close();server.closeAllConnections();server.close()}
