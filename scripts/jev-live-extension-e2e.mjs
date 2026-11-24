import assert from 'node:assert/strict'
import {mkdir,mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {ROOT,saveJSON} from '../core/io.mjs'
import {jevKey} from '../core/jev.mjs'
import {decisionModel,liveNamingThreshold} from '../core/jev-decisions.js'

const sites=[
  'https://www.munich-airport.de/',
  'https://mollygram.com/',
  'https://meridiano.net/',
  'https://www.futbolfantasy.com/',
  'https://www.samcart.com/',
  'https://www.vedantu.com/',
  'https://www.ndtv.com/',
  'https://www.allrecipes.com/',
  'https://lesscss.org/',
  'https://www.storm.mg/',
  'https://www.woah.org/en/home/',
  'https://medcitynews.com/',
  'https://wiki.selfhtml.org/',
  'https://crushblocks.com/',
  'https://www.demandsage.com/',
  'https://bitcore.io/',
  'https://www.independent.com/',
  'https://www.cgsecurity.org/',
  'https://bitcointalk.org/'
]

async function configure(worker,key) {
  await worker.evaluate(async key=>{
    await ensureSeeded()
    await CurbCutJevConfig.set(key)
    await chrome.storage.local.set({
      enabled:true,liveNamesEnabled:false,stuckEnabled:false,readerEnabled:false,
      patches:[],demoPatches:[],lastFeedAt:new Date().toISOString()
    })
    globalThis.liveRun=[]
    const name=nameVisibleTab
    nameVisibleTab=async(sender,token,once)=>{
      const job={token,startedAt:Date.now()}
      liveRun.push(job)
      job.outcome=await name(sender,token,once)
      job.finishedAt=Date.now()
      return job.outcome
    }
    const send=chrome.tabs.sendMessage.bind(chrome.tabs)
    chrome.tabs.sendMessage=async(tab,message,options)=>{
      const job=liveRun.find(row=>row.token===message.token)
      const response=await send(tab,message,options)
      if(job && message.type==='LIVE_NAMES_CAPTURE') job.targets=response?.targets
      if(job && message.type==='LIVE_NAMES_CONFIRM') job.confirmed=response?.indices
      if(job && message.type==='LIVE_NAMES_APPLY') job.decisions=message.results
      return response
    }
  },key)
}

export async function contentWorld(context,page) {
  const session=await context.newCDPSession(page)
  const worlds=new Map()
  session.on('Runtime.executionContextCreated',({context})=>worlds.set(context.id,context.name))
  session.on('Runtime.executionContextDestroyed',({executionContextId})=>worlds.delete(executionContextId))
  session.on('Runtime.executionContextsCleared',()=>worlds.clear())
  await session.send('Runtime.enable')
  return async (fn,arg)=>{
    const id=[...worlds].find(([,name])=>name==='Curb Cut')?.[0]
    if(id===undefined) return
    const {result,exceptionDetails}=await session.send('Runtime.evaluate',{
      contextId:id,expression:'('+fn.toString()+')('+JSON.stringify(arg??null)+')',returnByValue:true
    })
    if(exceptionDetails) throw new Error(result.description??exceptionDetails.text)
    return result.value
  }
}

const setting=(worker,key,value)=>worker.evaluate(([key,value])=>chrome.storage.local.set({[key]:value}),[key,value])
const reader='[data-curbcut-reader][open]'
const isControl=target=>target.role==='link' || target.role==='button'
const evidence=({role,selector,href,source,iconTitle,iconId,attributes,controlled,caption,heading,targetTitle,box})=>(
  {role,selector,href,source,iconTitle,iconId,attributes,controlled,caption,heading,targetTitle,box}
)

async function readingRows(inspect,selectors,scrollTop,focusSelector) {
  return inspect(({selectors,scrollTop,focusSelector})=>{
    const panel=document.querySelector('[data-curbcut-reader][open]')
    const rows=selectors.map(selector=>CurbCut.readerRow(document.querySelector(selector))?.row)
    const focused=rows[selectors.indexOf(focusSelector)]
    if(focused) focused.scrollIntoView({block:'center'})
    else if(scrollTop!==null) panel.scrollTop=scrollTop
    else rows.find(Boolean)?.scrollIntoView({block:'nearest'})
    const visible=rows.map(row=>{
      const rect=row?.getBoundingClientRect()
      return Boolean(rect && rect.top>=0 && rect.bottom<=innerHeight)
    })
    return {scrollTop:panel.scrollTop,rows:rows.map(row=>row?.textContent??null),visible}
  },{selectors,scrollTop,focusSelector})
}

async function liveJobs(worker,page,startedAt,canName) {
  const limit=canName?9000:1200
  while(Date.now()-startedAt<limit) {
    const jobs=await worker.evaluate(()=>liveRun)
    const last=jobs.at(-1)
    if(last?.finishedAt && Date.now()-last.finishedAt>=1450) return
    if(!last && Date.now()-startedAt>4000) return
    await page.waitForTimeout(250)
  }
}

async function measure(page,worker,inspect,url,folder,focusSelector) {
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:28000})
  if (!response?.ok()) throw new Error('Public page returned HTTP '+response?.status())
  await page.bringToFront()
  let baseline
  for(let attempt=0;attempt<12;attempt+=1) {
    baseline=await inspect(()=>({
      gate:CurbCutExt.canCapturePage(location.href,document),
      instantPrivacy:CurbCut.instantPrivacy(),
      ...CurbCut.collectNames()
    }))
    if(baseline?.targets.length) break
    await page.waitForTimeout(250)
  }
  assert(baseline,'Extension content script did not initialize')
  const selectors=baseline.targets.map(target=>target.selector)
  await mkdir(folder,{recursive:true})
  await setting(worker,'readerEnabled',true)
  await page.locator(reader).waitFor({timeout:5000})
  const before=await readingRows(inspect,selectors,null,focusSelector)
  await page.screenshot({path:path.join(folder,'before.png'),timeout:8000})
  await setting(worker,'readerEnabled',false)
  await page.locator(reader).waitFor({state:'detached',timeout:5000})
  const startedAt=Date.now()
  await worker.evaluate(async()=>{
    liveRun.length=0
    await chrome.storage.local.set({liveNamesEnabled:true})
  })
  await liveJobs(worker,page,startedAt,baseline.gate.ok && baseline.instantPrivacy)
  const {jobs,status}=await worker.evaluate(async()=>{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true})
    const status=await chrome.tabs.sendMessage(tab.id,{type:'LIVE_NAMES_STATUS'})
    return {jobs:liveRun,status}
  })
  const applied=await inspect(jobs=>jobs.flatMap(({targets,decisions,finishedAt})=>
    (decisions??[]).flatMap((decision,index)=>{
      if(decision?.name==null) return []
      const target=targets[index]
      const node=document.querySelector(target.selector)
      const attr=node?.matches('img')?'alt':'aria-label'
      if(node?.getAttribute(attr)!==decision.name) return []
      return [{target,attr,decision,finishedAt}]
    })),jobs)
  const statusNames=status.names.map(({name,confidence})=>JSON.stringify([name,confidence])).sort()
  const unique=[...new Map(applied.map(row=>[row.target.selector,row])).values()]
  assert.deepEqual(unique.map(({decision})=>JSON.stringify([decision.name,decision.confidence])).sort(),statusNames)
  const observed=new Map(baseline.targets.map(target=>[target.selector,target]))
  for(const {targets} of jobs) for(const target of targets??[]) observed.set(target.selector,target)
  const observedSelectors=[...observed.keys()]
  await setting(worker,'readerEnabled',true)
  await page.locator(reader).waitFor({timeout:5000})
  const after=await readingRows(inspect,observedSelectors,before.scrollTop,focusSelector)
  await page.screenshot({path:path.join(folder,'after.png'),timeout:8000})
  const names=unique.map(({target,attr,decision,finishedAt})=>({
    ...evidence(target),attr,name:decision.name,confidence:decision.confidence,choice:decision.choice,
    model:decision.model,providerMs:decision.providerMs,appliedAfterMs:finishedAt-startedAt,
    before:before.rows[selectors.indexOf(target.selector)]??null,
    after:after.rows[observedSelectors.indexOf(target.selector)],
    visibleInBefore:before.visible[selectors.indexOf(target.selector)]??false,
    visibleInAfter:after.visible[observedSelectors.indexOf(target.selector)]
  }))
  await worker.evaluate(()=>chrome.storage.local.set({liveNamesEnabled:false,readerEnabled:false}))
  await page.locator(reader).waitFor({state:'detached',timeout:5000})
  const remaining=await worker.evaluate(async()=>{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true})
    return chrome.tabs.sendMessage(tab.id,{type:'LIVE_NAMES_STATUS'})
  })
  assert.equal(remaining.names.length,0)
  return {
    url,finalUrl:response.url(),viewport:baseline.viewport,language:baseline.language,
    privacy:{...baseline.gate,instantPrivacy:baseline.instantPrivacy},
    candidates:[...observed.values()].map(evidence),
    screenshots:{
      before:path.relative(ROOT,path.join(folder,'before.png')),
      after:path.relative(ROOT,path.join(folder,'after.png')),
      beforeScrollTop:before.scrollTop,afterScrollTop:after.scrollTop
    },
    latencyMs:names.length?Math.min(...names.map(row=>row.appliedAfterMs)):null,
    attempts:jobs.map(({startedAt:begin,finishedAt,targets,confirmed,decisions,outcome})=>({
      startedAfterMs:begin-startedAt,durationMs:finishedAt?finishedAt-begin:null,
      targets:targets?.length??0,confirmed:confirmed?.length??0,
      providerErrors:[...new Set((decisions??[]).flatMap(row=>row?.error?[row.error]:[]))],
      appliedCount:outcome?.count??null,reason:outcome?.reason
    })),names
  }
}

