import path from 'node:path'
import {tmpdir} from 'node:os'
import {readFile} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {acceptableURL,normalizeTask,taskNavigation,forbiddenJourneyAction} from '../core/task.mjs'
import {session} from '../core/chrome.mjs'
import {pageBlock} from '../core/access.mjs'
import {confirmBarrier} from '../core/probe.mjs'
import {candidatesFor,committedBlob,folder,inspectPage,samplePath,scoutPath,sha256} from './scout-v4.mjs'

const planFile=folder+'/followup-plan.json'
const output=folder+'/followup.json'
const seed='curbcut-v4-secondary-paths'
const primaryPrefix=900
const safetyPath=folder+'/safety-exclusions.json'
const absolute=file=>path.join(ROOT,file)
const order=value=>sha256(seed+'\n'+value)
const targetClasses=new Set([2,4,5,6])
const optional=async file=>readJSON(absolute(file)).catch(error=>{if(error.code!=='ENOENT') throw error;return null})

function targets(source) {
  return source.rows.filter(row=>row.url && ['no candidate','no barrier','inconclusive'].includes(row.status))
    .sort((a,b)=>order(a.site).localeCompare(order(b.site))).slice(0,500).map(({rank,site,url})=>({rank,site,url}))
}

async function plan() {
  if(await optional(planFile)) throw new Error('The follow-up is already registered.')
  const [sample,preregistered,safety]=await Promise.all([committedBlob(samplePath),readJSON(absolute(samplePath)),readJSON(absolute(safetyPath))])
  const journal=await readFile(absolute('.curbcut/v4/scouting-'+sample.blob+'.ndjson'),'utf8')
  const observed=new Map(journal.trim().split('\n').map(line=>{const row=JSON.parse(line);return [row.site,row]}))
  const excluded=new Set(safety.excluded.map(row=>row.site))
  const rows=preregistered.sites.slice(0,primaryPrefix).map(candidate=>{
    if(excluded.has(candidate.site)) return {...candidate,status:'excluded'}
    const row=observed.get(candidate.site)
    if(!row) throw new Error('Primary scouting has not completed the first '+primaryPrefix+' sample entries.')
    const {rank,site,url,status}=row
    return {rank,site,url,status}
  })
  await saveJSON(absolute(planFile),{createdAt:instant(),seed,sample,primaryPrefix,rows,sites:targets({rows})})
}

function publicSurfaces() {
  const choices=/\/(?:faq|faqs|frequently-asked-questions|help|support|products|shop|store|collections|catalog|browse)(?:\/|$)/i
  const links=[...document.querySelectorAll('main a[href],nav a[href],footer a[href],header a[href]')]
  return [...new Set(links.filter(link=>!link.hasAttribute('download') && link.checkVisibility({visibilityProperty:true}))
    .map(link=>link.href).filter(href=>choices.test(new URL(href).pathname)))].slice(0,25)
}

function advancedTrigger() {
  const valid=node=>node.checkVisibility({visibilityProperty:true}) && !node.closest('form,[aria-hidden=true],[inert]') && !node.querySelector('input')
  const label=node=>(node.getAttribute('aria-label')||node.textContent).replace(/\s+/g,' ').trim()
  const unique=node=>{
    if(node.id) {
      const selector='#'+CSS.escape(node.id)
      if(document.querySelectorAll(selector).length===1) return selector
    }
    let selector=node.localName
    for(let cursor=node;cursor && cursor!==document.body;cursor=cursor.parentElement) {
      const items=[...cursor.parentElement.children].filter(sibling=>sibling.localName===cursor.localName)
      const segment=cursor.localName+(items.length>1?':nth-of-type('+(items.indexOf(cursor)+1)+')':'')
      selector=cursor===node?segment:segment+' > '+selector
      if(selector.length<=280 && document.querySelectorAll(selector).length===1) return selector
    }
    return null
  }
  const buttons=[...document.querySelectorAll('button,[role=button],[role=combobox],summary,[class*=accordion i] div,[class*=faq i] div')]
    .filter(node=>valid(node) && !node.closest('a[href]'))
    .filter(node=>node.matches('button,summary,[role]') || getComputedStyle(node).cursor==='pointer' && !node.querySelector('button,[role=button],a[href]'))
  return buttons.flatMap(node=>{
    const text=label(node)
    if(!text || text.length>85) return []
    const kind=/^(?:cookie settings|privacy settings|privacy preferences|cookie preferences|show information|more information|view details)$/i.test(text) &&
      node.matches('[aria-haspopup=dialog],[data-toggle=modal],[data-bs-toggle=modal]')?4:
      /^(?:sort|sort by)(?:[:\s]+[-\w ,]+)?$/i.test(text)?5:
        /^(?:filters?|show filters|filter products|filter results|filter by)$/i.test(text)?6:
          node.closest('[class*=accordion i],[class*=faq i]') && (/[?？]$/.test(text) || /^(?:show more|read more|view answer)$/i.test(text))?2:0
    const selector=kind && unique(node)
    return selector?[{kind,selector,label:text,visible:true,tab:node.tabIndex,tag:node.localName}]:[]
  }).slice(0,2)
}

