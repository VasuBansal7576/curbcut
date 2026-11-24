import {computeAccessibleName} from 'dom-accessibility-api'

export const widgetAnchor={toggleOnActivate:'trigger',arrowKeyNavigation:'container',dialogBehavior:'dialog',listboxBehavior:'trigger'}
export const selectorFields=['selector','trigger','target','container','items','dialog','opener','close','list','options']
const nativeActivation='button,input,select,textarea,a[href],summary'
const focusable='button,input,select,textarea,a[href],summary,[tabindex],[contenteditable=true]'
const activationKeys=['Enter',' ']
const pendingListFocus=new WeakMap()
const available=node=>Boolean(node?.checkVisibility({visibilityProperty:true}) && !node.matches(':disabled,[aria-disabled=true]') && !node.closest('[inert]'))

let nextId=0
function identify(node,set) {
  if(node.id && document.getElementById(node.id)===node) return node.id
  let id
  do {id='curbcut-widget-'+ ++nextId} while(document.getElementById(id))
  set(node,'id',id)
  return id
}

function button(node,set) {
  if(!node.matches(nativeActivation)) {
    set(node,'tabindex','0')
    if(!node.hasAttribute('role')) set(node,'role','button')
  }
}

function handle(event) {
  event.preventDefault()
  event.stopImmediatePropagation()
}

function visibility(node,mode,set,rule) {
  return (open)=>{
    if(mode==='class') set(node,'class:'+rule.className,open)
    if(mode==='attribute' || (open && node.hidden)) set(node,'hidden',open?null:'')
    if(mode==='display' && available(node)!==open) set(node,'style:display',open?(rule.display??'block'):'none')
    if(node.hasAttribute('aria-hidden')) set(node,'aria-hidden',open?'false':'true')
  }
}

function disclosure(trigger,target,rule,{set,on}) {
  button(trigger,set)
  set(trigger,'aria-controls',identify(target,set))
  const show=visibility(target,rule.mode,set,rule)
  const sync=()=>set(trigger,'aria-expanded',available(target)?'true':'false')
  on(trigger,'click',event=>{
    if(trigger.matches(':disabled,[aria-disabled=true]')) return
    const open=available(target)
    queueMicrotask(()=>{
      if(!trigger.isConnected || !target.isConnected) return
      if(available(target)===open && !event.defaultPrevented) show(!open)
      sync()
    })
  })
  function keys(event) {
    if(event.defaultPrevented || event.repeat) return
    if(event.key==='Escape' && available(target)) {
      handle(event)
      show(false)
      sync()
      trigger.focus()
    } else if(event.target===trigger && !trigger.matches(':disabled,[aria-disabled=true]') &&
      (event.key==='ArrowDown' || (!trigger.matches(nativeActivation) && activationKeys.includes(event.key)))) {
      handle(event)
      if(event.key==='ArrowDown') {
        show(!available(target))
        sync()
      } else trigger.click()
    }
  }
  on(trigger,'keydown',keys)
  if(!trigger.contains(target)) on(target,'keydown',keys)
  return sync
}

function arrowNavigation(container,rule,{set,on,retain}) {
  let active=null
  const items=()=>[...container.querySelectorAll(rule.items)].filter(available)
  function sync() {
    const nodes=items()
    retain(nodes)
    active=nodes.includes(active)?active:nodes.find(node=>node.matches('[aria-selected=true],[aria-current=true]'))??nodes[0]
    for(const node of nodes) {
      if(!node.matches(nativeActivation) && !node.hasAttribute('role')) set(node,'role','button')
      set(node,'tabindex',node===active?'0':'-1')
    }
  }
  const previous=rule.orientation==='vertical'?['ArrowUp']:rule.orientation==='horizontal'?['ArrowLeft']:['ArrowUp','ArrowLeft']
  const next=rule.orientation==='vertical'?['ArrowDown']:rule.orientation==='horizontal'?['ArrowRight']:['ArrowDown','ArrowRight']
  on(container,'focusin',event=>{
    const item=event.target.closest(rule.items)
    if(item && items().includes(item)) {active=item;sync()}
  })
  on(container,'keydown',event=>{
    if(event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.matches('input,textarea,select,[contenteditable=true]')) return
    const nodes=items()
    const index=nodes.indexOf(event.target)
    if(index<0) return
    if(!event.target.matches(nativeActivation) && activationKeys.includes(event.key) && !event.repeat) {
      handle(event)
      event.target.click()
      return
    }
    let target
    if(event.key==='Home') target=nodes[0]
    if(event.key==='End') target=nodes.at(-1)
    if(previous.includes(event.key)) target=nodes[(index-1+nodes.length)%nodes.length]
    if(next.includes(event.key)) target=nodes[(index+1)%nodes.length]
    if(!target) return
    handle(event)
    target.focus()
    if(rule.activate==='click') target.click()
  })
  return sync
}

