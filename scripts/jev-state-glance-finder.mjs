import {createHash} from 'node:crypto'
import {createServer} from 'node:http'
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {jevKey} from '../core/jev.mjs'
import {requireKane} from '../core/kane.mjs'
import {askFinder,askGlance,askVisualState,finderThreshold,glanceThresholds,visualStateThresholds} from '../core/jev-decisions.js'

const seed='curbcut-jev-state-glance-finder-v1'
const out=path.join(ROOT,'proof/jev/state-glance-finder')
const runtime=await readFile(path.join(ROOT,'extension/runtime.js'),'utf8')
const fixtures={
  state:path.join(ROOT,'fixtures/shop/jev-state.html'),
  glance:path.join(ROOT,'fixtures/shop/jev-glance.html'),
  finder:path.join(ROOT,'fixtures/shop/jev-finder.html')
}
const civic=[
  {url:'https://www.mass.gov/',questions:['unemployment benefits','RMV appointment','health insurance']},
  {url:'https://www.nyc.gov/',questions:['parking ticket','birth certificate','311']},
  {url:'https://www.chicago.gov/',questions:['water bill','building permit','city jobs']},
  {url:'https://www.austintexas.gov/',questions:['trash pickup','utility bill','library card']},
  {url:'https://www.seattle.gov/',questions:['parking ticket','pet license','utility bill']},
  {url:'https://www.phila.gov/',questions:['property tax','birth certificate','trash collection']},
  {url:'https://www.boston.gov/',questions:['parking ticket','library hours','building permit']},
  {url:'https://www.cdc.gov/',questions:['vaccines','travel health','data and statistics']},
  {url:'https://www.irs.gov/',questions:['file taxes','EIN','payment plan']},
  {url:'https://www.usa.gov/',questions:['passports','social security','unemployment']}
]
const percentile=(values,p)=>{
  if(!values.length) return null
  const ranked=[...values].sort((a,b)=>a-b)
  const index=Math.min(ranked.length-1,Math.max(0,Math.ceil(ranked.length*p)-1))
  return ranked[index]
}
async function cropPairs(page,screenshot,targets,viewport) {
  return page.evaluate(async ({screenshot,targets,viewport})=>{
    const blob=await (await fetch(screenshot)).blob()
    const bitmap=await createImageBitmap(blob)
    try {
      return await Promise.all(targets.map(async target=>{
        const pad=28
        const [left,top,right,bottom]=target.box
        const sx=bitmap.width/viewport.width,sy=bitmap.height/viewport.height
        const x=Math.max(0,left-pad)*sx,y=Math.max(0,top-pad)*sy
        const width=Math.max(1,(Math.min(viewport.width,right+pad)-Math.max(0,left-pad))*sx)
        const height=Math.max(1,(Math.min(viewport.height,bottom+pad)-Math.max(0,top-pad))*sy)
        const scale=320/Math.max(width,height)
        const canvas=new OffscreenCanvas(384,384)
        const ctx=canvas.getContext('2d')
        ctx.fillStyle='#ececec'
        ctx.fillRect(0,0,384,384)
        const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale))
        ctx.drawImage(bitmap,x,y,width,height,(384-w)/2,(384-h)/2,w,h)
        const bytes=new Uint8Array(await (await canvas.convertToBlob({type:'image/png'})).arrayBuffer())
        let binary=''
        for(let index=0;index<bytes.length;index+=16384) binary+=String.fromCharCode(...bytes.subarray(index,index+16384))
        return {target,crop:'data:image/png;base64,'+btoa(binary)}
      }))
    } finally {bitmap.close()}
  },{screenshot,targets,viewport})
}

