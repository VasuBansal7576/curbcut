import {chromium} from 'playwright'
import {createHash} from 'node:crypto'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {observeCoverage} from '../core/coverage.mjs'
import {BlockedPage,pageBlock} from '../core/access.mjs'
import {guardRequests} from '../core/chrome.mjs'
import {wwwTwin} from '../core/engine.js'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {journeyLane,replayInstalledProbe} from '../core/probe.mjs'
import {acceptableURL,allowedHost,normalizeTask,siteKey,taskDestination} from '../core/task.mjs'

if(process.argv[2]==='--jev') {
  const {runLiveNamingE2e}=await import('./jev-live-extension-e2e.mjs')
  await runLiveNamingE2e(process.argv.slice(3))
  await import('./jev-stuck-extension-e2e.mjs')
  process.exit(0)
}

const extension=path.join(ROOT,'extension')
const runtime=await readFile(path.join(extension,'runtime.js'),'utf8')
const bundleBytes=await readFile(path.join(extension,'bundled.json'))
const bundled=JSON.parse(bundleBytes)
const output=path.join(ROOT,'proof/reliability/extension-e2e.json')
const v6Only=process.argv[2]==='--v6'
const requested=new Set(v6Only?process.argv.slice(3):process.argv.slice(2))
const patches=requested.size?bundled.filter(patch=>requested.has(patch.id)):v6Only?bundled.filter(patch=>patch.evaluation):bundled
if(!patches.length || requested.size && patches.length!==requested.size) throw new Error('A requested audit patch is absent from the bundle.')
const sample=await readJSON(path.join(ROOT,'proof/heldout-v5/kane-sample-20/summary.json')).catch(error=>{
  if(error.code==='ENOENT') return null
  throw error
})
const sampleRepairs=new Set(sample?.cases.filter(row=>row.kaneVerified).map(row=>row.id))

const pause=()=>delay(900)
const ask=(popup,message)=>popup.evaluate(message=>chrome.runtime.sendMessage(message),message)

async function queryActive(popup,url) {
  return popup.evaluate(async url=>{
    const tabs=await chrome.tabs.query({})
    const matches=tabs.filter(tab=>tab.url===url)
    if(matches.length!==1) return {ok:false,reason:'task-tab-is-not-unique'}
    return chrome.runtime.sendMessage({type:'QUERY_ACTIVE',capturedTabId:matches[0].id,includeMatches:true})
  },url)
}

async function probeTwin(address) {
  let url=new URL(address)
  try {
    if(!acceptableURL(url) || !await allowedHost(url.hostname)) return {status:'unavailable',reason:'The twin is outside the public HTTPS scope.'}
  } catch(error) {
    return {status:'unavailable',reason:error.code??error.message}
  }
  const origin=url.origin
  const redirects=new Set([url.href])
  try {
    for(let attempt=0;attempt<5;attempt++) {
      const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000)})
      await response.body?.cancel()
      const httpStatus=response.status,location=response.headers.get('location')
      if(response.ok) return {status:'serving',httpStatus,landed:url.href}
      if(![301,302,303,307,308].includes(httpStatus) || !location) return {status:'http-status',httpStatus,landed:url.href,reason:'HTTP '+httpStatus}
      const next=new URL(location,url)
      if(next.hostname!==url.hostname) return {status:'cross-host-redirect',httpStatus,location:next.href,reason:'Redirects to '+next.hostname+'.'}
      if(next.origin!==origin || !acceptableURL(next)) return {status:'out-of-scope-redirect',httpStatus,location:next.href,reason:'Redirect leaves the public HTTPS origin.'}
      if(redirects.has(next.href)) return {status:'probe-error',reason:'Same-host redirect loop.'}
      redirects.add(next.href)
      url=next
      await pause()
    }
    return {status:'probe-error',reason:'Too many same-host redirects.'}
  } catch(error) {
    return {status:'probe-error',reason:error.cause?.code??error.message}
  }
}

