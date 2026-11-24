export function pageSignals() {
  const visible=node=>{
    const box=node.getBoundingClientRect()
    return box.width>=8 && box.height>=8 && box.bottom>0 && box.top<innerHeight && box.right>0 && box.left<innerWidth &&
      node.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})
  }
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim().slice(0,80)
  const nameOf=node=>{
    const labelled=node.getAttribute('aria-labelledby')
    if(node.getAttribute('aria-label')?.trim()) return node.getAttribute('aria-label').trim()
    if(labelled) {
      const text=labelled.split(/\s+/).map(id=>document.getElementById(id)?.textContent).join(' ').trim()
      if(text) return text
    }
    if(node.labels?.length) return [...node.labels].map(label=>label.textContent).join(' ').trim()
    if(node.localName==='img' && node.hasAttribute('alt')) return node.getAttribute('alt')??''
    if(node.matches('button,a,[role=button],[role=link],summary') && clean(node.textContent)) return clean(node.textContent)
    if(node.getAttribute('title')?.trim()) return node.getAttribute('title').trim()
    return ''
  }

  const hover=[]
  const seenSheets=new Set()
  function visit(sheet) {
    if(!sheet || seenSheets.has(sheet) || hover.length>=24) return
    seenSheets.add(sheet)
    let rules
    try {rules=sheet.cssRules} catch {return}
    for(const rule of rules??[]) {
      if(hover.length>=24) break
      if(rule.styleSheet) visit(rule.styleSheet)
      if(rule.cssRules) visit(rule)
      if(!rule.selectorText?.includes(':hover') || !/(?:display|visibility|opacity|transform|clip|height|max-height|left|top|right|bottom)/.test(rule.style?.cssText??'')) continue
      for(const selector of rule.selectorText.split(',')) {
        const [owner,descendant]=selector.split(/:hover(?![\w-])/)
        if(owner?.trim() && /^(\s|[>+~])/.test(descendant??'') && descendant.trim()) {
          try {document.querySelector(owner);hover.push(clean(selector))} catch {}
        }
      }
    }
  }
  for(const sheet of [...document.styleSheets,...document.adoptedStyleSheets]) visit(sheet)

  const unnamed=[]
  for(const node of document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]),select,textarea,button,[role=button],[role=link],a[href]')) {
    if(!visible(node) || unnamed.length>=12) continue
    if(node.matches('button,[role=button],a,[role=link]') && node.querySelector('svg,img,i') && !nameOf(node)) {
      unnamed.push({tag:node.localName,role:node.getAttribute('role')||node.localName});continue
    }
    if(!nameOf(node)) unnamed.push({tag:node.localName,type:node.getAttribute('type')||undefined})
  }

  const missingAlt=[...document.querySelectorAll('img')].filter(node=>visible(node) && !node.hasAttribute('alt') && node.naturalWidth>=12).slice(0,8)
    .map(node=>({w:node.naturalWidth,h:node.naturalHeight}))

  const contrast=globalThis.CurbCut?.discoverCoverage?.()??null
  const lang=(document.documentElement.getAttribute('lang')??'').trim()
  const width=document.documentElement.clientWidth||innerWidth
  const overflow=document.documentElement.scrollWidth>width+8
  const wide=[...document.querySelectorAll('main,article,section,div,p,pre,table,code')].filter(node=>{
    if(!visible(node)) return false
    const box=node.getBoundingClientRect()
    return box.width>width+8 || node.scrollWidth>node.clientWidth+8
  }).length

  const toggles=[...document.querySelectorAll('[aria-expanded]')].filter(node=>{
    if(!visible(node)) return false
    return !node.matches('button,summary,a[href],[role=button],[role=tab]')
  }).slice(0,8).map(node=>({tag:node.localName,expanded:node.getAttribute('aria-expanded')}))

  const widgets=[...document.querySelectorAll('[role=tablist],[role=listbox],[role=radiogroup],[role=menu],[role=menubar]')].filter(visible).slice(0,8)
    .map(node=>({role:node.getAttribute('role'),tabindex:node.tabIndex}))

  const pointerClicks=[...document.querySelectorAll('div,span,li,td')].filter(node=>{
    if(!visible(node) || node.closest('a[href],button,input,select,textarea,label')) return false
    const role=(node.getAttribute('role')||'').toLowerCase()
    if(['button','link','menuitem','tab'].includes(role)) return false
    if(node.hasAttribute('tabindex') && node.tabIndex>=0) return false
    return node.hasAttribute('onclick') || typeof node.onclick==='function' || getComputedStyle(node).cursor==='pointer'
  }).slice(0,12).map(node=>({tag:node.localName,cursor:getComputedStyle(node).cursor}))

  return {
    title:clean(document.title,120),
    lang:lang||null,
    hoverCount:hover.length,hover:hover.slice(0,6),
    unnamedCount:unnamed.length,unnamed:unnamed.slice(0,6),
    missingAltCount:missingAlt.length,
    contrastHit:Boolean(contrast?.contrast),
    contrastText:contrast?.contrast?.text?clean(contrast.contrast.text,60):null,
    missingLang:!lang,
    overflow,wideCount:wide,
    toggleCount:toggles.length,toggles:toggles.slice(0,4),
    widgetCount:widgets.length,widgets:widgets.slice(0,4),
    pointerClickCount:pointerClicks.length,pointerClicks:pointerClicks.slice(0,4),
    emptyLink:Boolean(contrast?.names?.some(row=>row.category==='empty-link')),
    emptyButton:Boolean(contrast?.names?.some(row=>row.category==='empty-button')),
    coverageAlt:Boolean(contrast?.names?.some(row=>row.category==='missing-alt'))
  }
}

