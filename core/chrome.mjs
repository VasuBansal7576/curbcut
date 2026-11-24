import {chromium} from 'playwright'
import {randomUUID} from 'node:crypto'
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {ROOT,command} from './io.mjs'
import {acceptableURL,allowedHost,fixtureURL,localAppURL,journeyPaths,siteKey,taskDestination,taskNavigation} from './task.mjs'
import {BlockedPage,pageBlock} from './access.mjs'
import {lockViewport} from './viewport.mjs'
import {match} from './engine.js'

const runtime=()=>readFile(path.join(ROOT,'extension/runtime.js'),'utf8')

export async function guardRequests(context,task,{discovery=false,extension=false,instantBridge=false}={}) {
  const base=new URL(task.url),hosts=new Map()
  await context.route('**/*',async route=>{
    try {
      const request=route.request(),url=new URL(request.url())
      if(extension && instantBridge && url.origin==='http://127.0.0.1:4317' &&
        ['/instant/decide','/instant/queue'].includes(url.pathname) && ['OPTIONS','POST'].includes(request.method()) &&
        request.serviceWorker()?.url().startsWith('chrome-extension://')) return await route.continue()
      if(!['GET','HEAD'].includes(request.method())) return await route.abort()
      if(extension && url.protocol==='chrome-extension:') return await route.continue()
      if(discovery && ['image','media','font'].includes(request.resourceType())) return await route.abort()
      if(!acceptableURL(url)) return await route.abort()
      if(fixtureURL(base) && !fixtureURL(url)) return await route.abort()
      if(localAppURL(base) && !fixtureURL(base) && url.origin!==base.origin && !localAppURL(url)) return await route.abort()
      if(request.isNavigationRequest()) {
        let nested=false
        try {nested=Boolean(request.frame().parentFrame())} catch {}
        if(!nested && !taskDestination(task,url)) return await route.abort()
      }
      if(!fixtureURL(url) && !localAppURL(url)) {
        if(!hosts.has(url.hostname)) hosts.set(url.hostname,allowedHost(url.hostname).catch(()=>false))
        if(!await hosts.get(url.hostname)) return await route.abort()
      }
      return await route.continue()
    } catch {await route.abort().catch(()=>{})}
  })
  await context.routeWebSocket('**/*',socket=>socket.close())
}

