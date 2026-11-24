const selectorTokens=/\\[\s\S]|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|[()[\],]|:hover(?![\w-])/g

const mirroredEvents=new WeakSet()
const exitEvents={mouseenter:'mouseleave',mouseover:'mouseout',pointerenter:'pointerleave',pointerover:'pointerout'}
export const isMirroredHoverEvent=event=>mirroredEvents.has(event)

export function mirrorHoverEvents(node,type) {
  const view=node.ownerDocument.defaultView
  const EventType=type.startsWith('pointer')?view.PointerEvent:view.MouseEvent
  let focused=false
  function emit(name,relatedTarget) {
    const event=new EventType(name,{bubbles:type.endsWith('over'),composed:true,view,relatedTarget,pointerType:'mouse',isPrimary:true})
    mirroredEvents.add(event)
    node.dispatchEvent(event)
  }
  function enter(event) {
    if(focused || event?.relatedTarget instanceof view.Node && node.contains(event.relatedTarget)) return
    focused=true
    if(!node.matches(':hover')) emit(type,event?.relatedTarget??null)
  }
  function leave(event) {
    if(!focused || event?.relatedTarget instanceof view.Node && node.contains(event.relatedTarget)) return
    focused=false
    if(node.isConnected && !node.matches(':hover')) emit(exitEvents[type],event?.relatedTarget??null)
  }
  node.addEventListener('focusin',enter)
  node.addEventListener('focusout',leave)
  if(node.matches(':focus-within')) enter()
  return ()=>{
    node.removeEventListener('focusin',enter)
    node.removeEventListener('focusout',leave)
    leave()
  }
}

function hoverSelectors(selector,scope) {
  const groups=[]
  let depth=0,start=0,points=[]
  for(const token of selector.matchAll(selectorTokens)) {
    const value=token[0]
    if(value==='(' || value==='[') depth++
    if(value===')' || value===']') depth--
    if(depth!==0) continue
    if(value===',') {
      groups.push({start,end:token.index,points})
      start=token.index+1
      points=[]
    }
    if(value===':hover') points.push(token.index)
  }
  groups.push({start,end:selector.length,points})
  return groups.flatMap(({start,end,points})=>points.flatMap(index=>{
    const before=selector.slice(start,index)
    const suffix=selector.slice(index+6,end)
    const probe=before.replace(/:hover(?![\w-])/g,'')
    const prefix=!probe.trim() || /[\s+>~]$/.test(probe)?probe+'*':probe
    try {
      if(document.querySelector(prefix+':where('+scope+')')) return [before+':focus-within:where('+scope+')'+suffix]
    } catch {}
    return []
  }))
}

export function observedHoverRules(scopes) {
  if(!scopes.length) return []
  const scope=scopes.join(',')
  const visited=new Set(),matched=[]
  function visit(parent,conditions=[]) {
    if(visited.has(parent) || matched.length>=24) return
    visited.add(parent)
    let rules
    try {rules=[...parent.cssRules]} catch {return}
    for(const rule of rules) {
      if(matched.length>=24) break
      if(rule.selectorText?.includes(':hover') && rule.style && hoverSelectors(rule.selectorText,scope).length) {
        matched.push({selector:rule.selectorText.slice(0,400),declarations:rule.style.cssText.slice(0,420),conditions})
      }
      if(rule.styleSheet) visit(rule.styleSheet,conditions)
      if(rule.cssRules) visit(rule,rule.conditionText?[...conditions,rule.conditionText]:conditions)
    }
  }
  for(const sheet of [...document.styleSheets,...document.adoptedStyleSheets]) visit(sheet)
  return matched
}

export function mirrorHover(scope,onMatch) {
  const copies=new Map(),generated=new Set()
  function remove(parent,rule) {
    generated.delete(rule)
    try {
      const index=[...parent.cssRules].indexOf(rule)
      if(index>=0) parent.deleteRule(index)
    } catch {}
  }
  function sync() {
    const seen=new Set(),scanned=new Set()
    function visit(parent) {
      if(scanned.has(parent) || parent.href && new URL(parent.href,location.href).origin!==location.origin) return
      scanned.add(parent)
      let rules
      try {rules=[...parent.cssRules]} catch {return}
      for(const rule of rules) {
        if(generated.has(rule)) continue
        if(rule.styleSheet) visit(rule.styleSheet)
        if(rule.cssRules) visit(rule)
        if(!rule.selectorText?.includes(':hover') || !rule.style) continue
        const selectors=hoverSelectors(rule.selectorText,scope)
        if(!selectors.length) continue
        seen.add(rule)
        const css=selectors.join(',')+'{'+rule.style.cssText+'}'
        const existing=copies.get(rule)
        if(existing?.css===css && [...parent.cssRules].includes(existing.copy)) continue
        if(existing) remove(parent,existing.copy)
        try {
          const index=[...parent.cssRules].indexOf(rule)+1
          parent.insertRule(css,index)
          const copy=parent.cssRules[index]
          generated.add(copy)
          copies.set(rule,{parent,copy,css})
          onMatch()
        } catch {}
      }
    }
    for(const sheet of [...document.styleSheets,...document.adoptedStyleSheets]) visit(sheet)
    for(const [rule,{parent,copy}] of copies) {
      if(seen.has(rule)) continue
      remove(parent,copy)
      copies.delete(rule)
    }
  }
  document.addEventListener('load',sync,true)
  return {sync,remove(){
    document.removeEventListener('load',sync,true)
    for(const {parent,copy} of copies.values()) remove(parent,copy)
  }}
}
