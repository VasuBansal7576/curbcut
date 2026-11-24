import {createHash} from 'node:crypto'
import {tmpdir} from 'node:os'
import {setTimeout as delay} from 'node:timers/promises'
import {command} from '../core/io.mjs'
import {acceptableURL,forbiddenJourneyAction,normalizeTask,taskNavigation} from '../core/task.mjs'
import {session} from '../core/chrome.mjs'
import {BlockedPage} from '../core/access.mjs'
import {confirmBarrier} from '../core/probe.mjs'

export const sha256=value=>createHash('sha256').update(value).digest('hex')
export const hostExclusion=/(?:\b(?:login|signin|auth|account|passport|sso|casino|poker|betting|sportsbook|torrent|warez)\b|(?:porn|hentai|onlyfans|xhamster|xnxx|xvideos|javhd|hornyleak|rule34|camsoda|bet365|thepiratebay|1337x|vortexscans|fmovies|putlocker|yts\.|nhentai|xhplus|xhvid|satta|matka|1xbet|melbet|22bet|stake\.|betway))/i

export async function git(args) {
  const result=await command('git',args,{timeout:30000})
  if(result.code!==0) throw new Error(result.stderr.trim()||'Git command failed.')
  return result.stdout.trim()
}

export function inspectPage() {
  const main=document.querySelector('main,[role=main]')??document.body
  const visibility=new WeakMap()
  const visible=node=>{
    if(!node) return false
    if(visibility.has(node)) return visibility.get(node)
    let shown=Boolean(node.checkVisibility({visibilityProperty:true,opacityProperty:true}) && !node.closest('[inert],[aria-hidden=true],[data-curbcut-reader]'))
    let opacity=1
    for(let ancestor=node;shown && ancestor;ancestor=ancestor.parentElement) {
      opacity*=Number(getComputedStyle(ancestor).opacity)
      shown=opacity>=0.1
    }
    visibility.set(node,shown)
    return shown
  }
  const clean=value=>value?.replace(/\s+/g,' ').trim()??''
  const name=node=>clean(node?.getAttribute('aria-label') || node?.innerText || node?.textContent || node?.title)
  const excluded=/\b(?:log ?(?:in|out)|sign ?(?:in|up|out)|checkout|payment|register|subscribe|purchase|book now|account|submit|send|order|donate|download|consent|accept all|reject all)\b/i
  const pageTitle=clean(document.title)
  const headers=[...document.querySelectorAll('h1')].slice(0,3).map(name).join(' ')
  const description=document.querySelector('meta[name=description]')?.content??''
  const category=/(?:\b(?:online casino|betting odds|sports betting|gambling|pornography|adult videos|free porn|live sex cams|torrent downloads|watch movies online free|cracked games|warez|xxx videos|18\+ content)\b|\b(?:hentai|onlyfans leaks)\b)/i
  if(category.test([pageTitle,headers,description].join(' '))) return {excluded:'Adult, piracy, or gambling content.'}
  if([...document.querySelectorAll('input[type=password]')].some(visible) &&
    /\b(?:log ?in|sign ?in|authenticate|authentication|single sign.on|government portal)\b/i.test(pageTitle+' '+headers)) {
    return {excluded:'Authentication page.'}
  }

  function selector(node) {
    if(!node || node===document.body) return null
    const parts=[]
    for(let current=node;current && current!==document.body;current=current.parentElement) {
      if(current.id) {
        const id='#'+CSS.escape(current.id)
        if(document.querySelectorAll(id).length===1) {parts.unshift(id);break}
      }
      const siblings=[...current.parentElement.children].filter(item=>item.localName===current.localName)
      const suffix=siblings.length===1?'':':nth-of-type('+(siblings.indexOf(current)+1)+')'
      parts.unshift(current.localName+suffix)
    }
    const value=parts.join(' > ')
    return value.length<=280 && document.querySelectorAll(value).length===1?value:null
  }

  function group(nodes) {
    const first=nodes[0]
    if(!first) return null
    const role=first.getAttribute('role')
    if(role && /^[a-z-]+$/.test(role) && nodes.every(node=>node.getAttribute('role')===role)) return '[role='+role+']'
    if(nodes.every(node=>node.hasAttribute('data-value'))) return '[data-value]'
    const shared=[...first.classList].find(value=>nodes.every(node=>node.classList.contains(value)))
    return shared?'.'+CSS.escape(shared):first.localName
  }

  const info=(node,fallback='')=>node?{selector:selector(node),label:(name(node)||fallback).slice(0,180),href:node.closest('a[href]')?.href,
    visible:visible(node),tab:node.tabIndex,tag:node.localName}:null
  const usable=entry=>entry?.selector && entry.label && !excluded.test(entry.label)
  function related(trigger) {
    const id=trigger.getAttribute('aria-controls')?.split(/\s+/)[0]
    if(id && document.getElementById(id)) return document.getElementById(id)
    for(const attr of ['data-bs-target','data-target','href']) {
      const value=trigger.getAttribute(attr)
      if(value?.startsWith('#') && value.length>1 && document.getElementById(value.slice(1))) return document.getElementById(value.slice(1))
    }
    if(!trigger.matches(dropdown+','+customSelect+',[aria-haspopup]')) return null
    return trigger.nextElementSibling?.matches('.dropdown-menu,.select-options,[role=listbox],[data-select-options]')?
      trigger.nextElementSibling:trigger.parentElement?.querySelector(':scope > .dropdown-menu,:scope > .select-options,:scope > [role=listbox],:scope > [data-select-options]')
  }
  const dropdown='[data-bs-toggle=dropdown],[data-toggle=dropdown],.dropdown-toggle'
  const customSelect='[data-select-trigger],.select-trigger,.custom-select-trigger,[role=combobox],[aria-haspopup=listbox]'
  const modal='dialog,[role=dialog],[role=alertdialog],[aria-modal=true],.modal,[class*=cookie-modal i],[class*=newsletter-modal i],[class*=cookie-banner i]'
  const interactions='button,a[href],summary,[role=button],[role=tab],[aria-controls],[data-bs-target],[data-target],'+dropdown+','+customSelect
  const closeOf=panel=>[...panel.querySelectorAll('button,[role=button],[data-dismiss],[data-bs-dismiss],[aria-label],[class*=close i]')].find(node=>
    node.matches('[data-dismiss=modal],[data-bs-dismiss=modal]') || /^(?:close(?: notice| dialog)?|dismiss|cancel|no thanks|×|✕|✖)$/i.test(name(node)))
  const hard=[]
  const push=(kind,trigger,panel,extra={})=>{
    const handle=info(trigger,extra.triggerLabel),target=info(panel)
    if(usable(handle) && target?.selector) hard.push({kind,trigger:handle,panel:target,...extra})
  }

  for(const nav of [...document.querySelectorAll('header nav,nav,[role=navigation],header')].slice(0,12)) {
    for(const owner of [...nav.querySelectorAll('li,div[class],div[id]')].slice(0,100)) {
      if(!visible(owner)) continue
      const panel=[...owner.children].find(node=>node.matches('ul,ol,[role=menu],[class*=submenu i],[class*=dropdown i],[class*=mega-menu i]') && !visible(node))
      const trigger=[...owner.children].find(node=>node!==panel && node.matches('a[href],button,[role=button],[tabindex],span'))
      if(!trigger || !visible(trigger) || !panel) continue
      const links=[...panel.querySelectorAll('a[href]')].filter(link=>!link.hasAttribute('download')).slice(0,7).map(info).filter(usable)
      if(links.length) {
        const elsewhere=[...document.links].filter(link=>!owner.contains(link) && visible(link) && link.tabIndex>=0).map(link=>link.href)
        push(1,trigger,panel,{owner:selector(owner),links,elsewhere})
      }
      if(hard.filter(row=>row.kind===1).length>=4) break
    }
    if(hard.filter(row=>row.kind===1).length>=4) break
  }

  for(const trigger of [...document.querySelectorAll(interactions)].filter(visible).slice(0,220)) {
    if(trigger.closest('form') || trigger.matches('summary,[role=tab]')) continue
    const panel=related(trigger)
    if(!panel || visible(panel) || panel.contains(trigger)) continue
    if(panel.matches(modal)) {
      const close=closeOf(panel)
      if(usable(info(close))) push(4,trigger,panel,{close:info(close)})
    } else if(panel.matches('[role=listbox],[role=menu],[class*=select i],[class*=dropdown i]') &&
      (trigger.matches(customSelect+', [aria-haspopup=menu]') || /\b(?:sort|country|choose|select)\b/i.test(name(trigger)))) {
      const nodes=[...panel.querySelectorAll('[role=option],[role=menuitem],button,[data-value]')].slice(0,8)
      const options=nodes.map(info).filter(usable)
      if(options.length>1) push(5,trigger,panel,{options,group:group(nodes)})
    } else if(trigger.matches(dropdown) && panel.matches('.dropdown-menu') && !panel.querySelector('input[type=password],form')) {
      const item=[...panel.querySelectorAll('a[href],button,[role=menuitem]')].find(node=>usable(info(node)))
      if(item) push(2,trigger,panel,{dropdownItem:info(item)})
    } else {
      const filters=[...panel.querySelectorAll('input[type=checkbox],input[type=radio]')].filter(node=>!node.checked).slice(0,3)
      if(/\bfilter\b/i.test(name(trigger)) && filters.length) {
        const option=filters.find(node=>node.id && node.labels?.length && visible(node.labels[0])===false)
        if(option) push(6,trigger,panel,{input:selector(option),option:info(option.labels[0])})
      }
      if(panel.textContent.trim().length>=18 && !panel.querySelector('input[type=password],form') &&
        (trigger.hasAttribute('aria-expanded') || /accordion|collapse|accordion|faq/i.test(trigger.className+' '+panel.className))) {
        const paragraph=[...panel.querySelectorAll('p,li')].find(node=>name(node).length>=18)??panel
        push(2,trigger,panel,{answer:info(paragraph)})
      }
    }
  }

  for(const panel of [...document.querySelectorAll(modal)].filter(visible).slice(0,4)) {
    const close=closeOf(panel)
    if(visible(close) && usable(info(close))) push(4,close,panel,{close:info(close),alreadyOpen:true})
  }

  for(const widget of [...document.querySelectorAll('.slick-slider,.swiper,.swiper-container,[aria-roledescription=carousel]')].filter(visible).slice(0,10)) {
    const next=widget.querySelector('.slick-next,.swiper-button-next,[data-slide=next],[data-bs-slide=next],button[aria-label^="Next" i]')
    if(!visible(next) || next.matches(':disabled,[aria-disabled=true],.slick-disabled,.swiper-button-disabled')) continue
    const slides=[...widget.querySelectorAll('.slick-slide:not(.slick-cloned),.swiper-slide:not(.swiper-slide-duplicate),[aria-roledescription=slide]')]
    const active=slides.find(node=>node.matches('.slick-current,.swiper-slide-active,[aria-current=true]'))
    const following=active && slides[slides.indexOf(active)+1]
    const marker=active && [...active.classList].find(token=>['slick-current','swiper-slide-active'].includes(token))
    if(!following || !selector(following)) continue
    const activeSelector=selector(following)+(marker?'.'+marker:'[aria-current=true]')
    if(activeSelector.length<=280) push(3,next,following,{carousel:true,widget:selector(widget),activeSelector,
      previous:selector(widget.querySelector('.slick-prev,.swiper-button-prev,[data-slide=prev],[data-bs-slide=prev]')),triggerLabel:'Next slide'})
  }

  for(const widget of [...document.querySelectorAll('[role=tablist],[class*=carousel-indicator i],[class*=slider-control i]')].slice(0,8)) {
    const nodes=[...widget.querySelectorAll('[role=tab],button,[role=button],[data-slide-to],[data-bs-slide-to]')].filter(visible)
    const first=nodes.find(node=>node.matches('[aria-selected=true],[aria-current=true],.active') && node.tabIndex>=0)??nodes.find(node=>node.tabIndex>=0)
    const second=nodes[nodes.indexOf(first)+1]
    const panel=second && related(second)
    if(first && second && panel && !visible(panel) && usable(info(second))) {
      push(3,first,panel,{widget:selector(widget),items:group(nodes),second:info(second),
        orientation:widget.getAttribute('aria-orientation')==='vertical'?'vertical':'horizontal'})
    }
  }

  const fields=[...main.querySelectorAll('input[placeholder],textarea[placeholder]')].filter(visible).slice(0,12).flatMap(node=>{
    const hint=clean(node.placeholder)
    const target=info(node)
    if(!target?.selector || node.disabled || node.readOnly || !/\b(?:search|filter|find|keyword|query)\b/i.test(hint) ||
      !node.matches('textarea,input[type=search],input[type=text],input:not([type])') ||
      excluded.test(hint+' '+node.name) || node.getAttribute('aria-label') || node.getAttribute('aria-labelledby') || node.labels?.length) return []
    return [{...target,hint:hint.slice(0,120),role:node.type==='search'?'searchbox':'textbox'}]
  })
  const passages=[...main.querySelectorAll('p,li,pre,blockquote')].filter(visible).slice(0,80).flatMap(node=>{
    const target=info(node)
    const quote=target?.label.split(/\s+/).slice(0,12).join(' ')
    const bounds=node.getBoundingClientRect()
    return target?.selector && quote?.length>=32 && bounds.width>=430 && bounds.top<2200? [{selector:target.selector,quote}]:[]
  }).slice(0,2)
  return {hard,fields:fields.slice(0,2),passages}
}

