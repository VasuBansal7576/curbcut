import {serve} from '../core/server.mjs'
import {chromium} from 'playwright'
import {readJSON,saveJSON,command,instant} from '../core/io.mjs'
import assert from 'node:assert/strict'
import {catalog} from '../core/loop.mjs'
const server=await serve(),browser=await chromium.launch()
try{
 const page=await browser.newPage({viewport:{width:320,height:800}})
 await page.goto('http://127.0.0.1:4317/site/',{waitUntil:'domcontentloaded'})
 const meta=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,links:[...document.querySelectorAll('a[href],video[src]')].map(el=>el.href||el.src)}))
 assert.equal(meta.w,meta.scroll)
 const paths=[...new Set(meta.links.map(u=>u.split('#')[0]))]
 for(const url of paths){const r=await fetch(url,{method:'HEAD'});assert.equal(r.status,200,url)}
 const local=(await readJSON('proof/local.json')).runs
 const external=(await readJSON('proof/public.json')).runs
 const kane=(await catalog()).filter(p=>['verified','broken','retired'].includes(p.status)).flatMap(p=>[p.evidence.before,p.evidence.control,p.evidence.after,...p.history.filter(h=>h.event==='retired').map(h=>h.video)])
 const files=[...new Set([...kane,...local.flatMap(r=>Object.values(r.videos)),...external.flatMap(r=>Object.values(r.phases).map(p=>p.video)),'proof/local/toggle.mp4','launch/curbcut-launch.mp4'])]
 const recordings=[]
 for(const file of files){
   const result=await command('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',file])
   assert.equal(result.code,0,file)
   const probe=JSON.parse(result.stdout)
   const seconds=Number(probe.format.duration)
   assert(seconds>0)
   if(file.startsWith('launch/')){assert(seconds>=90 && seconds<=150);assert.equal(probe.streams[0].width,1920);assert.equal(probe.streams[0].height,1080)}
   recordings.push({file,seconds,...probe.streams[0]})
 }
 await saveJSON('proof/validation.json',{at:instant(),dashboard:{viewport:320,contentWidth:meta.scroll,linkedFilesChecked:paths.length},recordings})
 console.log('Validated',paths.length,'dashboard URLs, 320px reflow and',recordings.length,'videos.')
}finally{await browser.close();server.close()}
