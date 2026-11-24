import assert from 'node:assert/strict'
import path from 'node:path'
import {session} from '../core/chrome.mjs'
import {ROOT,saveJSON,instant,relative,readJSON} from '../core/io.mjs'
const plans=[
 {id:'graham-essay',url:'https://www.paulgraham.com/avg.html',selector:'p',contains:'April 2001',task:'Read the opening of Beating the Averages at 320 CSS pixels using vertical scrolling only.',rules:[
 {selector:'body > table, body > table > tbody, body > table > tbody > tr, body > table > tbody > tr > td, table[width="435"], td[width="435"]',action:'injectCSS',value:{display:'block',width:'auto','max-width':'100%'}},
 {selector:'img',action:'injectCSS',value:{'max-width':'100%',height:'auto'}}]},
 {id:'norvig-sudoku',url:'https://www.norvig.com/sudoku.html',selector:'pre',contains:'def cross(A, B)',task:'Read the cross-product function and definitions in Solving Every Sudoku Puzzle at 320 CSS pixels without panning horizontally.',rules:[{selector:'pre',action:'injectCSS',value:{'white-space':'pre-wrap','overflow-wrap':'anywhere'}}]},
 {id:'berkshire-letter',url:'https://www.berkshirehathaway.com/letters/1999htm.html',selector:'p',contains:'Our gain in net worth during 1999',task:'Read the first financial-results paragraph in the 1999 shareholder letter at 320 CSS pixels without panning horizontally.',rules:[{selector:'table, tbody, tr, td',action:'injectCSS',value:{display:'block',width:'auto','max-width':'100%'}}]}
]
const selection=process.argv[2]
const previous=selection?await readJSON(path.join(ROOT,'proof/public.json')).catch(()=>({runs:[]})):{runs:[]}
const rows=previous.runs.filter(row=>row.id!==selection)
for(const plan of plans.filter(plan=>!selection || plan.id===selection)){
 const task={id:plan.id,url:plan.url,persona:'low-vision',task:plan.task}
 const patch={...task,site:new URL(task.url).hostname,match:task.url,barrier:'The selected passage extends past the right edge of a 320px-wide reading viewport.',rules:plan.rules,status:'candidate',history:[],evidence:{}}
 const dir=path.join(ROOT,'proof/public',plan.id)
 const row={...task,status:'inconclusive',runner:'local-playwright',phases:{}}
 try{
  for(const phase of ['before','control','after']){
   const browser=await session(task,phase==='control'?'control':'low-vision',phase==='after'?patch:null,dir)
   try{
    const result=await browser.page.evaluate(({selector,contains})=>{
     const el=[...document.querySelectorAll(selector)].find(n=>n.textContent.replace(/\s+/g,' ').includes(contains))
     if(!el) throw new Error('Passage not found')
     window.scrollTo(0,el.getBoundingClientRect().top+scrollY-48)
     const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT)
     const rects=[]
     let text=''
     while(text.length<540 && walker.nextNode()){
      const node=walker.currentNode
      const length=Math.min(540-text.length,node.length)
      const range=document.createRange()
      range.setStart(node,0);range.setEnd(node,length)
      rects.push(...range.getClientRects())
      text+=node.textContent.slice(0,length)
     }
     const visible=rects.filter(r=>r.width && r.height)
     if(!visible.length) throw new Error('No visible lines')
     return {title:document.title,width:innerWidth,left:Math.round(Math.min(...visible.map(r=>r.left))),right:Math.ceil(Math.max(...visible.map(r=>r.right))),passageLength:text.length,normalized:text.replace(/\s+/g,' ').trim(),scrollX}
    },plan)
    const {normalized,...measurement}=result
    const crypto=await import('node:crypto')
    const digest=crypto.createHash('sha256').update(normalized).digest('hex')
    await browser.page.waitForTimeout(1600)
    await browser.page.mouse.wheel(0,110)
    await browser.page.waitForTimeout(1100)
    const file=path.join(dir,phase+'.mp4')
    await browser.finish(file)
    row.phases[phase]={...measurement,digest,pass:result.left>=0 && result.right<=result.width && result.scrollX===0,video:relative(file),observedAt:instant()}
    await saveJSON(path.join(dir,'observations.json'),row)
   }catch(error){await browser.abort().catch(()=>{});throw error}
   await new Promise(r=>setTimeout(r,2500))
  }
  const {before,control,after}=row.phases
  assert(!before.pass && control.pass && after.pass && before.digest===after.digest && before.digest===control.digest,'Expected failed narrow reading, successful control and identical readable passage after repair')
  row.status='locally-reproduced'
  await saveJSON(path.join(dir,'candidate.json'),patch)
 }catch(error){row.reason=error.message}
 rows.push(row);await saveJSON(path.join(dir,'observations.json'),row)
 await saveJSON(path.join(ROOT,'proof/public.json'),{runner:'local-playwright',runs:rows})
 console.log(plan.id,row.status,row.reason??'')
}
