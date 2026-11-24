import {setTimeout as delay} from 'node:timers/promises'
import {tmpdir} from 'node:os'
import {session} from './chrome.mjs'
import {BlockedPage,pageBlock} from './access.mjs'
import {fixtureURL,forbiddenJourneyAction,managedKeyboardSelector,normalizeTask,taskDestination,taskNavigation} from './task.mjs'

import {widthEvidence} from './geometry.js'

export function passageQuote(task) {
  return task.probe?.action==='read'?task.outcomeChecks?.find(check=>check.kind==='contains' && check.selector===task.observedSelector)?.equals:null
}

function targetLocator(page,task,selector) {
  const matches=page.locator(selector)
  const quote=selector===task.observedSelector && passageQuote(task)
  return quote?matches.filter({hasText:quote}):task.probe || task.journey?matches:matches.first()
}

export async function outcomeChecks(page,task,persona,checks=task.outcomeChecks) {
  if(!page || !checks) return []
  return Promise.all(checks.filter(check=>persona!=='control' || check.kind!=='fits-width' || task.probe).map(async({selector,kind,equals})=>{
    try {
      if(kind==='url-path') return new URL(page.url()).pathname===equals
      const control=targetLocator(page,task,selector)
      const options={timeout:800}
      if(kind==='hidden') return await control.count()<=1 && !await control.isVisible()
      if(kind==='selected') return await control.evaluate(element=>element.matches(':checked,[aria-selected=true],[aria-checked=true]'),undefined,options)
      if(!await control.isVisible()) return false
      if(kind==='focused') return await control.evaluate(element=>element.matches(':focus'),undefined,options)
      if(kind==='visible') return true
      if(kind==='expanded') return await control.getAttribute('aria-expanded',options)==='true'
      if(kind==='fits-width') return (await control.evaluate(widthEvidence,{text:task.probe?.action==='read'},options)).fits
      const value=await (kind==='value'?control.inputValue(options):control.textContent(options))
      if(kind==='contains') return value?.replace(/\s+/g,' ').trim().includes(equals)??false
      return value?.trim()===equals
    } catch {return false}
  }))
}

async function keyboardReach(page,target,selector) {
  const startingPoint=await target.evaluate(element=>element.matches(':focus'),undefined,{timeout:1000})
  if(startingPoint) await page.keyboard.press('Shift+Tab')
  await page.evaluate(()=>{globalThis[Symbol.for('curbcut.scout.focus')]=new WeakSet()})
  let emptySteps=0
  for(let step=1;step<=200;step++){
    await page.keyboard.press('Tab')
    const state=await page.evaluate(selector=>{
      let focused=document.activeElement
      while(focused?.shadowRoot?.activeElement) focused=focused.shadowRoot.activeElement
      const key=Symbol.for('curbcut.scout.focus')
      const visited=globalThis[key]??=new WeakSet()
      const repeated=visited.has(focused)
      const empty=!focused || focused===document.body || focused===document.documentElement
      if(!empty) visited.add(focused)
      return {target:focused?.matches(selector),repeated,empty}
    },selector)
    if(state.target) return {reached:true,tabs:step}
    emptySteps=state.empty?emptySteps+1:0
    if(state.repeated || emptySteps>=4) return {reached:false,tabs:step,exhausted:true}
  }
  return {reached:false,tabs:200,exhausted:false}
}

async function focusedVisibility(target) {
  const inspect=()=>target.evaluate(element=>element.matches(':focus')?CurbCut.keyboardVisibility(element):'focus moved',undefined,{timeout:1000})
  const reason=await inspect()
  if(!reason || reason==='focus moved') return reason
  await delay(240)
  return inspect()
}

export const journeySelectors=task=>[...new Set([
  ...(task.relatedSelectors??[]),
  ...(task.journey??[]).flatMap(step=>[step.selector,step.pointer?.selector,...(step.checks??[]).map(check=>check.selector)]),
  ...(task.outcomeChecks??[]).map(check=>check.selector),task.successSelector
].filter(Boolean))]

