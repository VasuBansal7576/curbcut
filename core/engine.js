import validate from './validate.generated.cjs'
import {installWidget,selectorFields,widgetAnchor} from './widgets.js'
import {mirrorHover,mirrorHoverEvents} from './hover.js'

export function wwwTwin(hostname) {
  const bare = hostname.startsWith('www.') ? hostname.slice(4) : hostname
  if (!bare.includes('.') || bare.startsWith('www.') || /^[\d.]+$/.test(bare) || bare.includes(':')) return null
  return hostname === bare ? 'www.'+bare : bare
}

export function match(patch, address) {
  if (!validate(patch)) return false
  try {
    const url = new URL(address)
    const pattern = new URL(patch.match)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || pattern.search || pattern.hash || pattern.username || pattern.password) return false
    if (url.protocol !== pattern.protocol || url.port !== pattern.port || patch.site !== pattern.hostname) return false
    if (url.hostname !== pattern.hostname && url.hostname !== wwwTwin(pattern.hostname)) return false
    const path = pattern.pathname
    return path.endsWith('*') ? url.pathname.startsWith(path.slice(0,-1)) : url.pathname === path
  } catch { return false }
}

const activePatches=new Map()
const bindings=new WeakMap()

function bindProperty(node,key,value,read,write) {
  let fields=bindings.get(node)
  if(!fields) {fields=new Map();bindings.set(node,fields)}
  let field=fields.get(key)
  if(!field) {field={original:read(),layers:[]};fields.set(key,field)}
  const layer={value}
  field.layers.push(layer)
  const sync=()=>{
    if(field.layers.at(-1)!==layer) return
    const actual=read()
    if(actual!==layer.value) write(layer.value)
  }
  sync()
  return {sync,update(value){layer.value=value;sync()},remove(){
    const current=read()
    const isTop=field.layers.at(-1)===layer
    field.layers.splice(field.layers.indexOf(layer),1)
    if(current===layer.value && isTop) write(field.layers.length?field.layers.at(-1).value:field.original)
    if(!field.layers.length) fields.delete(key)
  }}
}

function installWidgetRule(anchor,rule,target) {
  const nodes=new Map()
  const cleanups=[]
  let removed=false
  function set(node,key,value) {
    if(removed) return
    let fields=nodes.get(node)
    if(!fields) {fields=new Map();nodes.set(node,fields)}
    const binding=fields.get(key)
    if(binding) {binding.update(value);return}
    const [type,name]=key.split(':')
    let read,write
    if(type==='style') {
      read=()=>node.style.getPropertyValue(name)+'|'+node.style.getPropertyPriority(name)
      write=next=>{
        const [value,priority]=next.split('|')
        node.style.setProperty(name,value,priority)
      }
      value+='|important'
    } else if(type==='class') {
      read=()=>node.classList.contains(name)
      write=next=>node.classList.toggle(name,next)
    } else {
      read=()=>node.getAttribute(key)
      write=next=>next===null?node.removeAttribute(key):node.setAttribute(key,next)
    }
    const field=bindProperty(node,key.startsWith('style:')?'css:'+name:key.startsWith('class:')?key:'attr:'+key,
      value,read,write)
    if(type==='style') {
      const update=field.update
      field.update=value=>update(value+'|important')
    }
    fields.set(key,field)
  }
  function on(node,type,handler) {
    node.addEventListener(type,handler,true)
    cleanups.push(()=>node.removeEventListener(type,handler,true))
  }
  function revert(node) {
    for(const field of nodes.get(node)?.values()??[]) field.remove()
    nodes.delete(node)
  }
  function retain(current) {
    for(const node of nodes.keys()) if(!current.includes(node)) revert(node)
  }
  const widget=installWidget(anchor,rule,target,{set,on,revert,retain})
  return {target,sync(){
    widget.sync()
    for(const fields of nodes.values()) for(const field of fields.values()) field.sync()
  },remove(){
    removed=true
    widget.remove?.()
    for(const cleanup of cleanups) cleanup()
    for(const node of nodes.keys()) revert(node)
  }}
}