function advancedOutcome(trigger) {
  const visible=node=>Boolean(node?.checkVisibility({visibilityProperty:true}) && !node.closest('[aria-hidden=true],[inert]'))
  const label=node=>(node.getAttribute('aria-label')||node.innerText||node.textContent).replace(/\s+/g,' ').trim()
  function selector(node) {
    if(!node || node===document.body) return null
    if(node.id) {
      const id='#'+CSS.escape(node.id)
      if(document.querySelectorAll(id).length===1) return id
    }
    const peers=[...node.parentElement.children].filter(peer=>peer.localName===node.localName)
    const parent=selector(node.parentElement)
    const value=(parent?parent+' > ':'body > ')+node.localName+(peers.length>1?':nth-of-type('+(peers.indexOf(node)+1)+')':'')
    return value.length<=280 && document.querySelectorAll(value).length===1?value:null
  }
  const describe=node=>node?{selector:selector(node),visible:visible(node),label:label(node).slice(0,150),tab:node.tabIndex,tag:node.localName}:null
  const button=document.querySelector(trigger.selector)
  const referenced=button && document.getElementById(button.getAttribute('aria-controls'))
  const seen=globalThis[Symbol.for('curbcut.scout.followup')]
  function fresh(query) {
    return [...document.querySelectorAll(query)].filter(node=>visible(node) && !seen.has(node))
  }
  if(trigger.kind===4) {
    const dialog=visible(referenced) && !seen.has(referenced)?referenced:
      fresh('dialog,[role=dialog],[aria-modal=true],[class~=modal]')[0]
    const close=dialog && [...dialog.querySelectorAll('button,[role=button]')].filter(visible).find(node=>
      /^(?:close|dismiss|cancel|cerrar|fermer|schließen|×|✕|✖)(?:\s+[-\w ]{1,38})?$/i.test(label(node)))
    if(close && selector(close) && selector(dialog)) return {kind:4,trigger,panel:describe(dialog),close:describe(close)}
  } else if(trigger.kind===5) {
    const list=visible(referenced) && !seen.has(referenced)?referenced:fresh('[role=listbox],[role=menu]')[0]
    const options=list && [...list.querySelectorAll('[role=option],[role=menuitem],button[data-value]')].filter(visible)
    const first=options?.[0]
    if(options?.length>1 && first && selector(list)) {
      const entries=options.slice(0,8).map(describe).filter(entry=>entry.selector && entry.label)
      const role=first.getAttribute('role')
      const group=role?'[role='+CSS.escape(role)+']':first.localName
      if(entries.length>1 && /\b(?:price|latest|newest|name|alphabetical|popular|relevance|recommended|featured)\b/i.test(entries[1].label)) {
        return {kind:5,trigger,panel:describe(list),options:entries,group}
      }
    }
  } else if(trigger.kind===2) {
    const paragraph=fresh('p').find(node=>label(node).length>=32 && button.parentElement.parentElement.contains(node))
    const panel=referenced??paragraph?.parentElement
    if(paragraph && selector(paragraph) && selector(panel)) return {kind:2,trigger,panel:describe(panel),answer:describe(paragraph)}
  } else {
    const freshChecks=fresh('input:is([type=checkbox],[type=radio])')
    const filter=freshChecks.find(node=>!node.checked && [...node.labels??[]].some(visible))
    const option=[...filter?.labels??[]].find(visible)
    const panel=referenced??filter?.closest('[role=dialog],fieldset,section,aside')??filter?.parentElement
    if(filter && option && selector(filter) && selector(option) && selector(panel)) {
      return {kind:6,trigger,panel:describe(panel),input:selector(filter),option:describe(option)}
    }
  }
  return null
}