export async function session(task,persona,patch,output,{local=false,gate=false,discovery=false,navigationTimeout}={}) {
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-chrome-'))
  await mkdir(output,{recursive:true})
  const width=persona==='low-vision'?320:1280
  const base=new URL(task.url)
  const observations=new Map(), responses=new Map()
  const token=randomUUID()
  let context,viewport
  async function abort() {
    viewport?.close()
    await context?.close().catch(()=>{})
    await rm(profile,{recursive:true,force:true})
  }
  try {
    context=await chromium.launchPersistentContext(profile,{
      executablePath:process.env.CURBCUT_CHROME || (persona==='low-vision'?undefined:chromium.executablePath()),
      headless:true,viewport:{width,height:800},...(local?{}:{recordVideo:{dir:profile,size:{width,height:800}}}),
      serviceWorkers:'block',acceptDownloads:false,
      args:['--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--disable-background-networking',`--window-size=${width},800`]
    })
    function track(page) {
      if(observations.has(page)) return
      const evidence={opener:page.opener().catch(()=>null),events:[]}
      observations.set(page,evidence)
      page.on('response',response=>{
        const request=response.request()
        try {if(request.isNavigationRequest() && request.frame()===page.mainFrame()) responses.set(page,response)} catch {}
      })
    }
    context.on('page',track)
    for(const page of context.pages()) track(page)
    await guardRequests(context,task,{discovery})
    await context.exposeBinding('__curbcutObserve',({page,frame},secret,event)=>{
      if(secret!==token) return
      track(page)
      const events=observations.get(page).events
      if(events.length<4000) events.push({...event,top:frame===page.mainFrame()})
    })
    const args=JSON.stringify({task,persona,patch,token,site:siteKey(base),fixture:fixtureURL(base),localApp:localAppURL(base),paths:journeyPaths(task)})
    const init='('+function({task,persona,patch,token,site,fixture,localApp,paths}){
      const topLevel=window===window.top
      const host=location.hostname
      if(fixture || localApp) {if(location.origin!==new URL(task.url).origin) return}
      else if(location.protocol!=='https:' || topLevel && host!==site && !host.endsWith('.'+site)) return
      const send=globalThis.__curbcutObserve
      const documentId=crypto.randomUUID()
      const journeySelectors=[...new Set(task.journey?.flatMap(step=>[step.selector,step.pointer?.selector].filter(Boolean))??[])]
      const report=(type,target,details={})=> {
        let targetMatches=false
        try {targetMatches=Boolean(target && task.observedSelector && (target.matches(task.observedSelector) || Boolean(target.closest(task.observedSelector))))} catch {}
        const stepTargets=journeySelectors.filter(selector=>{
          try {return Boolean(target?.closest?.(selector))} catch {return false}
        })
        const stepGeometry=persona==='low-vision' && ['pointer-click','pointer-hover'].includes(type) && stepTargets.length?
          Object.fromEntries(stepTargets.map(selector=>[selector,CurbCut.widthEvidence(target.closest(selector)).fits])):undefined
        send(token,{type,documentId,url:location.origin+location.pathname,targetMatches,stepTargets,stepGeometry,...details}).catch(()=>{})
      }
      const state=CurbCut.enforce(persona,report,{topLevel})
      state.documentId=documentId
      if(topLevel && ['link','button','img'].includes(task.evaluation?.role)) {
        state.coverageSelector=task.observedSelector
        window.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation()},true)
        window.addEventListener('click',event=>{
          const node=event.composedPath()[0]
          if(node.closest?.('[data-curbcut-reader]')) return
          if(event.isTrusted) report('coverage-pointer',node)
          event.preventDefault()
          event.stopImmediatePropagation()
        },true)
      }
      report('document')
      const quote=task.probe?.action==='read' && task.outcomeChecks?.find(check=>check.kind==='contains' && check.selector===task.observedSelector)?.equals
      if(topLevel && quote) CurbCut.observePassage(task.observedSelector,quote,report)
      if(topLevel && task.probe && !fixture) {
        window.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation()},true)
      }
      if(topLevel && task.journey) {
        if(!fixture) {
          window.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation()},true)
          const safeClicks=new Set(journeySelectors)
          const allowedPaths=new Set(paths)
          window.addEventListener('click',event=>{
            const node=event.composedPath()[0]
            if(node.closest?.('[data-curbcut-reader]')) return
            const link=node.closest?.('a[href]')
            if(link) {
              const destination=new URL(link.href,location.href)
              const allowedHost=destination.hostname===site || destination.hostname.endsWith('.'+site)
              const localOk=localApp && destination.origin===location.origin
              const remoteBlocked=localOk?false:destination.protocol!=='https:' || !allowedHost
              if(remoteBlocked || (allowedPaths.size && !allowedPaths.has(destination.pathname))) {
                report('navigation-suppressed',node)
                event.preventDefault()
                event.stopImmediatePropagation()
                return
              }
            }
            if(!event.isTrusted || [...safeClicks].some(selector=>node.closest?.(selector))) return
            event.preventDefault()
            event.stopImmediatePropagation()
          },true)
        }
        const checkpoints=task.journey.flatMap((step,index)=>step.checks?[{index,checks:step.checks}]:[])
        const previous=new Map()
        const evaluateCheck=({selector,kind,equals})=>{
          if(kind==='url-path') return location.pathname===equals
          const nodes=document.querySelectorAll(selector)
          if(kind==='hidden' && !nodes.length) return true
          if(nodes.length!==1) return false
          const [node]=nodes
          const visible=node.checkVisibility({visibilityProperty:true})
          if(kind==='hidden') return !visible
          if(kind==='selected') return node.matches(':checked,[aria-selected=true],[aria-checked=true]')
          if(!visible) return false
          if(kind==='visible') return true
          if(kind==='expanded') return node.getAttribute('aria-expanded')==='true'
          if(kind==='focused') return node.matches(':focus')
          if(kind==='fits-width') return CurbCut.widthEvidence(node).fits
          if(kind==='value') return node.value===equals
          if(kind==='text') return node.textContent.trim()===equals
          if(kind==='contains') return node.textContent.replace(/\s+/g,' ').trim().includes(equals)
          return false
        }
        if(checkpoints.length) {
          const evaluate=()=>{
            for(const {index,checks} of checkpoints) {
              const state=checks.every(evaluateCheck)
              if(state && previous.get(index)!==true) report('journey-checkpoint',null,{index})
              previous.set(index,state)
            }
          }
          new MutationObserver(evaluate).observe(document,{childList:true,subtree:true,attributes:true,characterData:true})
          window.addEventListener('focusin',evaluate,true)
          evaluate()
        }
      }
      if(!patch) return
      let release
      function syncPatch() {
        const active=CurbCut.match(patch,location.href)
        if(active && !release) {
          state.matchedRules=[]
          state.patchId=patch.id
          release=CurbCut.apply(patch,index=>{
            if(state.matchedRules.includes(index)) return
            state.matchedRules.push(index)
            report('rule',null,{index,patchId:patch.id})
          })
        } else if(!active && release) {
          release()
          release=null
          delete state.patchId
          delete state.matchedRules
        }
      }
      for(const method of ['pushState','replaceState']) {
        const original=history[method]
        history[method]=function(...values) {
          const result=original.apply(this,values)
          syncPatch()
          return result
        }
      }
      window.addEventListener('popstate',syncPatch,true)
      syncPatch()
    }.toString()+')('+args+')'
    await context.addInitScript({content:await runtime()+'\n;'+init})
    const page=context.pages()[0] ?? await context.newPage()
    const [port]=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')
    const endpoint='http://127.0.0.1:'+port
    if(!local && persona==='low-vision') viewport=await lockViewport(endpoint,width,800)
    let response
    try {response=await page.goto(task.url,{waitUntil:'domcontentloaded',timeout:navigationTimeout??(discovery?8500:local?15000:30000)})}
    catch(error) {throw new BlockedPage(error.message.split('\n')[0])}
    if(gate) {
      const blocked=await pageBlock(page,response)
      if(blocked) throw new BlockedPage(blocked)
    }
    if(!taskNavigation(base,new URL(page.url()))) throw new BlockedPage('Public navigation left the task site.')
    if(task.observedSelector) await page.evaluate(selector=>{document.querySelector(selector)},task.observedSelector)
    if(!await page.evaluate(({persona,patchId})=>globalThis.__curbcutState?.persona===persona && (globalThis.__curbcutState.patchId??null)===patchId,
      {persona,patchId:patch && match(patch,page.url())?patch.id:null})) throw new Error('Harness or patch did not attach on '+page.url())
    return {page,context,endpoint:viewport?.endpoint??endpoint,abort,
      async activePage(expectedURL) {
        const pages=context.pages()
        if(pages.length===1) return pages[0]
        if(expectedURL) {
          const matches=pages.filter(candidate=>candidate.url()===expectedURL)
          if(matches.length===1) return matches[0]
        }
        const focus=await Promise.all(pages.map(candidate=>candidate.evaluate(()=>document.hasFocus() && document.visibilityState==='visible').catch(()=>false)))
        const focused=pages.filter((_,index)=>focus[index])
        return focused.length===1?focused[0]:null
      },
      async lineage(selected) {
        const chain=[]
        for(let current=selected;current && !chain.includes(current);current=await observations.get(current)?.opener) chain.unshift(current)
        return chain
      },
      observations,responses,
      async finish(videoFile,chain=[page]) {
        try {
          const videos=chain.map(candidate=>candidate.video())
          await context.close()
          const inputs=await Promise.all(videos.map(video=>video.path()))
          const list=path.join(profile,'recordings.txt')
          await writeFile(list,inputs.map(file=>"file '"+file.replaceAll("'","'\\''")+"'").join('\n')+'\n')
          const result=await command('ffmpeg',['-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-an','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',videoFile])
          if(result.code!==0) throw new Error('Video conversion failed: '+result.stderr)
        } finally {await abort()}
      }
    }
  } catch(error) {await abort();throw error}
}