export async function clickListenerHits(page) {
  const session=await page.context().newCDPSession(page)
  try {
    await session.send('Runtime.enable')
    const {result}=await session.send('Runtime.evaluate',{
      expression:`(() => {
        const native='a[href],button,input,select,textarea,summary,label,option'
        const nodes=[]
        for(const el of document.querySelectorAll('div,span,li,td,p,nav,header,section,article,i,svg,img')) {
          if(nodes.length>=70) break
          if(el.closest(native)) continue
          const role=(el.getAttribute('role')||'').toLowerCase()
          if(['button','link','menuitem','tab','checkbox','switch','option','textbox'].includes(role)) continue
          const ti=el.getAttribute('tabindex')
          if(ti!==null && Number(ti)>=0) continue
          const box=el.getBoundingClientRect()
          if(box.width<10 || box.height<10 || box.bottom<0 || box.top>innerHeight || box.right<0 || box.left>innerWidth) continue
          if(!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) continue
          nodes.push(el)
        }
        return nodes
      })()`,
      objectGroup:'census-clicks'
    })
    if(!result?.objectId) return []
    const {result:props}=await session.send('Runtime.getProperties',{objectId:result.objectId,ownProperties:true})
    const hits=[]
    for(const prop of props) {
      if(!/^\d+$/.test(prop.name) || !prop.value?.objectId) continue
      let listeners
      try {({listeners}=await session.send('DOMDebugger.getEventListeners',{objectId:prop.value.objectId}))} catch {continue}
      const click=(listeners||[]).filter(listener=>['click','mousedown','mouseup','pointerdown','pointerup'].includes(listener.type))
      if(!click.length) continue
      hits.push({types:[...new Set(click.map(listener=>listener.type))]})
      if(hits.length>=15) break
    }
    return hits
  } finally {
    await session.send('Runtime.releaseObjectGroup',{objectGroup:'census-clicks'}).catch(()=>{})
    await session.detach().catch(()=>{})
  }
}

export function recipeSignals(raw,clicks) {
  const clickCount=(clicks?.length??0)+ (raw.pointerClickCount||0)
  const unnamed=raw.unnamedCount||0
  const hover=raw.hoverCount||0
  const contrast=Boolean(raw.contrastHit)
  const alt=(raw.missingAltCount||0)>0 || raw.coverageAlt
  const lang=Boolean(raw.missingLang)
  const reflow=Boolean(raw.overflow) || (raw.wideCount||0)>0
  const toggle=(raw.toggleCount||0)>0
  const arrows=(raw.widgetCount||0)>0
  return {
    'clickable-div-as-button':{hit:clickCount>0,count:clickCount,types:[...new Set((clicks??[]).flatMap(hit=>hit.types))].slice(0,4)},
    'hover-only-menu':{hit:hover>0,count:hover,examples:(raw.hover??[]).slice(0,3)},
    'unnamed-field':{hit:unnamed>0 || raw.emptyLink || raw.emptyButton,count:unnamed+(raw.emptyLink?1:0)+(raw.emptyButton?1:0)},
    setContrast:{hit:contrast,count:contrast?1:0,text:raw.contrastText||undefined},
    setAltText:{hit:alt,count:raw.missingAltCount||0},
    setLang:{hit:lang,count:lang?1:0,lang:raw.lang},
    reflow:{hit:reflow,count:raw.wideCount||0,overflow:raw.overflow},
    'toggle-on-activate':{hit:toggle,count:raw.toggleCount||0},
    'arrow-key-navigation':{hit:arrows,count:raw.widgetCount||0},
    'clickable-without-role':{hit:clickCount>0,count:clickCount},
    'focusable-toggle':{hit:toggle,count:raw.toggleCount||0},
    'named-clickable-div':{hit:clickCount>0 && (unnamed>0 || raw.emptyButton),count:Math.min(clickCount,unnamed||1)}
  }
}

export function wallReason(title,body,password,authForm) {
  const text=`${title}\n${body}`.slice(0,2400)
  if(password && /\b(?:log\s*in|sign\s*in|sign\s*up|authenticate|authentication|password)\b/i.test(text)) return 'Login wall'
  if(authForm) return 'Login form'
  return null
}