async function readerAction(page,step,target,details) {
  const entry=await target.evaluateHandle(element=>CurbCut.readerRow(element)?.row,{},{timeout:1200})
  try {
    const row=entry.asElement()
    const info=await target.evaluate(element=>CurbCut.readerRow(element)?.info)
    details.reader=info
    if(!row || (step.reader && (info?.role!==step.reader.role || info?.name!==step.reader.name))) return 'The declared named control was absent from Reading view.'
    if(step.action==='observe') await row.scrollIntoViewIfNeeded({timeout:1500})
    else if(step.action==='activate') {
      if(await row.evaluate(element=>element.localName)!=='button') return 'The Reading view control could not be activated.'
      await row.click({timeout:1500})
    } else if(step.action==='key') await row.press(step.key,{timeout:1500})
    else await row.focus()
  } finally {await entry.dispose()}
}

async function safeJourneyTarget(target,task) {
  const state=await target.evaluate(node=>{
    const link=node.closest('a[href]')
    const control=node.closest('button,input,select,textarea,[role=button]')??node
    const label=[control.getAttribute('aria-label'),control.getAttribute('title'),control.textContent.trim().slice(0,150)].filter(Boolean).join(' ')
    return {label,href:link?.href,download:link?.hasAttribute('download'),
      submits:control.matches('button[type=submit],button:not([type]),input[type=submit],input[type=image]') && !!control.form}
  })
  if(state.download || state.submits || forbiddenJourneyAction(state.label)) return false
  if(!state.href) return true
  const url=new URL(state.href)
  return taskDestination(task,url)
}