export function candidatesFor(site,url,discovery,{version=4}={}) {
  const base=new URL(url)
  const candidates=[]
  const names=new Set()
  const valid=entry=>entry?.selector && entry.label && !forbiddenJourneyAction(entry.label)
  const sameSite=entry=>{
    try {
      const href=new URL(entry.href)
      return acceptableURL(href) && taskNavigation(base,href) && !hostExclusion.test(href.hostname) && href.pathname!==base.pathname
    } catch {return false}
  }
  const action=(entry,pointer)=>({selector:entry.selector,action:'activate',...(pointer?{pointer}:{})})
  const key=(entry,key,pointer)=>({selector:entry.selector,action:'key',key,pointer})
  const hover={action:'hover'}
  const focus=(entry,pointer)=>({selector:entry.selector,action:'focus',pointer})
  const observe=entry=>({selector:entry.selector,action:'observe'})
  const visible=entry=>({kind:'visible',selector:entry.selector})
  const read=entry=>({kind:'contains',selector:entry.selector,equals:entry.label.slice(0,100)})
  const add=(kind,trigger,steps,checks,task,controlTask,selectors=[],canRead=false)=>{
    const bucket=parseInt(sha256(site).slice(0,2),16)
    const persona=canRead && bucket<55?'screen-reader-view':bucket>=217?'low-vision':'keyboard-only'
    if(persona==='screen-reader-view') {
      steps[0]={...steps[0],reader:{role:'button',name:trigger.label}}
      task='In Reading view, activate the button named “'+trigger.label+'” and read the expanded answer.'
    }
    if(persona==='low-vision') task='At 320 CSS pixels with vertical scrolling only, '+controlTask.charAt(0).toLowerCase()+controlTask.slice(1)
    const identity=JSON.stringify([kind,trigger.selector,checks])
    if(names.has(identity) || steps.some(step=>!step.selector)) return
    names.add(identity)
    const suffix=sha256(identity).slice(0,12)
    candidates.push({id:'v'+version+'-'+suffix+'-'+sha256(site).slice(0,8),url,persona,task,controlTask,
      observedSelector:trigger.selector,barrierClass:kind,journey:steps,outcomeChecks:checks,
      relatedSelectors:[...new Set(selectors.filter(Boolean))]})
  }
  for(const entry of discovery.hard) {
    const {kind,trigger,panel}=entry
    if(!valid(trigger)) continue
    const label='“'+trigger.label+'”'
    if(kind===1) {
      const link=entry.links.find(candidate=>valid(candidate) && sameSite(candidate) &&
        !entry.elsewhere.some(href=>new URL(href).pathname===new URL(candidate.href).pathname))
      if(!link) continue
      const goal=new URL(link.href).pathname
      const keyboard=[focus(trigger,hover),key(trigger,'ArrowDown',hover),action(link)]
      const outcome=[{kind:'url-path',equals:goal}]
      const objective='Open '+label+' from keyboard focus or with Arrow Down and follow “'+link.label+'”. Confirm the public destination '+goal+'.'
      const control='Hover '+label+', click “'+link.label+'” and confirm '+goal+'.'
      add(kind,trigger,keyboard,outcome,objective,control,[entry.owner,panel.selector])
    } else if(kind===2 && valid(entry.dropdownItem)) {
      const item=entry.dropdownItem
      add(kind,trigger,[action(trigger),observe(item)],[visible(item)],
        'Open '+label+' using the keyboard and read “'+item.label+'”.','Click '+label+' and read “'+item.label+'”.',[panel.selector])
    } else if(kind===2 && entry.answer?.selector && entry.answer.label.length>=18) {
      add(kind,trigger,[action(trigger),observe(entry.answer)],[read(entry.answer)],
        'Expand '+label+' with the keyboard and read “'+entry.answer.label.slice(0,100)+'”.',
        'Click '+label+' and read “'+entry.answer.label.slice(0,100)+'”.',[panel.selector],entry.answer.tag==='p' && trigger.label.length<=150)
    } else if(kind===3 && entry.carousel) {
      const active={selector:entry.activeSelector}
      add(kind,trigger,[action(trigger),observe(active)],[visible(active)],
        'Activate '+label+' from the keyboard and confirm the next slide is shown.',
        'Click '+label+' and confirm the next slide is shown.',[entry.widget,entry.previous,panel.selector])
    } else if(kind===3) {
      const {second}=entry
      const arrow=entry.orientation==='vertical'?'ArrowDown':'ArrowRight'
      if(!valid(second)) continue
      add(kind,trigger,[focus(trigger,{action:'hover'}),key(trigger,arrow,{action:'click',selector:second.selector}),
        action(second,hover),observe(panel)],[visible(panel)],
        'Focus '+label+', move once with '+arrow+', activate “'+second.label+'” and read its panel.',
        'Click “'+second.label+'” and read its panel.',[entry.widget,entry.items,panel.selector])
    } else if(kind===4 && valid(entry.close)) {
      const first={...(entry.alreadyOpen?observe(panel):action(trigger)),checks:[visible(panel)]}
      add(kind,trigger,[first,key(panel,'Escape',{action:'click',selector:entry.close.selector})],[{kind:'hidden',selector:panel.selector}],
        entry.alreadyOpen?'Use the keyboard to reach the open dialog, press Escape, and confirm it closed.':
          'Open '+label+' by keyboard. Confirm the dialog appeared, then press Escape and confirm it closed.',
        (entry.alreadyOpen?'Confirm the dialog is open. ':'Click '+label+' and confirm that the dialog opens. ')+
          'Click “'+entry.close.label+'” to close it.',[panel.selector,entry.close.selector])
    } else if(kind===5) {
      const options=entry.options.filter(valid)
      const [first,second]=options
      if(!first || !second || trigger.label.includes(second.label) || second.href) continue
      add(kind,trigger,[focus(trigger,hover),key(trigger,'ArrowDown',{action:'click'}),
        key(first,'ArrowDown',{action:'hover',selector:second.selector}),key(second,'Enter',{action:'click'})],
        [{kind:'contains',selector:trigger.selector,equals:second.label}],
        'Focus '+label+', press Arrow Down to open it, move from “'+first.label+'” to “'+second.label+'” and select it with Enter.',
        'Click '+label+' and select “'+second.label+'”. Confirm the selected value.',[panel.selector,entry.group])
    } else if(kind===6 && valid(entry.option) && entry.input) {
      add(kind,trigger,[action(trigger),action(entry.option)],[{kind:'selected',selector:entry.input}],
        'Open '+label+' and select the filter “'+entry.option.label+'” using the keyboard. Verify it is selected.',
        'Click '+label+' and select “'+entry.option.label+'”. Verify it is selected.',[panel.selector])
    }
  }
  const rank=kind=>sha256(site+':'+kind)
  candidates.sort((a,b)=>rank(a.barrierClass).localeCompare(rank(b.barrierClass)))
  const ordered=[]
  const classOrder=[...new Set(candidates.map(task=>task.barrierClass))]
  const byClass=Map.groupBy(candidates,task=>task.barrierClass)
  for(const kind of classOrder) ordered.push(byClass.get(kind).shift())
  for(const kind of classOrder) ordered.push(...byClass.get(kind))
  const fallback=[]
  for(const field of discovery.fields) {
    if(forbiddenJourneyAction(field.hint)) continue
    const value='test'
    fallback.push({id:'v'+version+'-'+sha256(url+field.selector).slice(0,20),url,persona:'screen-reader-view',observedSelector:field.selector,
      task:'In Reading view, find the “'+field.hint+'” '+field.role+' and type '+value+' without submitting.',
      controlTask:'Click the visible “'+field.hint+'” field and type '+value+' without submitting.',
      requiredName:field.hint,probe:{action:'type',value,role:field.role},outcomeChecks:[{kind:'value',selector:field.selector,equals:value}]})
  }
  for(const passage of discovery.passages) {
    fallback.push({id:'v'+version+'-'+sha256(url+passage.selector).slice(0,20),url,persona:'low-vision',observedSelector:passage.selector,
      task:'At 320 CSS pixels, read the passage beginning “'+passage.quote+'” and confirm it fits without horizontal scrolling.',
      controlTask:'Read the passage beginning “'+passage.quote+'” at normal width.',
      probe:{action:'read'},outcomeChecks:[{kind:'contains',selector:passage.selector,equals:passage.quote},{kind:'fits-width',selector:passage.selector}]})
  }
  return [...ordered.slice(0,3),...fallback.slice(0,1)]
}