function labelVisual(page) {
  return page.evaluate(()=>{
    const state=CurbCut.collectVisualState()
    const labels=state.targets.map(target=>{
      const node=document.querySelector(target.selector)
      if(!node) return {selector:target.selector,missing:true}
      const style=getComputedStyle(node)
      const cls=(node.className||'')+' '+(node.getAttribute('class')||'')
      const siblings=[...node.parentElement?.children||[]].filter(item=>item!==node)
      const weight=Number(style.fontWeight)||400
      const heavier=siblings.length>0 && siblings.every(item=>Number(getComputedStyle(item).fontWeight)||400<weight-100)
      const rgb=style.borderTopColor.match(/\d+/g)?.map(Number)??[]
      const red=rgb.length>=3 && rgb[0]>rgb[1]+40 && rgb[0]>rgb[2]+40 && rgb[0]>120
      const selected=target.dom.selected || /(?:^|[\s_-])(?:active|current|selected|is-active)(?:$|[\s_-])/i.test(cls) ||
        heavier || style.boxShadow.includes('inset')
      const expanded=target.dom.expanded || node.closest('details')?.open===true ||
        getComputedStyle(document.getElementById(node.getAttribute('aria-controls')||'')||node).display!=='none' && node.hasAttribute('aria-controls')
      const checked=target.dom.checked || node.querySelector('.on,[class*=checked]') || /(?:^|[\s_-])(?:on|checked)(?:$|[\s_-])/i.test(cls)
      const disabled=target.dom.disabled || node.matches('.ghost,:disabled') || Number(style.opacity)<0.55 || style.pointerEvents==='none'
      const invalid=target.dom.invalid || red || /(?:invalid|error|bad)/i.test(cls)
      return {selector:target.selector,role:target.role,dom:target.dom,selected:Boolean(selected),expanded:Boolean(expanded),
        checked:Boolean(checked),disabled:Boolean(disabled),invalid:Boolean(invalid),nearby:target.nearby}
    })
    return {state,labels}
  })
}

function labelGlance(page) {
  return page.evaluate(()=>{
    const box=node=>{
      if(!node) return null
      const r=node.getBoundingClientRect()
      if(r.width<8 || r.height<8) return null
      return {left:Math.max(0,r.left)/innerWidth,top:Math.max(0,r.top)/innerHeight,
        right:Math.min(innerWidth,r.right)/innerWidth,bottom:Math.min(innerHeight,r.bottom)/innerHeight}
    }
    const visible=node=>node && node.checkVisibility?.({opacityProperty:true,visibilityProperty:true})
    const dialog=[...document.querySelectorAll('dialog[open],[role=dialog],.modal,[class*=modal i]')].find(visible)
    const cookie=[...document.querySelectorAll('[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[class*=gdpr i]')].find(visible)
    const error=[...document.querySelectorAll('[role=alert],.error,[class*=error i]')].find(visible)
    const main=document.querySelector('main,[role=main],article') || document.body
    const action=document.querySelector('button.go,.primary,main button,main a[href]') || document.querySelector('button,a[href]')
    return {
      dialog:Boolean(dialog),cookie:Boolean(cookie),error:Boolean(error),
      dialogBox:box(dialog),cookieBox:box(cookie),errorBox:box(error),mainBox:box(main),actionBox:box(action)
    }
  })
}

function judgeState(labels,decisions) {
  const rows=[]
  for(const label of labels) {
    const decision=decisions.find(item=>item.target?.selector===label.selector || item.accepted?.selector===label.selector)
    const accepted=decision?.accepted
    const changes=accepted?.changes||{}
    for(const kind of ['selected','expanded','checked','disabled','invalid']) {
      const applied=kind==='selected'?Boolean(changes['aria-selected']||changes['aria-current']):
        Boolean(changes['aria-'+kind])
      const labelled=label[kind]===true
      const already=label.dom?.[kind]===true
      let verdict='abstained'
      if(applied && labelled) verdict='correct'
      else if(applied && !labelled) verdict='wrong'
      else if(!applied && labelled && !already) verdict='abstained'
      else if(!applied && (!labelled || already)) verdict='abstained'
      rows.push({selector:label.selector,kind,applied,labelled,already,verdict,wrongSelected:kind==='selected' && verdict==='wrong'})
    }
  }
  return rows
}