export async function journeyLane(browser,task,persona,{capture=false,onDOM}={}) {
  let page=browser.page
  const initial=page
  const base=new URL(task.url)
  const hints=journeySelectors(task)
  const steps=[]
  const snapshot=async()=>page.evaluate(({observed,hints})=>CurbCut.snapshot(observed,hints),{observed:task.observedSelector,hints}).catch(()=>null)
  const initialSnapshot=capture?await snapshot():null
  const nodes=new Map(initialSnapshot?.nodes.map(node=>[node.selector,node])??[])
  let interactionContext,contextScore=-1
  async function captureControls() {
    const observed=await snapshot()
    for(const node of observed?.nodes??[]) {
      if(!nodes.has(node.selector) && hints.includes(node.selector)) nodes.set(node.selector,node)
    }
    const score=observed?.context?.nodes.filter(node=>node.box[2]>0 && node.box[3]>0 && node.style.visibility==='visible' && Number(node.style.opacity)>=0.1).length??-1
    if(score>contextScore) {interactionContext=observed.context;contextScore=score}
  }
  async function inspectTaskDocument() {
    const address=new URL(page.url())
    if(address.origin!==base.origin || address.pathname!==base.pathname) return false
    if(capture) await captureControls()
    return await onDOM?.(page)??false
  }
  const result=(status,reason,checks)=>({
    status,reason,steps,url:page.url(),checks,
    snapshot:initialSnapshot && {...initialSnapshot,nodes:[...nodes.values()],interactionContext}
  })
  const checkpoints=task.journey.flatMap(step=>step.checks??[])
  if((await outcomeChecks(initial,task,persona,[...checkpoints,...task.outcomeChecks])).every(Boolean)) {
    return result('inconclusive','The journey outcome already holds.')
  }
  for(const [index,step] of task.journey.entries()) {
    const pointer=persona==='control' || persona==='low-vision'
    const selector=pointer?step.pointer?.selector??step.selector:step.selector
    const target=page.locator(selector)
    const details={selector,action:step.action,key:step.key}
    steps.push(details)
    const count=await target.count()
    if(count>1 || (!count && !index && persona!=='keyboard-only')) return result('inconclusive','Journey step '+(index+1)+' did not identify a unique control.')
    if(!count || !await target.isVisible()) return result('fail','Journey step '+(index+1)+' was unavailable after the prior step.')
    const noActivation=step.action==='observe' || (pointer?step.pointer?.action==='hover':step.action==='focus' || step.action==='key' && !['Enter','Space'].includes(step.key))
    if(!noActivation && !fixtureURL(base) && !await safeJourneyTarget(target,task)) return result('blocked','Journey step '+(index+1)+' leaves the public, read-only interaction.')
    if(persona==='low-vision') {
      details.geometry=await target.evaluate(widthEvidence)
      if(!details.geometry.fits) return result('fail','Journey step '+(index+1)+' extends past the visible width.')
    }
    try {
      if(persona==='screen-reader-view') {
        const failure=await readerAction(page,step,target,details)
        if(failure) return result('fail',failure)
      } else if(step.action==='observe') await target.scrollIntoViewIfNeeded({timeout:1500})
      else if(pointer) {
        if(step.pointer?.action==='hover') await target.hover({timeout:1500})
        else await target.click({timeout:1500})
      } else if(step.action==='key') {
        if(!await target.evaluate(el=>el.matches(':focus-within'))) return result('fail','Journey step '+(index+1)+' did not receive the expected keyboard focus.')
        await page.keyboard.press(step.key)
      } else {
        if(!await target.evaluate(el=>el.matches(':focus'))) {
          details.traversal=await keyboardReach(page,target,selector)
          if(!details.traversal.reached) return result(details.traversal.exhausted?'fail':'inconclusive','Tab traversal missed journey step '+(index+1)+'.')
        }
        details.visibility=await focusedVisibility(target)
        if(details.visibility) return result('fail','Journey step '+(index+1)+' could not be seen while focused: '+details.visibility+'.')
        if(step.action==='activate') await page.keyboard.press('Enter')
      }
    } catch(error) {
      const blocked=await pageBlock(page,browser.responses.get(page))
      return result(blocked?'blocked':error.name==='TimeoutError'?'fail':'inconclusive',blocked??error.message.split('\n')[0])
    }
    await delay(180)
    const pathCheck=[...(step.checks??[]),...task.outcomeChecks].find(check=>check.kind==='url-path')
    const destination=pathCheck && browser.context.pages().find(candidate=>{
      const address=new URL(candidate.url())
      return address.pathname===pathCheck.equals && taskDestination(task,address)
    })
    page=await browser.activePage(destination?.url())??page
    if(!taskDestination(task,new URL(page.url()))) return result('blocked','The journey left the public task site or registered destination.')
    const blocked=await pageBlock(page,browser.responses.get(page))
    if(blocked) return result('blocked',blocked)
    if(await inspectTaskDocument()) return result('observed','The live selectors were validated.')
    if(step.checks) {
      details.checks=await outcomeChecks(page,task,persona,step.checks)
      if(!details.checks.every(Boolean)) return result('fail','The outcome for journey step '+(index+1)+' did not hold.')
    }
    if(persona==='low-vision' && await page.evaluate(()=>Boolean(__curbcutState?.horizontalScroll))) {
      return result('fail','The journey required horizontal scrolling.')
    }
  }
  let checks
  for(let attempt=0;attempt<5;attempt++) {
    checks=await outcomeChecks(page,task,persona)
    if(checks.every(Boolean)) return result('pass','The complete journey reached the declared outcome.',checks)
    if(attempt<4) await delay(250)
  }
  return result('fail','The final journey outcome did not hold.',checks)
}

function matchedPatch(browser,patch) {
  return [...browser.observations.values()].some(page=>page.events.some(event=>event.type==='rule' && event.patchId===patch.id))
}

