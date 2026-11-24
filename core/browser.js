import {collectNames,visibleLanguageSample,applyLiveName} from './jev-naming-browser.js'
import {computeAccessibleName, getRole, isInaccessible} from 'dom-accessibility-api'
import {discoverCoverage,coverageObservation} from './coverage-browser.js'
import {apply,match} from './engine.js'
import {keyboardVisibility,observePassage,widthEvidence} from './geometry.js'
import {isMirroredHoverEvent,observedHoverRules} from './hover.js'
import {inspectRuleSelectors} from './selectors.js'
import {collectInstantState,instantPrivacy} from './jev-browser.js'

export const lowContrastFilter='grayscale(1) contrast(0.22)'

const selectors='a[href],button,summary,input,textarea,select,h1,h2,h3,h4,h5,h6,p,li,img[alt],main,nav,header,footer,[role],[tabindex],div[class],div[id],article,section,table,td,form,b,strong,em,output'
const textRoles=['paragraph','text','status','alert','listitem','strong','emphasis']
function describe(el) {
  const role=getRole(el) || 'text'
  const name=computeAccessibleName(el).trim() || (textRoles.includes(role) ? [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim() : '')
  const state=[]
  for(const key of ['expanded','pressed','selected','checked','disabled','level']) if(el.hasAttribute('aria-'+key)) state.push(key+' '+el.getAttribute('aria-'+key))
  if(el.matches('input[type=checkbox],input[type=radio]')) state.push(el.checked?'checked':'unchecked')
  if(el.matches(':disabled')) state.push('disabled')
  return {role,name:name.slice(0,200),state:state.join(', ')}
}
function elements() {
  return [...document.querySelectorAll(selectors)].filter(el=>!el.closest('[data-curbcut-reader]') && !isInaccessible(el) && el.getClientRects().length)
}
function identify(el) {
  return el.id?'#'+CSS.escape(el.id):el.localName+[...el.classList].slice(0,2).map(s=>'.'+CSS.escape(s)).join('')
}
function focusedElement() {
  let element=document.activeElement
  while(element?.shadowRoot?.activeElement) element=element.shadowRoot.activeElement
  return element
}
function neighborhood(element) {
  if(!element) return []
  const parent=element.parentElement
  return [element,parent,element.previousElementSibling,element.nextElementSibling,
    ...[...element.children].slice(0,5),parent?.parentElement].filter(Boolean)
}
export function exactSelector(element) {
  if(element.getRootNode()!==document) return identify(element)
  const parts=[]
  for(let node=element;node;node=node.parentElement) {
    const simple=identify(node)
    if(document.querySelectorAll(simple).length===1) {
      parts.unshift(simple)
      break
    }
    if(!node.parentElement) {parts.unshift(node.localName);break}
    const peers=[...node.parentElement.children].filter(child=>child.localName===node.localName)
    parts.unshift(node.localName+':nth-of-type('+(peers.indexOf(node)+1)+')')
  }
  const selector=parts.join(' > ')
  return selector.length<=280?selector:identify(element)
}

function repairContext(targets) {
  const ancestry=new Map()
  for(const [element,selector] of targets) {
    const branch=[]
    for(let node=element;node && branch.length<5;node=node.parentElement) branch.push(node)
    for(const node of branch) if(!ancestry.has(node)) ancestry.set(node,node===element?selector:exactSelector(node))
  }
  const nodes=[...ancestry].slice(0,24).map(([node,selector])=>{
    const style=getComputedStyle(node),box=node.getBoundingClientRect()
    const attrs=[...node.attributes].filter(({name})=>/^(?:id|class|role|hidden|inert|tabindex|aria-[\w-]+|data-(?:bs-)?(?:toggle|target|state|open|dismiss))$/.test(name))
    return {selector,parent:ancestry.get(node.parentElement),tag:node.localName,
      attributes:Object.fromEntries(attrs.map(({name,value})=>[name,value.slice(0,180)])),
      hoverHandlers:['mouseenter','mouseover','pointerenter','pointerover'].filter(type=>typeof node['on'+type]==='function'),
      text:[...node.childNodes].filter(child=>child.nodeType===3).map(child=>child.textContent.trim()).join(' ').trim().slice(0,140),
      children:[...node.children].slice(0,6).map(identify),box:[box.x,box.y,box.width,box.height].map(Math.round),
      style:Object.fromEntries(['display','visibility','opacity','position','overflow-x','overflow-y','clip','clip-path','pointer-events','z-index','transform']
        .map(property=>[property,style.getPropertyValue(property)]))}
  })
  return {nodes,hoverRules:observedHoverRules(nodes.map(node=>node.selector))}
}

function snapshot(observedSelector,hints=[]) {
  const target=observedSelector ? document.querySelector(observedSelector) : null
  const selected=new Map()
  for(const selector of hints) {
    const node=document.querySelector(selector)
    if(node) selected.set(node,selector)
  }
  const focused=focusedElement()
  const visible=elements()
  const overflowing=innerWidth<=320?visible.filter(element=>{
    const box=element.getBoundingClientRect()
    return box.width>0 && (box.right>innerWidth+1 || box.left<-1 || element.scrollWidth>element.clientWidth+1)
  }).slice(0,25):[]
  const contextTargets=new Map(target?[[target,observedSelector]]:[])
  for(const [node,selector] of selected) if(!contextTargets.has(node)) contextTargets.set(node,selector)
  const context=contextTargets.size?repairContext(contextTargets):undefined
  const nodes=[...new Set([...selected.keys(),...neighborhood(target),...neighborhood(focused),...overflowing,...visible])].slice(0,180)
  return {url:location.origin+location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    focused:focused ? identify(focused):null,context,
    nodes:nodes.map(el=>{
      const box=el.getBoundingClientRect()
      const style=getComputedStyle(el)
      return {selector:el===target?observedSelector:selected.get(el)??identify(el),...describe(el),tag:el.localName,tabIndex:el.tabIndex,tabIndexAttribute:el.getAttribute('tabindex'),expanded:el.getAttribute('aria-expanded'),controls:el.getAttribute('aria-controls'),hidden:el.hidden,hasHref:el.hasAttribute('href'),display:style.display,left:Math.round(box.left),width:Math.round(box.width),
        ...(innerWidth<=320?{right:Math.round(box.right),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,overflowX:style.overflowX,minWidth:style.minWidth,whiteSpace:style.whiteSpace}:{}),
        ...(el.getRootNode()!==document?{shadow:true}:{})}
    })}
}
const readerRows=new WeakMap()
function readerRow(element) {
  return readerRows.get(element)
}
function reader(report=()=>{}) {
  const originalFocus=document.activeElement
  const panel=document.createElement('dialog')
  panel.dataset.curbcutReader=''
  panel.setAttribute('aria-label','Curb Cut reading view')
  panel.style.cssText='position:fixed;inset:0;margin:0;width:100vw;max-width:none;height:100vh;max-height:none;box-sizing:border-box;border:0;overflow:auto;background:#142324;color:#f6f6e8;font:16px/1.5 system-ui;padding:32px max(5vw,24px);z-index:2147483647'
  const title=document.createElement('h1')
  title.textContent='Reading view'
  title.style.cssText='font:600 32px/1.2 system-ui;color:#d5f99e;margin:0 0 20px'
  const rows=document.createElement('div')
  panel.append(title,rows)
  document.body.append(panel)
  panel.showModal()
  panel.addEventListener('cancel',e=>e.preventDefault())
  const state=globalThis.__curbcutState
  if(state?.persona==='screen-reader-view') {
    state.readerInputs=0
    panel.addEventListener('input',()=>state.readerInputs++,true)
  }
  const mappings=new Map()
  function rowFor(el,info) {
    const editable=['textbox','searchbox'].includes(info.role) && el.matches('textarea,input:not([type=password])')
    const reportable=info.role==='img' && state?.coverageSelector && el.matches(state.coverageSelector)
    const activatable=reportable || ['link','button','checkbox','radio','tab','switch','menuitem','option'].includes(info.role)
    const row=document.createElement(editable?'label':activatable?'button':'div')
    row.tabIndex=0
    row.style.cssText='display:block;box-sizing:border-box;width:100%;max-width:850px;text-align:left;color:inherit;background:transparent;border:0;border-bottom:1px solid #445853;padding:7px 4px;font:inherit'
    const text=document.createElement('span')
    row.append(text)
    if(editable) {
      row.tabIndex=-1
      const input=document.createElement('input')
      input.type=info.role==='searchbox'?'search':'text'
      input.value=el.value
      input.setAttribute('aria-label',info.name || 'Unnamed '+info.role)
      input.style.cssText='display:block;color:#132220;background:#fff;padding:6px;width:85%'
      input.addEventListener('input',event=>{
        if(event.isTrusted) report('reader-text',el,info)
        const prototype=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype
        Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,input.value)
        el.dispatchEvent(new Event('input',{bubbles:true}))
      })
      input.addEventListener('change',()=>{
        el.dispatchEvent(new Event('change',{bubbles:true}))
        render()
      })
      input.addEventListener('keydown',e=>{
        if(e.key==='Enter' && el.form) {e.preventDefault(); el.form.requestSubmit()}
      })
      row.append(input)
    } else if(activatable) {
      row.type='button'
      row.addEventListener('keydown',event=>{
        if(!event.isTrusted || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Escape'].includes(event.key)) return
        event.preventDefault()
        report('reader-key',el,{...info,key:event.key})
        el.dispatchEvent(new KeyboardEvent('keydown',{key:event.key,bubbles:true,cancelable:true}))
        render()
      })
      row.addEventListener('click',event=>{
        if(!el.matches(':disabled,[aria-disabled=true]')) {
          if(event.isTrusted) report('reader-activate',el,info)
          if(!reportable) el.click()
          render()
        }
      })
    }
    return row
  }
  function render() {
    const seen=new Set()
    let previous=null
    for(const el of elements()) {
      const info=describe(el)
      if(['presentation','none','generic'].includes(info.role) || (!info.name && textRoles.includes(info.role))) continue
      seen.add(el)
      const identity=[info.role,info.name].join('|')
      let entry=mappings.get(el)
      if(!entry || entry.identity!==identity) {
        entry?.row.remove()
        entry={row:rowFor(el,info),identity}
        mappings.set(el,entry)
        readerRows.set(el,{...entry,info})
      }
      const row=entry.row
      const line=[info.role,info.name || '(unnamed)',info.state].filter(Boolean).join(' · ')
      if(row.firstChild.textContent!==line) row.firstChild.textContent=line
      if(row.parentNode!==rows || row.previousElementSibling!==previous) rows.insertBefore(row,previous?previous.nextElementSibling:rows.firstElementChild)
      previous=row
    }
    for(const [el,{row}] of mappings) if(!seen.has(el)) {row.remove();mappings.delete(el);readerRows.delete(el)}
  }
  render()
  const observer=new MutationObserver(records=>{
    if(!panel.isConnected && document.body) {document.body.append(panel);panel.showModal()}
    if(records.some(r=>!panel.contains(r.target))) render()
  })
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true})
  return ()=>{observer.disconnect();panel.close();panel.remove();for(const element of mappings.keys()) readerRows.delete(element);originalFocus?.focus()}
}