function installRule(node, rule) {
  const undo = []
  const properties=[]
  function attribute(name,value) {
    const binding=bindProperty(node,'attr:'+name,value,()=>node.getAttribute(name),next=>{
      if(next===null) node.removeAttribute(name)
      else node.setAttribute(name,next)
    })
    properties.push(binding)
    undo.push(binding.remove)
  }
  function style(name,value) {
    const original=node.style.getPropertyValue(name)
    const priority=node.style.getPropertyPriority(name)
    const read=()=>node.style.getPropertyValue(name)+'|'+node.style.getPropertyPriority(name)
    node.style.setProperty(name,value,'important')
    const normalized=read()
    node.style.setProperty(name,original,priority)
    const binding=bindProperty(node,'css:'+name,normalized,read,next=>{
      const [nextValue,nextPriority]=next.split('|')
      node.style.setProperty(name,nextValue,nextPriority)
    })
    properties.push(binding)
    undo.push(binding.remove)
  }
  function listen(type,handler) {
    node.addEventListener(type,handler,true)
    undo.push(()=>node.removeEventListener(type,handler,true))
  }
  switch (rule.action) {
    case 'mirrorHoverEventToFocus': undo.push(mirrorHoverEvents(node,rule.value)); break
    case 'addLabel': attribute('aria-label',rule.value); break
    case 'setRole': attribute('role',rule.value); break
    case 'setAltText': attribute('alt',rule.value); break
    case 'setLang': attribute('lang',rule.value); break
    case 'extendTimeout':
      if (node.hasAttribute('data-timeout')) attribute('data-timeout',String(Math.max(Number(node.dataset.timeout)||0,rule.value)))
      break
    case 'makeFocusable':
      if (node.tabIndex < 0 || node.hasAttribute('tabindex') || !node.matches('a[href],button,input,select,textarea,summary,iframe,[contenteditable]:not([contenteditable=false])')) attribute('tabindex','0')
      break
    case 'setContrast':
    case 'injectCSS':
      for (const [name,value] of Object.entries(rule.value)) style(name,value)
      break
    case 'restoreFocusOutline': {
      const outline=()=>{style('outline','3px solid Highlight');style('outline-offset','3px')}
      const restore=()=>{while(undo.length>listeners) undo.pop()(); properties.length=0}
      const listeners=2
      listen('focus',outline)
      listen('blur',restore)
      if (node === document.activeElement) outline()
      break
    }
    case 'bindEnterToClick':
      if (!node.matches('button,input,select,textarea,a[href],summary')) listen('keydown',event=>{
        if (event.target!==node || event.repeat || !['Enter',' '].includes(event.key) || node.getAttribute('aria-disabled')==='true') return
        event.preventDefault()
        node.click()
      })
      break
    case 'removeFocusTrap':
      listen('keydown',event=>{
        if(event.key!=='Escape') return
        if(node instanceof HTMLDialogElement && node.open) {event.preventDefault(); node.close()}
        else {
          const close=node.querySelector('button[aria-label="Close" i],button[data-dismiss],button[formmethod="dialog"]')
          if(close) {event.preventDefault(); close.click()}
        }
      })
      break
  }
  return {sync(){for(const field of properties) field.sync()},remove(){for(const revert of undo.reverse()) revert()}}
}

export function apply(patch,onRuleMatch) {
  if (!match(patch, location.href)) throw new Error('Invalid or out-of-scope patch')
  const signature=JSON.stringify(patch.rules)
  const existing=activePatches.get(patch.id)
  if(existing && existing.signature!==signature) throw new Error('Release the previous revision before applying another.')
  const entry=existing??{signature,leases:0}
  if(!existing) {
    for(const rule of patch.rules) for(const key of selectorFields) if(rule[key]) document.querySelectorAll(rule[key])
    const active=patch.rules.map((rule,index)=>{
      if(rule.action==='mirrorHoverToFocus') return mirrorHover(rule.selector,()=>onRuleMatch?.(index))
      const elements=new Map()
      const widget=Object.hasOwn(widgetAnchor,rule.action)
      const selector=widget?rule[widgetAnchor[rule.action]]:rule.selector
      const targetSelector=rule.target??rule.list
      function sync() {
        const anchors=[...document.querySelectorAll(selector)]
        const scoped=['setAltText','setContrast','setLang'].includes(rule.action) || Boolean(patch.evaluation)
        const applicable=scoped && (anchors.length!==1 ||
          rule.action==='setAltText' && anchors[0]?.localName!=='img' ||
          rule.action==='setLang' && anchors[0]!==document.documentElement)?[]:anchors
        const targets=targetSelector?[...document.querySelectorAll(targetSelector)]:null
        for(const [node,binding] of elements) {
          if(!node.isConnected || (scoped && !applicable.includes(node)) || (widget && (!anchors.includes(node) || (targets && (anchors.length!==1 || targets.length>1 || targets[0]!==binding.target))))) {
            binding.remove()
            elements.delete(node)
          } else binding.sync()
        }
        if(targets && (anchors.length!==1 || targets.length>1)) return
        for(const node of applicable) {
          if(elements.has(node)) continue
          const binding=widget?installWidgetRule(node,rule,targets?.[0]):installRule(node,rule)
          elements.set(node,binding)
          binding.sync()
          onRuleMatch?.(index)
        }
      }
      return {sync,remove(){for(const binding of elements.values()) binding.remove()}}
    })
    const refresh=()=>{for(const rule of active) rule.sync()}
    refresh()
    const observer=new MutationObserver(refresh)
    observer.observe(document,{childList:true,subtree:true,attributes:true,characterData:true})
    entry.close=()=>{
      observer.disconnect()
      for(const rule of active.reverse()) rule.remove()
    }
    activePatches.set(patch.id,entry)
  }
  entry.leases++
  let released=false
  return ()=>{
    if(released) return
    released=true
    if(--entry.leases===0) {entry.close();activePatches.delete(patch.id)}
  }
}