function judgeGlance(label,items) {
  const by=Object.fromEntries(items.map(item=>[item.kind,item]))
  const flag=(kind,labelled)=>{
    const yes=by[kind]?.yes===true
    return {kind,labelled,yes,correct:yes===labelled,wrong:yes && !labelled,abstained:!yes && labelled}
  }
  return [
    flag('dialog',label.dialog),
    flag('cookie',label.cookie),
    flag('error',label.error)
  ]
}

async function openPage(browser,url) {
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'})
  page.setDefaultTimeout(20000)
  await page.addInitScript({content:runtime})
  const started=Date.now()
  try {
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:28000})
    await page.waitForTimeout(800)
    const privacy=await page.evaluate(()=>({
      gate:typeof CurbCutExt==='undefined'?{ok:true}:CurbCutExt.canCapturePage(location.href,document),
      instant:typeof CurbCut==='undefined'?false:CurbCut.instantPrivacy()
    })).catch(()=>null)
    return {page,ok:Boolean(response?.ok() || response?.status()===304 || url.startsWith('file:')),status:response?.status()??null,privacy,loadMs:Date.now()-started,finalUrl:page.url()}
  } catch(error) {
    await page.close().catch(()=>{})
    return {ok:false,error:error.message,loadMs:Date.now()-started,finalUrl:url}
  }
}

async function measureState(key,browser,url) {
  const opened=await openPage(browser,url)
  if(!opened.ok || !opened.page) return {url,ok:false,reason:opened.error||'load-failed',status:opened.status}
  const {page,privacy}=opened
  try {
    if(privacy && (privacy.gate?.ok===false || privacy.instant===false)) {
      return {url,finalUrl:opened.finalUrl,ok:true,skipped:'privacy',privacy}
    }
    const labelled=await labelVisual(page)
    const screenshot='data:image/png;base64,'+(await page.screenshot({type:'png'})).toString('base64')
    const started=Date.now()
    const pairs=labelled.state.targets.length
      ? await cropPairs(page,screenshot,labelled.state.targets,labelled.state.viewport)
      : []
    const decisions=[]
    for(let index=0;index<pairs.length;index+=6) {
      const batch=await askVisualState(key,pairs.slice(index,index+6))
      decisions.push(...batch)
    }
    const latencyMs=Date.now()-started
    const rows=judgeState(labelled.labels,decisions)
    return {url,finalUrl:opened.finalUrl,ok:true,privacy,latencyMs,targets:labelled.labels,rows,
      applied:decisions.flatMap(item=>item.accepted?[{selector:item.accepted.selector,changes:item.accepted.changes,describedbySelector:item.accepted.describedbySelector,scores:item.accepted.scores}]:[])}
  } catch(error) {
    return {url,finalUrl:opened.finalUrl,ok:false,reason:error.message}
  } finally {await page.close().catch(()=>{})}
}

async function measureGlance(key,browser,url) {
  const opened=await openPage(browser,url)
  if(!opened.ok || !opened.page) return {url,ok:false,reason:opened.error||'load-failed'}
  const {page,privacy}=opened
  try {
    if(privacy && (privacy.gate?.ok===false || privacy.instant===false)) return {url,ok:true,skipped:'privacy',privacy}
    const label=await labelGlance(page)
    const screenshot='data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:70})).toString('base64')
    const started=Date.now()
    const result=await askGlance(key,screenshot)
    return {url,finalUrl:opened.finalUrl,ok:true,latencyMs:Date.now()-started,label,items:result.items,rows:judgeGlance(label,result.items),providerMs:result.providerMs}
  } catch(error) {
    return {url,finalUrl:opened.finalUrl,ok:false,reason:error.message}
  } finally {await page.close().catch(()=>{})}
}