async function audit(patch,url,{twin=false}={}) {
  const row={id:patch.id,url,persona:patch.persona,journey:Boolean(patch.journey)}
  let context,profile
  try {
    const task=await normalizeTask({...patch,url})
    if(patch.id==='v5-c22b9bdca86b-71a63d77') {
      const {selector}=task.journey.at(-1)
      task.journey.push({selector,action:'focus'})
      task.outcomeChecks.push({selector,kind:'text',equals:'Match taxa'},{selector,kind:'focused'})
    }
    const replayProbe=Boolean(task.probe && sampleRepairs.has(task.id))
    const coverage=Boolean(task.evaluation)
    const replay=Boolean(task.journey) || replayProbe || coverage
    if(replayProbe) row.probeAction=task.probe.action
    profile=await mkdtemp(path.join(tmpdir(),'curbcut-extension-'))
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,acceptDownloads:false,
      viewport:{width:task.persona==='low-vision'?320:1280,height:800},
      args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']})
    await guardRequests(context,task,{extension:true})
    const worker=context.serviceWorkers().find(worker=>worker.url().startsWith('chrome-extension:'))??
      await context.waitForEvent('serviceworker',{predicate:worker=>worker.url().startsWith('chrome-extension:'),timeout:8000})
    if(coverage) await context.addInitScript({content:runtime})
    else if(replay) {
      const settings=JSON.stringify({persona:task.persona,site:siteKey(new URL(task.url))})
      await context.addInitScript({content:runtime+'\n;('+function({persona,site}) {
        if(location.protocol==='https:' && (location.hostname===site || location.hostname.endsWith('.'+site))) CurbCut.enforce(persona)
      }.toString()+')('+settings+')'})
    }
    const popup=await context.newPage()
    await popup.goto(new URL('popup.html',worker.url()).href)
    const feed=await ask(popup,{type:'REFRESH_FEEDS'})
    if(!feed.ok || !feed.state.patches.some(candidate=>candidate.id===patch.id)) throw new Error('The extension did not load the bundled patch.')
    const responses=new Map()
    context.on('response',response=>{
      const request=response.request()
      try {
        const frame=request.frame()
        if(request.isNavigationRequest() && frame===frame.page().mainFrame()) responses.set(frame.page(),response)
      } catch {}
    })

    async function lane(enabled) {
      const toggle=await ask(popup,{type:'SET_ENABLED',enabled})
      if(!toggle.ok || toggle.state.enabled!==enabled) throw new Error('The extension switch did not change state.')
      const page=await context.newPage()
      try {
        let response
        try {response=await page.goto(task.url,{waitUntil:'domcontentloaded',timeout:25000})}
        catch(error) {throw new BlockedPage(error.message.split('\n')[0])}
        if(twin) {
          const host=new URL(task.url).hostname
          if(new URL(page.url()).hostname!==host) throw new BlockedPage('Browser navigation left the twin host: '+page.url())
          for(let request=response?.request();request;request=request.redirectedFrom()) {
            if(new URL(request.url()).hostname!==host) throw new BlockedPage('Browser navigation crossed hosts: '+request.url())
          }
          if(!response?.ok()) throw new BlockedPage('Twin browser navigation returned HTTP '+(response?.status()??'unknown')+'.')
        }
        const blocked=await pageBlock(page,response)
        if(blocked) throw new BlockedPage(blocked)
        if(!taskDestination(task,new URL(page.url()))) throw new BlockedPage('Public navigation left the registered site.')
        await page.bringToFront()
        const selectorMatches=new Map(),matchedRules=new Set()
        let active=false,queryWorked=false
        async function observe(target) {
          const query=await queryActive(popup,target.url())
          const current=query.active?.find(candidate=>candidate.id===patch.id)
          queryWorked ||= query.ok===true
          active ||= Boolean(current)
          for(const index of current?.matchedRules??[]) matchedRules.add(index)
          for(const match of current?.selectorMatches??[]) {
            const key=match.index+'.'+match.field
            const previous=selectorMatches.get(key)
            if(!previous || (!match.issue && previous.issue) || match.count>previous.count) selectorMatches.set(key,match)
          }
        }
        const selectorsConfirmed=()=>active && matchedRules.size===patch.rules.length && selectorMatches.size>0 && [...selectorMatches.values()].every(match=>!match.issue)
        const deadline=Date.now()+(task.journey?4000:8000)
        do {
          await observe(page)
          if(queryWorked && ((!enabled && !active) || (enabled && (selectorsConfirmed() || task.journey && active)))) break
          await delay(200)
        } while(Date.now()<deadline)
        if(!queryWorked) throw new Error('The popup could not query the live extension page.')
        let journey,probe
        if(replay && (enabled?active:!active)) {
          const browser={page,context,responses,async activePage(expected){
            const pages=context.pages().filter(candidate=>taskDestination(task,new URL(candidate.url())))
            return pages.find(candidate=>candidate.url()===expected)??pages.at(-1)
          }}
          if(coverage) probe=await observeCoverage(page,task,{enabled})
          else if(task.journey) journey=await journeyLane(browser,task,task.persona,{onDOM:enabled?observe:undefined})
          else {
            probe=await replayInstalledProbe(browser,task)
            delete probe.snapshot
          }
        }
        return {enabled,active,landed:page.url(),httpStatus:response?.status(),matchedRules:[...matchedRules].sort((a,b)=>a-b),
          selectorsConfirmed:selectorsConfirmed(),selectorMatches:[...selectorMatches.values()],journey,probe}
      } finally {
        await Promise.all(context.pages().filter(candidate=>candidate!==popup).map(async candidate=>{
          await candidate.close()
          responses.delete(candidate)
        }))
      }
    }

    if(replay) {
      row.off=await lane(false)
      await pause()
    }
    row.on=await lane(true)
    if(!row.on.active) return {...row,status:'inactive',reason:'The popup did not report the bundled patch on its task page.'}
    if(!row.on.selectorsConfirmed) return {...row,status:twin?'twin not covered':'selector-miss',reason:'One or more rules or selector fields did not match in the installed extension.'}
    if(row.off?.active) return {...row,status:'inconclusive',reason:'The popup reported the patch while the extension switch was off.'}
    const off=row.off?.journey??row.off?.probe,on=row.on.journey??row.on.probe
    if(off?.status==='pass') return {...row,status:'already-accessible',reason:'The registered task passed with the extension switched off.'}
    if(on?.status==='fail') return {...row,status:task.journey?'journey-fail':'probe-fail',reason:on.reason}
    if(replay && (off?.status!=='fail' || on?.status!=='pass')) {
      return {...row,status:'inconclusive',reason:off?.status!=='fail'?off?.reason??'The off lane was not measured.':on?.reason??'The on lane was not measured.'}
    }
    return {...row,status:'pass'}
  } catch(error) {
    return {...row,status:error instanceof BlockedPage?'blocked':'inconclusive',reason:error.message.split('\n')[0]}
  } finally {
    try {await context?.close()}
    finally {if(profile) await rm(profile,{recursive:true,force:true})}
  }
}