export async function runLiveNaming({urls,viewport,folder,focusSelector}) {
  const key=await jevKey()
  assert(key,'Set CURBCUT_JEV_KEY_FILE to a file containing a Jev key')
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-jev-live-'))
  const extension=path.join(ROOT,'extension')
  const pages=[]
  let context
  try {
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport,deviceScaleFactor:1,
      args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']})
    const worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension:'))??
      await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension:')})
    await configure(worker,key)
    const page=context.pages()[0]
    const inspect=await contentWorld(context,page)
    for(const url of urls) {
      const hostname=new URL(url).hostname
      try {
        const directory=focusSelector?folder:path.join(folder,'live-naming-real-sites',hostname)
        const result=await measure(page,worker,inspect,url,directory,focusSelector)
        pages.push(result)
        console.log(hostname,result.candidates.length+' candidates',result.latencyMs+' ms',
          JSON.stringify(result.names.map(row=>[row.name,row.confidence])))
      } catch(error) {
        pages.push({url,error:error.message.split('\n')[0]})
        console.log(hostname,pages.at(-1).error)
        await worker.evaluate(()=>chrome.storage.local.set({liveNamesEnabled:false,readerEnabled:false}))
      }
    }
  } finally {
    await context?.close()
    await rm(profile,{recursive:true,force:true})
  }
  return {checkedAt:new Date().toISOString(),runner:'Playwright headless Chromium with installed Curb Cut extension',
    latencyDefinition:'Time from enabling live naming on the loaded page to the first completed application.',
    publicPages:true,decisionModel,liveNamingThreshold,pages}
}