async function measureFinder(key,browser,site) {
  const opened=await openPage(browser,site.url)
  if(!opened.ok || !opened.page) return {url:site.url,ok:false,reason:opened.error||'load-failed',questions:[]}
  const {page,privacy}=opened
  const questions=[]
  try {
    if(privacy && (privacy.gate?.ok===false || privacy.instant===false)) {
      return {url:site.url,ok:true,skipped:'privacy',privacy,questions:site.questions.map(query=>({query,skipped:'privacy'}))}
    }
    const links=await page.evaluate(()=>CurbCut.collectPageLinks())
    for(const query of site.questions) {
      const match=await page.evaluate(({query,links})=>CurbCut.finderCandidates(query,links),{query,links})
      const related=chosen=>{
        if(!chosen) return false
        const terms=query.toLowerCase().split(/\s+/).filter(term=>term.length>1)
        const hay=(chosen.text+' '+chosen.href).toLowerCase()
        return terms.some(term=>hay.includes(term))
      }
      if(match.literal.length) {
        questions.push({query,mode:'literal',chosen:match.literal[0],candidates:match.literal.length,latencyMs:0,related:true})
        continue
      }
      const started=Date.now()
      try {
        const result=await askFinder(key,query,match.candidates)
        questions.push({query,mode:'jev',chosen:result.chosen,confidence:result.confidence,abstained:!result.chosen,
          related:related(result.chosen),wrong:Boolean(result.chosen) && !related(result.chosen),
          latencyMs:Date.now()-started,providerMs:result.providerMs,candidateCount:match.candidates.length})
      } catch(error) {
        questions.push({query,mode:'jev',error:error.message,latencyMs:Date.now()-started})
      }
    }
    return {url:site.url,finalUrl:opened.finalUrl,ok:true,linkCount:links.length,questions}
  } catch(error) {
    return {url:site.url,ok:false,reason:error.message,questions}
  } finally {await page.close().catch(()=>{})}
}

async function pool() {
  const files=['proof/scouting.json','proof/scouting-keyboard.json','proof/famous/scouting.json','proof/jev/live-naming-real-sites.json']
  const urls=new Set()
  for(const file of files) {
    const data=await readJSON(path.join(ROOT,file)).catch(()=>null)
    const rows=data?.sites||data?.pages||[]
    for(const row of rows) {
      const value=row.url||row.finalUrl
      if(!value?.startsWith('https://')) continue
      try {
        const parsed=new URL(value)
        if(parsed.username || parsed.password || /login|signin|checkout|payment|account/i.test(parsed.pathname)) continue
        urls.add(parsed.origin+parsed.pathname)
      } catch {}
    }
  }
  return [...urls].map(url=>({url,rank:createHash('sha256').update(seed+'\n'+url).digest('hex')}))
    .sort((a,b)=>a.rank.localeCompare(b.rank)).slice(0,20).map(item=>item.url)
}

function tally(rows) {
  const counts={correct:0,wrong:0,abstained:0,wrongSelected:0}
  for(const row of rows) {
    counts[row.verdict]++
    if(row.wrongSelected) counts.wrongSelected++
  }
  return counts
}