async function auditTwin(patch,address) {
  const url=new URL(address)
  const host=wwwTwin(url.hostname)
  if(!host) return {id:patch.id,status:'no-twin'}
  url.hostname=host
  const probe=await probeTwin(url.href)
  if(probe.status!=='serving') return {id:patch.id,url:url.href,status:probe.status,probe}
  await pause()
  return {...await audit(patch,url.href,{twin:true}),probe}
}

const results=[],twinResults=[]
let audited=0
async function check(patch,index) {
  const url=patch.url??patch.match.replace(/\*$/,'')
  const row=await audit(patch,url)
  results[index]=row
  console.error(++audited+'/'+patches.length,patch.id,row.status,row.reason??'')
  await pause()
  if(v6Only) return
  const twin=await auditTwin(patch,url)
  twinResults.push(twin)
  console.error('  www twin',twin.status,twin.reason??twin.probe?.reason??'')
  if(audited<patches.length) await pause()
}

if(v6Only) {
  const queue=Object.values(Object.groupBy(patches.map((patch,index)=>({patch,index})),({patch})=>siteKey(new URL(patch.match))))
  async function worker() {
    while(queue.length) {
      const rows=queue.shift()
      for(const {patch,index} of rows) await check(patch,index)
    }
  }
  await Promise.all([worker(),worker()])
} else {
  for(const [index,patch] of patches.entries()) await check(patch,index)
}
const countStatuses=rows=>Object.fromEntries(Object.entries(Object.groupBy(rows,row=>row.status)).map(([status,group])=>[status,group.length]))
const counts=countStatuses(results),twinCounts=countStatuses(twinResults)
const journeys=results.filter(row=>row.journey)
const probes=results.filter(row=>row.probeAction)
const summary={runner:'playwright-extension',checkedAt:instant(),bundleSha256:createHash('sha256').update(bundleBytes).digest('hex'),
  total:results.length,passed:counts.pass??0,counts,journeys:{total:journeys.length,passed:journeys.filter(row=>row.status==='pass').length},results,
  probes:{total:probes.length,passed:probes.filter(row=>row.status==='pass').length},
  twins:{total:twinResults.length,serving:twinResults.filter(row=>row.probe?.status==='serving').length,passed:twinCounts.pass??0,counts:twinCounts,results:twinResults}}
if(v6Only) {
  await saveJSON(path.join(ROOT,'proof/heldout-v6/extension-e2e.json'),summary)
  console.log(summary.passed+'/'+summary.total+' v6 fixes passed in the installed extension.')
  if(summary.passed!==summary.total) process.exitCode=1
} else if(requested.size) console.log(JSON.stringify(summary,null,2))
else {
  await saveJSON(output,summary)
  console.log(summary.passed+'/'+summary.total+' bundled fixes passed the extension audit.')
  console.log(summary.twins.passed+'/'+summary.twins.serving+' serving www twins passed the extension audit.')
}