async function detect(row) {
  const base=new URL(row.url)
  const task=await normalizeTask({url:row.url,persona:'keyboard-only',task:'Inspect the public page for read-only controls.'})
  let browser
  try {
    browser=await session(task,'control',null,tmpdir(),{local:true,gate:true,discovery:true})
    const page=browser.page
    const initial=await page.evaluate(inspectPage)
    if(initial.excluded) return {checks:[],reason:initial.excluded}
    const links=(await page.evaluate(publicSurfaces)).filter(href=>{
      const url=new URL(href)
      return acceptableURL(url) && taskNavigation(base,url) && url.pathname!==base.pathname && !url.search
    }).sort((a,b)=>order(a).localeCompare(order(b)))
    for(const surface of [null,links[0]].filter((entry,index)=>entry || !index)) {
      if(surface) {
        await delay(800)
        await page.goto(surface,{waitUntil:'domcontentloaded',timeout:8500})
        if(await pageBlock(page,browser.responses.get(page))) return {checks:[],reason:'The public route was blocked.'}
      }
      const discovery=surface?await page.evaluate(inspectPage):initial
      if(discovery.excluded) return {checks:[],reason:discovery.excluded}
      const fromStatic=surface?candidatesFor(row.site,page.url(),discovery).filter(task=>targetClasses.has(task.barrierClass)):[]
      if(fromStatic.length) return {candidates:fromStatic.slice(0,2)}
      const trigger=(await page.evaluate(advancedTrigger)).find(candidate=>!forbiddenJourneyAction(candidate.label))
      if(!trigger) continue
      const address=page.url()
      await page.evaluate(()=>{
        globalThis[Symbol.for('curbcut.scout.followup')]=new WeakSet([...document.querySelectorAll('body *')].filter(node=>node.checkVisibility({visibilityProperty:true})))
      })
      await page.locator(trigger.selector).click({timeout:1500})
      await delay(400)
      if(page.url()!==address || await pageBlock(page,browser.responses.get(page))) continue
      const widget=await page.evaluate(advancedOutcome,trigger)
      if(widget) return {candidates:candidatesFor(row.site,address,{hard:[widget],fields:[],passages:[]})}
    }
    return {checks:[],reason:'No public secondary journey matched the declared controls.'}
  } finally {await browser?.abort()}
}

async function followup() {
  if(await optional(output)) throw new Error('The follow-up already finished.')
  const [plan,preregistration,sample]=await Promise.all([readJSON(absolute(planFile)),committedBlob(planFile),committedBlob(samplePath)])
  if(plan.seed!==seed || plan.sample.blob!==sample.blob || plan.primaryPrefix!==primaryPrefix ||
    JSON.stringify(targets(plan))!==JSON.stringify(plan.sites)) {
    throw new Error('The follow-up sample differs from its committed source.')
  }
  const queue=[...plan.sites]
  const data=new Map()
  async function worker(index) {
    if(index) while(queue.length && !await optional(scoutPath)) await delay(1500)
    while(queue.length) {
      const candidate=queue.shift()
      const file='.curbcut/v4-followup/'+candidate.site+'.json'
      const checkpoint=await optional(file)
      if(checkpoint && checkpoint.preregistration===preregistration.blob) {
        data.set(candidate.site,checkpoint)
        continue
      }
      const row={...candidate,preregistration:preregistration.blob,checks:[]}
      try {
        const detection=await detect(candidate)
        row.reason=detection.reason
        for(const definition of detection.candidates??[]) {
          const task=await normalizeTask(definition)
          const result=await confirmBarrier(task)
          const compact=lane=>lane?{...lane,snapshot:undefined}:lane
          row.checks.push({task,result:{...result,persona:compact(result.persona),control:compact(result.control)}})
          if(result.status==='confirmed' || result.status==='blocked') break
        }
      } catch(error) {row.reason=error.message.split('\n')[0]}
      await saveJSON(absolute(file),row)
      data.set(candidate.site,row)
      console.log(data.size+'/'+plan.sites.length,candidate.site,row.checks.find(item=>item.result.status==='confirmed')?.task.barrierClass??row.reason??'unconfirmed')
      await delay(950)
    }
  }
  await Promise.all(Array.from({length:3},(_,index)=>worker(index)))
  const rows=plan.sites.map(site=>data.get(site.site))
  await saveJSON(absolute(output),{runner:'playwright',preregistration,sample,finishedAt:instant(),rows})
}
const mode=process.argv[2]
if(mode==='plan') await plan()
else if(mode==='run') await followup()
else throw new Error('Usage: node scripts/scout-followup-v4.mjs plan | run')