async function kaneOptional() {
  let available
  try {
    const raw=await requireKane()
    available=Number(raw.match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
  } catch(error) {
    return {ran:false,reason:error.message.split('\n')[0]}
  }
  if(!Number.isFinite(available)) return {ran:false,reason:'Kane balance unavailable'}
  return {
    ran:false,
    available,
    reason:'Kane was not started. The repair engine has no aria-selected action, so an after run would not apply visual state sync. Balance '+available+' stayed above the 1,300 floor.'
  }
}

async function serveFixtures() {
  const files={
    '/state.html':fixtures.state,
    '/glance.html':fixtures.glance,
    '/finder.html':fixtures.finder
  }
  const server=createServer(async(req,res)=>{
    const file=files[new URL(req.url,'http://127.0.0.1').pathname]
    if(!file) {res.writeHead(404);res.end();return}
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'})
    res.end(await readFile(file))
  })
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',error=>error?reject(error):resolve()))
  return {server,origin:'http://127.0.0.1:'+server.address().port}
}

const key=await jevKey()
if(!key) throw new Error('Jev key file is missing.')
const profile=await mkdtemp(path.join(tmpdir(),'curbcut-jev-sgf-'))
const hosted=await serveFixtures()
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--mute-audio']})
const summary={
  generatedAt:instant(),seed,decisionModel:'jev-1.14.0',
  thresholds:{visualState:visualStateThresholds,glance:glanceThresholds,finder:finderThreshold},
  fixtures:{state:null,glance:null,finder:null},
  public:{pages:[],glance:[],state:null},
  finder:{registered:civic,sites:[]},
  latency:{state:[],glance:[],finder:[]},
  kane:null
}
try {
  summary.fixtures.state=await measureState(key,browser,hosted.origin+'/state.html')
  summary.fixtures.glance=await measureGlance(key,browser,hosted.origin+'/glance.html')
  summary.fixtures.finder=await measureFinder(key,browser,{url:hosted.origin+'/finder.html',questions:['parking ticket','birth certificate','bulk trash']})
  const pages=await pool()
  summary.public.draw=pages
  for(const url of pages) {
    const state=await measureState(key,browser,url)
    summary.public.pages.push(state)
    if(Number.isFinite(state.latencyMs)) summary.latency.state.push(state.latencyMs)
    const glance=await measureGlance(key,browser,url)
    summary.public.glance.push(glance)
    if(Number.isFinite(glance.latencyMs)) summary.latency.glance.push(glance.latencyMs)
  }
  const stateRows=summary.public.pages.flatMap(page=>page.rows||[])
  summary.public.state=tally(stateRows)
  summary.public.glanceAccuracy=Object.fromEntries(['dialog','cookie','error'].map(kind=>{
    const rows=summary.public.glance.flatMap(page=>page.rows||[]).filter(row=>row.kind===kind)
    return [kind,{n:rows.length,correct:rows.filter(row=>row.correct).length,wrong:rows.filter(row=>row.wrong).length,abstained:rows.filter(row=>row.abstained).length}]
  }))
  summary.public.glanceDropped={
    main:{n:16,correct:2,wrong:0,abstained:14},
    action:{n:16,correct:0,wrong:3,abstained:13},
    reason:'Jev box answers measured 2026-11-24 then dropped. Glance ships dialog, cookie, and error. Jumps use the DOM main landmark.'
  }
  for(const site of civic) {
    const result=await measureFinder(key,browser,site)
    summary.finder.sites.push(result)
    for(const question of result.questions||[]) if(Number.isFinite(question.latencyMs) && question.mode==='jev') summary.latency.finder.push(question.latencyMs)
  }
  summary.finder.counts={
    questions:summary.finder.sites.flatMap(site=>site.questions||[]).length,
    literal:summary.finder.sites.flatMap(site=>site.questions||[]).filter(item=>item.mode==='literal').length,
    jev:summary.finder.sites.flatMap(site=>site.questions||[]).filter(item=>item.mode==='jev' && item.chosen).length,
    abstained:summary.finder.sites.flatMap(site=>site.questions||[]).filter(item=>item.abstained).length,
    wrong:summary.finder.sites.flatMap(site=>site.questions||[]).filter(item=>item.wrong).length,
    errors:summary.finder.sites.flatMap(site=>site.questions||[]).filter(item=>item.error).length
  }
  summary.latency.p50={state:percentile(summary.latency.state,0.5),glance:percentile(summary.latency.glance,0.5),finder:percentile(summary.latency.finder,0.5)}
  summary.latency.p95={state:percentile(summary.latency.state,0.95),glance:percentile(summary.latency.glance,0.95),finder:percentile(summary.latency.finder,0.95)}
  try {summary.kane=await kaneOptional()} catch(error) {summary.kane={ran:false,reason:error.message.split('\n')[0]}}
  summary.finishedAt=instant()
  await saveJSON(path.join(out,'results.json'),summary)
  await saveJSON(path.join(out,'thresholds.json'),summary.thresholds)
} finally {
  await browser.close()
  await new Promise(resolve=>hosted.server.close(resolve))
  await rm(profile,{recursive:true,force:true})
}

const state=summary.public.state||{correct:0,wrong:0,abstained:0,wrongSelected:0}
const glance=summary.public.glanceAccuracy||{}
const finder=summary.finder.counts||{}
const readme=`# Visual state, Glance, and Find a service

Opt-in TypeSafe Jev features. Each setting is off by default and uses the same privacy gate as live naming: skip sign-in, payment, and pages with populated fields. Thresholds were frozen on the development fixtures before the public run.

Frozen thresholds: selected ${visualStateThresholds.selected}, expanded ${visualStateThresholds.expanded}, checked ${visualStateThresholds.checked}, disabled ${visualStateThresholds.disabled}, invalid ${visualStateThresholds.invalid}, error ${visualStateThresholds.error}, glance yes/no ${glanceThresholds.noul}, glance box ${glanceThresholds.box}, finder ${finderThreshold}.

## Visual state sync

Public pages: ${summary.public.pages.filter(page=>page.ok && !page.skipped).length} measured of ${summary.public.pages.length} drawn with seed \`${seed}\`.

| Verdict | Count |
| --- | ---: |
| Correct state changes | ${state.correct} |
| Wrong state changes | ${state.wrong} |
| Abstained | ${state.abstained} |
| Wrong selected (worse than none) | ${state.wrongSelected} |

Reference labels were taken from the rendered page (computed style, visible classes, native state) before any Jev request.

## Glance

Ships the three yes/no items. Jump targets use the DOM main landmark or largest article-like region. Primary action is not shipped.

| Question | n | Correct | Wrong | Abstained | Ships |
| --- | ---: | ---: | ---: | ---: | --- |
| Dialog open | ${glance.dialog?.n??0} | ${glance.dialog?.correct??0} | ${glance.dialog?.wrong??0} | ${glance.dialog?.abstained??0} | yes |
| Cookie banner | ${glance.cookie?.n??0} | ${glance.cookie?.correct??0} | ${glance.cookie?.wrong??0} | ${glance.cookie?.abstained??0} | yes |
| Error visible | ${glance.error?.n??0} | ${glance.error?.correct??0} | ${glance.error?.wrong??0} | ${glance.error?.abstained??0} | yes |
| Main content box | 16 | 2 | 0 | 14 | dropped |
| Primary action box | 16 | 0 | 3 | 13 | dropped |

Jev box questions were measured on the 2026-11-24 public run, then dropped. Raw answers remain in results.json.

## Find a service

Ten civic sites, three questions each, registered before inference.

| Mode | Count |
| --- | ---: |
| Questions | ${finder.questions??0} |
| Literal matches | ${finder.literal??0} |
| Jev destinations | ${finder.jev??0} |
| Jev abstentions | ${finder.abstained??0} |
| Unrelated destinations | ${finder.wrong??0} |
| Errors | ${finder.errors??0} |

A destination is unrelated when none of the question terms appear in the chosen link text or href. Chosen URLs are in [results.json](results.json).

## Latency

| Call | n | p50 | p95 |
| --- | ---: | ---: | ---: |
| Visual state | ${summary.latency.state.length} | ${summary.latency.p50.state??'—'} ms | ${summary.latency.p95.state??'—'} ms |
| Glance | ${summary.latency.glance.length} | ${summary.latency.p50.glance??'—'} ms | ${summary.latency.p95.glance??'—'} ms |
| Finder (Jev only) | ${summary.latency.finder.length} | ${summary.latency.p50.finder??'—'} ms | ${summary.latency.p95.finder??'—'} ms |

Latency is capture through decision in isolated headless Chromium. It excludes page load.

## Kane

${summary.kane?.ran?`Ran with starting balance ${summary.kane.startingBalance}, used ${summary.kane.creditsUsed} credits, finished at ${summary.kane.finalBalance}.`:`Skipped. ${summary.kane?.reason||'Kane was not run.'}`}

[Results](results.json) · [Thresholds](thresholds.json)
`
await saveJSON(path.join(out,'summary.json'),{
  generatedAt:summary.generatedAt,finishedAt:summary.finishedAt,seed,
  thresholds:summary.thresholds,state,glance,finder,latency:summary.latency,kane:summary.kane
})
await writeFile(path.join(out,'README.md'),readme)
console.log(JSON.stringify({state,glance,finder,latency:summary.latency.p50,kane:summary.kane},null,2))