function compact(result) {
  const lane=run=>{
    if(!run) return run
    const {snapshot,...measured}=run
    return measured
  }
  return {...result,control:lane(result.control),persona:lane(result.persona)}
}

export async function scoutSite(candidate,{version=4,checkAccess}={}) {
  let browser,discovery,url
  try {
    let task
    for(const address of [candidate.url,'https://www.'+candidate.site+'/']) {
      try {
        task=await normalizeTask({url:address,persona:'keyboard-only',task:'Inspect public page controls.'})
        browser=await session(task,'control',null,tmpdir(),{local:true,gate:true,discovery:true})
        break
      } catch(error) {
        if(error instanceof BlockedPage && /Access challenge|CAPTCHA|HTTP [45]/i.test(error.message)) throw error
        if(address.includes('www.')) throw error
      }
    }
    url=browser.page.url()
    if(hostExclusion.test(new URL(url).hostname)) return {status:'excluded',reason:'Restricted redirect.'}
    await delay(240)
    discovery=await browser.page.evaluate(inspectPage)
  } catch(error) {
    return {status:error instanceof BlockedPage?'blocked':'inconclusive',reason:error.message.split('\n')[0]}
  } finally {await browser?.abort()}
  if(discovery.excluded) return {status:'excluded',reason:discovery.excluded}
  const checks=[]
  for(const data of candidatesFor(candidate.site,url,discovery,{version})) {
    const normalized={...data}
    if(!normalized.relatedSelectors?.length) delete normalized.relatedSelectors
    let result
    try {
      const task=await normalizeTask(normalized)
      result=await confirmBarrier(task)
      const access=checkAccess && result.status==='confirmed'?await checkAccess(task).catch(error=>({
        runner:'playwright-cdp',status:'inconclusive',reason:error.message.split('\n')[0]
      })):undefined
      checks.push({task,result:compact(result),access})
    } catch(error) {
      checks.push({task:normalized,result:{runner:'playwright',status:'inconclusive',reason:error.message.split('\n')[0]}})
    }
    if(result?.status==='confirmed' || result?.status==='blocked') break
    await delay(350)
  }
  return {status:checks.find(row=>row.result.status==='confirmed')?'confirmed':
    checks.some(row=>row.result.status==='no barrier')?'no barrier':checks.some(row=>row.result.status==='blocked')?'blocked':
      checks.length?'inconclusive':'no candidate',url,detected:discovery.hard.length,checks}
}