function enforce(persona,report=()=>{}, {topLevel=true}={}) {
  const state={persona,blockedPointers:0,horizontalScroll:false,minWidth:innerWidth,maxWidth:innerWidth}
  Object.defineProperty(globalThis,'__curbcutState',{value:state,configurable:true})
  if(persona==='keyboard-only') {
    state.keys={tab:0,activate:0,other:0,text:0}
    state.blockedActivations=0
    let keyboardActivation=false,tabPending=false,previousFocus=null,tabTimer
    const visits=new WeakMap()
    function allowActivation(event,target) {
      const reason=keyboardVisibility(target)
      if(!reason) return true
      state.blockedActivations++
      report('blocked-activation',target,{key:event.key,eventType:event.type,reason})
      event.preventDefault()
      event.stopImmediatePropagation()
      return false
    }
    window.addEventListener('focusin',event=>{
      if(!tabPending || !event.isTrusted) return
      const target=event.composedPath()[0]
      if(target===previousFocus) return
      const count=(visits.get(target)??0)+1
      visits.set(target,count)
      report('tab-focus',target,{revisited:count>1})
    },true)
    window.addEventListener('keyup',event=>{
      if(event.isTrusted && event.key==='Tab') tabPending=false
      if(event.isTrusted && ['Enter',' '].includes(event.key)) allowActivation(event,event.composedPath()[0])
    },true)
    window.addEventListener('keydown',event=>{
      if(!event.isTrusted) return
      if(event.key==='Tab') {
        previousFocus=focusedElement()
        state.keys.tab++
        tabPending=true
        clearTimeout(tabTimer)
        tabTimer=setTimeout(()=>{tabPending=false},0)
        report('tab',event.composedPath()[0],{reverse:event.shiftKey})
      }
      else if(['Enter',' '].includes(event.key)) {
        const target=event.composedPath()[0]
        if(!allowActivation(event,target)) return
        state.keys.activate++
        report('activate',target,{key:event.key,focused:focusedElement()===target})
        keyboardActivation=true
        setTimeout(()=>{keyboardActivation=false},0)
      } else {
        state.keys.other++
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Escape'].includes(event.key)) {
          report('key',event.composedPath()[0],{key:event.key})
          keyboardActivation=true
          setTimeout(()=>{keyboardActivation=false},0)
        }
      }
    },true)
    window.addEventListener('input',event=>{
      if(!event.isTrusted || !document.hasFocus()) return
      const target=event.composedPath()[0]
      if(target!==focusedElement() || !target.matches('input,textarea,[contenteditable]')) return
      state.keys.text++
      report('text',target)
    },true)
    const block=event=>{
      if(isMirroredHoverEvent(event)) return
      if(event.type==='click' && event.detail===0 && (event.isTrusted || keyboardActivation)) {
        allowActivation(event,event.composedPath()[0])
        return
      }
      state.blockedPointers++
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    for(const type of ['pointerdown','pointerup','pointermove','pointerover','pointerenter','pointerout','pointerleave','pointercancel','mousedown','mouseup','mousemove','mouseover','mouseenter','mouseout','mouseleave','wheel','touchstart','touchend','touchmove','touchcancel','dblclick','auxclick','contextmenu','dragstart','drop','click']) window.addEventListener(type,block,{capture:true,passive:false})
  }
  if(persona==='control' || persona==='low-vision') {
    window.addEventListener('pointerover',event=>{
      if(event.isTrusted) report('pointer-hover',event.composedPath()[0])
    },true)
    window.addEventListener('click',event=>{
      if(event.isTrusted && event.detail>0) report('pointer-click',event.composedPath()[0])
    },true)
    window.addEventListener('input',event=>{
      if(event.isTrusted) report('pointer-text',event.composedPath()[0])
    },true)
  }
  if(persona==='low-vision') {
    const clip=()=>{
      const style=document.createElement('style')
      style.textContent='html,body{overflow-x:clip!important}'
      document.documentElement.append(style)
    }
    if(document.documentElement) clip()
    else document.addEventListener('DOMContentLoaded',clip,{once:true})
    window.addEventListener('resize',()=>{state.minWidth=Math.min(state.minWidth,innerWidth);state.maxWidth=Math.max(state.maxWidth,innerWidth)})
    window.addEventListener('scroll',()=>{
      if(Math.abs(scrollX)>1 && !state.horizontalScroll) {state.horizontalScroll=true;report('horizontal')}
    },true)
  }
  if(topLevel && persona==='low-contrast-simulation') {
    const start=()=>{
      document.documentElement.style.setProperty('filter',lowContrastFilter,'important')
      state.simulationFilter=lowContrastFilter
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true})
    else start()
  }
  if(topLevel && (persona==='screen-reader-view' || persona==='color-blind')) {
    const start=()=>{
      if(persona==='screen-reader-view') reader(report)
      else {
        const filter=document.createElementNS('http://www.w3.org/2000/svg','svg')
        filter.setAttribute('width','0')
        filter.setAttribute('height','0')
        filter.innerHTML='<filter id="cc-deuteranopia"><feColorMatrix type="matrix" values="0.367 0.861 -0.228 0 0 0.280 0.673 0.047 0 0 -0.012 0.043 0.969 0 0 0 0 0 1 0"/></filter>'
        document.body.append(filter)
        document.body.style.filter='url(#cc-deuteranopia)'
      }
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true})
    else start()
  }
  return state
}
globalThis.CurbCut=Object.freeze({collectNames:()=>collectNames(exactSelector),visibleLanguageSample,applyLiveName,apply,match,snapshot,reader,readerRow,enforce,exactSelector,discoverCoverage:()=>discoverCoverage(exactSelector),coverageObservation,keyboardVisibility,inspectRuleSelectors,observePassage,widthEvidence,instantPrivacy,collectInstantState:()=>collectInstantState(exactSelector)})