export function summarizeLiveNaming(pages) {
  const candidates=rows=>rows.reduce((sum,page)=>sum+page.candidates.filter(isControl).length,0)
  const qualified=pages.filter(page=>page.candidates?.some(isControl))
  const eligible=qualified.filter(page=>page.privacy.ok && page.privacy.instantPrivacy)
  const named=pages.filter(page=>page.names?.length)
  const elapsed=named.map(page=>page.latencyMs).sort((first,second)=>first-second)
  const middle=Math.floor(elapsed.length/2)
  return {
    attemptedSites:pages.length,loadedSites:pages.filter(page=>!page.error).length,
    sitesWithUnnamedControls:qualified.length,privacyEligibleSites:eligible.length,sitesWithNames:named.length,
    unnamedControls:candidates(qualified),privacyEligibleControls:candidates(eligible),
    appliedNames:named.reduce((sum,page)=>sum+page.names.length,0),
    medianLatencyMs:elapsed.length?Math.round((elapsed[middle]+elapsed[Math.floor((elapsed.length-1)/2)])/2):null,
    p95LatencyMs:elapsed[Math.ceil(elapsed.length*.95)-1]??null
  }
}

export async function runLiveNamingE2e(requested=[]) {
  const urls=requested.length?requested:sites
  const folder=process.env.CURBCUT_JEV_PROOF_DIR??path.join(ROOT,'proof/jev')
  const result=await runLiveNaming({urls,viewport:{width:1366,height:900},folder})
  const summary=summarizeLiveNaming(result.pages)
  await saveJSON(path.join(folder,'live-naming-real-sites.json'),{...result,summary})
  assert(summary.sitesWithUnnamedControls>=(requested.length?1:10),'Too few public pages exposed unnamed controls')
  assert(summary.appliedNames>0,'The extension did not name any live controls')
}

if(process.argv[1]===fileURLToPath(import.meta.url)) await runLiveNamingE2e(process.argv.slice(2))