async function checkLane(task,persona,patch=null,{requireMatch=false,capture=false,targetWait=0,attachedBrowser}={}) {
  let browser=attachedBrowser
  try {
    browser??=await session(task,persona,patch,tmpdir(),{local:true,gate:true})
    if(task.journey) {
      const result=await journeyLane(browser,task,persona,{capture})
      if(requireMatch && result.status==='pass' && !matchedPatch(browser,patch)) {
        return {...result,status:'inconclusive',reason:'No repair rule matched during the journey.'}
      }
      return result
    }
    const initial=browser.page
    const selector=task.observedSelector
    const target=targetLocator(initial,task,selector)
    if(targetWait && !await target.isVisible()) await target.waitFor({state:'visible',timeout:targetWait}).catch(()=>{})
    if(!await target.isVisible()) return {status:persona==='keyboard-only'?'fail':'inconclusive',reason:'The unique target was not visible.'}
    const {action,value,role}=task.probe
    const scrollKeys=[]
    if(attachedBrowser && action==='read') {
      let reached=false
      for(let step=0;step<=40;step++) {
        const {top,height}=await target.evaluate(el=>({top:el.getBoundingClientRect().top,height:innerHeight}))
        if(top>=0 && top<height) {reached=true;break}
        if(step===40) break
        const key=top<0?'PageUp':'PageDown'
        await initial.keyboard.press(key)
        scrollKeys.push(key)
        await delay(180)
      }
      if(!reached) return {status:'inconclusive',reason:'The keyboard did not reach the start of the passage.',scrollKeys}
    }
    const evaluateTarget=()=>target.evaluate((element,options)=>{
      const entry=CurbCut.readerRow(element)
      const row=entry?.row
      return row?.isConnected?{...entry.info,editable:!!row.querySelector('input'),activatable:row.localName==='button'}:null
    },null,{timeout:1000})
    const geometry=await target.evaluate(widthEvidence,{text:action==='read'},{timeout:1000})
    const details={geometry,...(attachedBrowser && action==='read'?{scrollKeys}:{}),
      snapshot:await initial.evaluate(selector=>globalThis.CurbCut?.snapshot(selector),selector).catch(()=>null)}
    const before=await outcomeChecks(initial,task,persona)
    if(action!=='read' && before.every(Boolean)) return {status:'inconclusive',reason:'The outcome already held before interaction.',...details}
    if((action==='read' || persona==='low-vision') && !geometry.fits) return {status:'fail',reason:'The target does not fit the visible width.',...details}
    if(persona==='keyboard-only') {
      const managed=await target.evaluate((element,selector)=>Boolean(element.closest(selector)),managedKeyboardSelector)
      if(managed) {
        return {status:'inconclusive',reason:'The control is in a composite widget that can have its own arrow-key navigation.',...details}
      }
      const destination=task.outcomeChecks.find(check=>check.kind==='url-path')?.equals
      if(destination && await target.evaluate((element,destination)=>[...document.links].some(link=>{
        const href=new URL(link.href)
        return link!==element && href.origin===location.origin && href.pathname===destination && link.tabIndex>=0 &&
          link.checkVisibility({visibilityProperty:true}) && !link.closest('[inert],[aria-hidden=true]')
      }),destination)) {
        return {status:'inconclusive',reason:'A visible tab stop reaches the same public destination.',...details}
      }
      details.traversal=await keyboardReach(initial,target,selector)
      if(!details.traversal.reached) return {...details,status:details.traversal.exhausted?'fail':'inconclusive',reason:'Tab traversal did not reach the target.'}
      details.visibility=await focusedVisibility(target)
      if(details.visibility) return {...details,status:'fail',reason:'The target could not be seen while focused: '+details.visibility+'.'}
      if(action==='type') await initial.keyboard.type(value)
      else await initial.keyboard.press('Enter')
    } else if(persona==='screen-reader-view') {
      details.reader=await evaluateTarget()
      const row=details.reader
      if(!row || row.role!==role || row.name!==task.requiredName || !(action==='type'?row.editable:row.activatable)) {
        return {status:'fail',reason:'The expected usable role and name were absent from Reading view.',...details}
      }
      const handle=await target.evaluateHandle(element=>CurbCut.readerRow(element).row)
      try {
        const control=action==='type'?await handle.asElement().$('input'):handle.asElement()
        if(action==='type') {await control.click({timeout:1500});await initial.keyboard.type(value)}
        else await control.click({timeout:1500})
      } finally {await handle.dispose()}
    } else if(action==='type') {
      await target.click({timeout:1500})
      await initial.keyboard.type(value)
    } else if(action==='click') await target.click({timeout:2000})
    let checks=[],page=initial
    for(let attempt=0;attempt<5;attempt++){
      const pathCheck=task.outcomeChecks.find(check=>check.kind==='url-path')
      const matches=pathCheck?browser.context.pages().filter(candidate=>new URL(candidate.url()).pathname===pathCheck.equals):[]
      page=await browser.activePage(matches.length===1?matches[0].url():null)??initial
      checks=await outcomeChecks(page,task,persona)
      if(checks.length && checks.every(Boolean)) break
      if(attempt<4) await delay(250)
    }
    if(!taskNavigation(new URL(task.url),new URL(page.url()))) return {...details,status:'blocked',reason:'The outcome page left the task site.'}
    const blocked=await pageBlock(page,browser.responses.get(page))
    if(blocked) return {...details,status:'blocked',reason:blocked}
    const passed=checks.length && checks.every(Boolean)
    if(requireMatch && passed && !matchedPatch(browser,patch)) return {...details,status:'inconclusive',reason:'No repair rule matched during the replay.'}
    return {...details,url:page.url(),checks,status:passed?'pass':'fail',reason:'Checked the declared outcome after the '+action+' action.'}
  } catch(error) {
    return {status:error instanceof BlockedPage?'blocked':'inconclusive',reason:error.message.split('\n')[0]}
  } finally {if(!attachedBrowser) await browser?.abort()}
}