const openDialogs=[]
function dialogBehavior(dialog,rule,{set,on,revert}) {
  let opened=false,opener,lastOutside
  const tabbables=()=>[...dialog.querySelectorAll(focusable)].filter(node=>node.tabIndex>=0 && available(node))
    .sort((left,right)=>(left.tabIndex||32768)-(right.tabIndex||32768))
  function sync() {
    const visible=available(dialog)
    if(opened===visible) return
    opened=visible
    if(opened) {
      const focused=document.activeElement
      opener=(rule.opener && document.querySelector(rule.opener)) ||
        (dialog.contains(focused) || focused===document.body?lastOutside:focused)
      if(!dialog.matches('dialog,[role=dialog],[role=alertdialog]')) set(dialog,'role','dialog')
      set(dialog,'aria-modal','true')
      if(!dialog.hasAttribute('tabindex')) set(dialog,'tabindex','-1')
      openDialogs.push(dialog)
      if(!dialog.closest('[data-curbcut-reader]') && !document.querySelector('[data-curbcut-reader]:modal') && !dialog.contains(focused)) {
        const first=tabbables()[0]??dialog
        first.focus()
      }
    } else close()
  }
  function close() {
    const index=openDialogs.indexOf(dialog)
    if(index<0) return
    const top=openDialogs.at(-1)===dialog
    openDialogs.splice(index,1)
    revert(dialog)
    if(top && available(opener)) opener.focus()
  }
  on(document,'focusin',event=>{
    if(!dialog.contains(event.target) && !event.target.closest('[data-curbcut-reader]')) lastOutside=event.target
  })
  on(document,'keydown',event=>{
    if(event.defaultPrevented || openDialogs.at(-1)!==dialog || event.target.closest?.('[data-curbcut-reader]')) return
    if(event.key==='Escape') {
      const control=rule.close?dialog.querySelector(rule.close):dialog.querySelector('button[aria-label^="Close" i],button[data-dismiss],button[formmethod=dialog],form[method=dialog] button')
      if(available(control) || dialog.matches('dialog[open]')) {
        handle(event)
        if(available(control)) control.click()
        else dialog.close()
      }
    } else if(event.key==='Tab') {
      const nodes=tabbables()
      const index=nodes.indexOf(document.activeElement)
      if(index<0 || (event.shiftKey?index===0:index===nodes.length-1)) {
        handle(event)
        const target=(event.shiftKey?nodes.at(-1):nodes[0])??dialog
        target.focus()
      }
    }
  })
  return {sync,remove:close}
}

function listbox(trigger,list,rule,{set,on,retain}) {
  const items=()=>[...list.querySelectorAll(rule.options)]
  let selected=null,active=null
  button(trigger,set)
  if(!trigger.matches('button') && trigger.getAttribute('role')!=='combobox') set(trigger,'role','button')
  if(!computeAccessibleName(trigger)) {
    const name=trigger.textContent.trim()
    if(name) set(trigger,'aria-label',name)
  }
  set(trigger,'aria-haspopup','listbox')
  set(trigger,'aria-controls',identify(list,set))
  set(list,'role','listbox')
  const show=visibility(list,'display',set,rule)
  function sync() {
    const nodes=items()
    retain([trigger,list,...nodes])
    const opened=available(list)
    set(trigger,'aria-expanded',opened?'true':'false')
    selected=nodes.includes(selected)?selected:nodes.find(node=>node.getAttribute('aria-selected')==='true')
    const usable=nodes.filter(available)
    active=usable.includes(active)?active:usable.includes(selected)?selected:usable[0]
    for(const node of nodes) {
      set(node,'role','option')
      set(node,'tabindex',node===active?'0':'-1')
      set(node,'aria-selected',node===selected?'true':'false')
    }
    if(opened && pendingListFocus.has(trigger)) {
      const preferred=pendingListFocus.get(trigger)==='ArrowUp'?usable.at(-1):active
      pendingListFocus.delete(trigger)
      preferred?.focus()
    }
  }
  on(trigger,'click',event=>{
    if(trigger.matches(':disabled,[aria-disabled=true]')) return
    const opened=available(list)
    queueMicrotask(()=>{
      if(!trigger.isConnected || !list.isConnected) return
      if(available(list)===opened && !event.defaultPrevented) show(!opened)
      sync()
    })
  })
  on(trigger,'keydown',event=>{
    if(event.defaultPrevented || event.repeat || event.target!==trigger || trigger.matches(':disabled,[aria-disabled=true]')) return
    if(event.key==='Escape' && available(list)) {
      handle(event)
      show(false)
      sync()
      return
    }
    const arrow=['ArrowDown','ArrowUp'].includes(event.key)
    if(!arrow && (trigger.matches(nativeActivation) || !activationKeys.includes(event.key))) return
    handle(event)
    if(!available(list) || !arrow) trigger.click()
    if(arrow || !available(list)) queueMicrotask(()=>{
      if(!available(list)) return
      sync()
      const usable=items().filter(available)
      const option=event.key==='ArrowUp'?(selected??usable.at(-1)):active
      option?.focus()
    })
  })
  on(list,'click',event=>{
    const option=event.target.closest(rule.options)
    if(!option || !items().includes(option) || !available(option)) return
    selected=option
    queueMicrotask(()=>{
      if(!trigger.isConnected || !list.isConnected) return
      if(available(list)) show(false)
      sync()
      trigger.focus()
    })
  })
  on(list,'keydown',event=>{
    if(event.defaultPrevented) return
    if(event.key==='Escape') {
      handle(event)
      show(false)
      sync()
      trigger.focus()
      return
    }
    const nodes=items().filter(available)
    const index=nodes.indexOf(event.target)
    if(index<0) return
    if(activationKeys.includes(event.key)) {
      handle(event)
      if(!event.repeat) event.target.click()
      return
    }
    const options={ArrowDown:nodes[(index+1)%nodes.length],ArrowUp:nodes[(index-1+nodes.length)%nodes.length],Home:nodes[0],End:nodes.at(-1)}
    const next=Object.hasOwn(options,event.key)?options[event.key]:null
    if(!next) return
    handle(event)
    active=next
    sync()
    next.focus()
  })
  return sync
}

function dynamicTrigger(trigger,rule,{set,on}) {
  button(trigger,set)
  set(trigger,'aria-expanded','false')
  if(rule.action==='listboxBehavior') set(trigger,'aria-haspopup','listbox')
  on(trigger,'keydown',event=>{
    if(event.target!==trigger || event.defaultPrevented || event.repeat || trigger.matches('a[href],:disabled,[aria-disabled=true]')) return
    const arrow=event.key==='ArrowDown' || rule.action==='listboxBehavior' && event.key==='ArrowUp'
    if(!arrow && (trigger.matches(nativeActivation) || !activationKeys.includes(event.key))) return
    handle(event)
    if(arrow && rule.action==='listboxBehavior') pendingListFocus.set(trigger,event.key)
    trigger.click()
  })
  return {sync(){}}
}

export function installWidget(anchor,rule,target,tools) {
  if(!target && (rule.target || rule.list)) return dynamicTrigger(anchor,rule,tools)
  switch(rule.action) {
    case 'toggleOnActivate': return {sync:disclosure(anchor,target,rule,tools)}
    case 'arrowKeyNavigation': return {sync:arrowNavigation(anchor,rule,tools)}
    case 'dialogBehavior': return dialogBehavior(anchor,rule,tools)
    case 'listboxBehavior': return {sync:listbox(anchor,target,rule,tools)}
  }
}