export async function confirmBarrier(data) {
  let task
  try {task=await normalizeTask(data)}catch(error){return {runner:'playwright',status:'inconclusive',reason:error.message}}
  if(!task.probe && !task.journey) return {runner:'playwright',status:'inconclusive',reason:'A declarative objective is required.'}
  const control=await checkLane(task,'control')
  if(control.status!=='pass') return {runner:'playwright',status:control.status==='blocked'?'blocked':'inconclusive',control}
  const persona=await checkLane(task,task.persona)
  return {runner:'playwright',status:{pass:'no barrier',fail:'confirmed'}[persona.status]??persona.status,control,persona}
}

export async function oracle(task,patch=null) {
  const persona=await checkLane(task,task.persona,patch)
  if(patch) return {runner:'playwright',...persona}
  const control=await checkLane(task,'control')
  if(control.status!=='pass') return {runner:'playwright',status:control.status==='blocked'?'blocked':'inconclusive',control,persona}
  return {runner:'playwright',status:{pass:'no barrier',fail:'confirmed'}[persona.status]??persona.status,control,persona}
}

export async function replayLane(task,persona,patch=null,{targetWait=0}={}) {
  return {runner:'playwright',...await checkLane(task,persona,patch,{requireMatch:Boolean(patch),capture:true,targetWait})}
}

export async function replayInstalledProbe(browser,task) {
  return checkLane(task,task.persona,null,{attachedBrowser:browser})
}

export async function validateLiveSelectors(task,rules) {
  const persona=task.persona==='low-vision'?'low-vision':'control'
  const browser=await session(task,persona,null,tmpdir(),{local:true,gate:true})
  try {
    const observed=new Map()
    const collect=async page=>{
      for(const entry of await page.evaluate(rules=>CurbCut.inspectRuleSelectors(rules),rules)) {
        const key=entry.index+'.'+entry.field
        const previous=observed.get(key)
        if(!previous || entry.count>previous.count || (entry.matches.length>previous.matches.length && !previous.count)) observed.set(key,entry)
      }
      return [...observed.values()].every(entry=>!entry.issue)
    }
    const complete=await collect(browser.page)
    if(!complete) {
      await delay(250)
      if(!await collect(browser.page) && task.journey) await journeyLane(browser,task,persona,{onDOM:collect})
    }
    const matches=[...observed.values()]
    return {ok:matches.every(entry=>!entry.issue),matches}
  } finally {await browser.abort()}
}
