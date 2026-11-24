import {computeAccessibleName,getRole,isInaccessible} from 'dom-accessibility-api'

const excluded='[data-curbcut-reader],[data-curbcut-instant],[data-curbcut-offer],[data-curbcut-glance],[data-curbcut-finder],[data-curbcut-state]'
const controlSelector=[
  '[role=tab]','[role=checkbox]','[role=switch]','[role=radio]','[role=option]',
  '[aria-expanded]','[aria-selected]','[aria-current]','[aria-checked]','[aria-invalid]','[aria-haspopup]',
  'summary','nav a[href]','[role=navigation] a[href]','[role=tablist] *',
  '[class*=paginat i] a[href],[class*=pager i] a[href]',
  'button,[role=button]',
  'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]):not([type=file])',
  'select','[class*=tab i]','[class*=check i]','[class*=invalid i]','[class*=disabled i]'
].join(',')
const scrub=value=>String(value??'').trim().replace(/\s+/g,' ').slice(0,140)
const visible=node=>node.checkVisibility({opacityProperty:true,visibilityProperty:true}) && !isInaccessible(node)

function bounds(node) {
  if(!visible(node) || node.closest(excluded)) return null
  const box=node.getBoundingClientRect()
  const left=Math.max(0,box.left),right=Math.min(innerWidth,box.right)
  const top=Math.max(0,box.top),bottom=Math.min(innerHeight,box.bottom)
  if(right-left<8 || bottom-top<8) return null
  const hit=document.elementFromPoint((left+right)/2,(top+bottom)/2)
  if(!hit || !node.contains(hit) && !hit.contains(node) && hit!==node) return null
  return [left,top,right,bottom]
}

function cleanURL(value) {
  try {
    const url=new URL(value,location.href)
    if(!['http:','https:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {return null}
}

function looksInvalid(node) {
  const cls=String(node.className??'')
  if(node.hasAttribute('aria-invalid') || /invalid|error|bad/i.test(cls)) return true
  const rgb=getComputedStyle(node).borderTopColor.match(/\d+/g)?.map(Number)??[]
  return rgb.length>=3 && rgb[0]>rgb[1]+40 && rgb[0]>rgb[2]+40 && rgb[0]>120
}

function score(node,role) {
  let value=0
  if(['tab','checkbox','switch','radio'].includes(role)) value+=8
  if(node.closest('[role=tablist],.tabs') && node.matches('button,[role=tab],a,[class*=tab i]')) value+=8
  if(node.hasAttribute('aria-expanded') || node.hasAttribute('aria-haspopup') || node.matches('summary')) value+=5
  if(node.hasAttribute('aria-selected') || node.hasAttribute('aria-current')) value+=5
  if(node.hasAttribute('aria-checked')) value+=5
  if(looksInvalid(node)) value+=6
  if(node.closest('nav,[role=navigation],[role=tablist],[class*=paginat i],[class*=pager i]')) value+=4
  if(node.matches('[class*=tab i],[class*=check i],[class*=disabled i]')) value+=2
  if(node.matches('input,select,textarea')) value+=3
  return value
}

function domState(node,role) {
  const current=node.getAttribute('aria-current')
  const selected=node.getAttribute('aria-selected')==='true' ||
    Boolean(current && current!=='false')
  const expanded=node.getAttribute('aria-expanded')==='true' ||
    Boolean(node.closest('details')?.open && node.matches('summary,details'))
  const checked=node.getAttribute('aria-checked')==='true' || node.matches('input:checked')
  const disabled=node.getAttribute('aria-disabled')==='true' || node.matches(':disabled')
  const invalid=node.getAttribute('aria-invalid')==='true'
  return {
    role,selected,expanded,checked,disabled,invalid,
    nativeChecked:node.matches('input[type=checkbox],input[type=radio]'),
    nativeDisabled:node.matches(':disabled'),
    describedby:node.getAttribute('aria-describedby')
  }
}

function nearbyText(node,select) {
  const box=node.getBoundingClientRect()
  const seen=new Set()
  const candidates=[]
  for(const el of document.querySelectorAll('[role=alert],[role=status],.error,[class*=error i],[class*=invalid i],[id*=error i],label,[data-error]')) {
    if(el===node || node.contains(el) || el.contains(node) || el.closest(excluded)) continue
    const text=scrub(el.innerText)
    const key=text.toLowerCase()
    if(text.length<3 || seen.has(key)) continue
    const b=el.getBoundingClientRect()
    if(b.width<4 || b.height<4 || b.bottom<0 || b.top>innerHeight) continue
    const dx=Math.max(0,b.left-box.right,box.left-b.right)
    const dy=Math.max(0,b.top-box.bottom,box.top-b.bottom)
    if(dx>260 || dy>180) continue
    const selector=select(el)
    if(document.querySelectorAll(selector).length!==1) continue
    seen.add(key)
    candidates.push({text,selector,dist:dx+dy})
  }
  return candidates.sort((a,b)=>a.dist-b.dist).slice(0,6).map(({text,selector})=>({text,selector}))
}

export function collectVisualState(select) {
  const ranked=[]
  for(const node of document.querySelectorAll(controlSelector)) {
    if(node.closest(excluded)) continue
    const box=bounds(node)
    if(!box) continue
    const role=getRole(node) || node.localName
    if(['tablist','navigation','menu','menubar','list','group','toolbar'].includes(role)) continue
    const value=score(node,role)
    if(value<2) continue
    const selector=select(node)
    if(document.querySelectorAll(selector).length!==1) continue
    ranked.push({node,role,box,selector,value})
  }
  ranked.sort((a,b)=>b.value-a.value || a.box[1]-b.box[1])
  const leaves=ranked.filter(item=>!ranked.some(other=>other.node!==item.node && item.node.contains(other.node)))
  const seen=new Set()
  const targets=[]
  for(const item of leaves) {
    if(seen.has(item.selector) || targets.length>=12) continue
    seen.add(item.selector)
    const current=Boolean(item.node.closest('nav,[role=navigation],[class*=paginat i],[class*=pager i]') && item.role!=='tab')
    const selectable=current || item.role==='tab' || item.role==='option' ||
      Boolean(item.node.closest('[role=tablist],nav,[role=navigation],[class*=paginat i],[class*=pager i]'))
    const name=scrub(computeAccessibleName(item.node) || item.node.innerText)
    targets.push({
      selector:item.selector,role:item.role,box:item.box,current,selectable,name,
      dom:domState(item.node,item.role),
      nearby:nearbyText(item.node,select)
    })
  }
  return {language:document.documentElement.lang,targets,viewport:{width:innerWidth,height:innerHeight}}
}

export function applyVisualState(node,accepted) {
  if(!node?.isConnected || !accepted?.changes && !accepted?.describedbySelector) return null
  const restore={}
  const changes={...(accepted.changes||{})}
  if(accepted.describedbySelector) {
    const error=document.querySelector(accepted.describedbySelector)
    if(error && error.isConnected) {
      if(!error.id) {
        const addedId='curbcut-err-'+crypto.randomUUID().slice(0,8)
        restore.errorId={node:error,id:null}
        error.id=addedId
      }
      const id=error.id
      restore['aria-describedby']=node.hasAttribute('aria-describedby')?node.getAttribute('aria-describedby'):null
      const ids=new Set((node.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean))
      ids.add(id)
      node.setAttribute('aria-describedby',[...ids].join(' '))
    }
  }
  for(const [attr,value] of Object.entries(changes)) {
    if(attr in restore) continue
    restore[attr]=node.hasAttribute(attr)?node.getAttribute(attr):null
    node.setAttribute(attr,value)
  }
  return ()=>{
    if(!node.isConnected) return
    for(const [attr,value] of Object.entries(restore)) {
      if(attr==='errorId') {
        if(value.id==null) value.node.removeAttribute('id')
        else value.node.id=value.id
        continue
      }
      if(value==null) node.removeAttribute(attr)
      else node.setAttribute(attr,value)
    }
  }
}

export function collectPageLinks(select) {
  const links=[]
  const seen=new Set()
  for(const node of document.querySelectorAll('a[href]')) {
    if(node.closest(excluded)) continue
    const href=cleanURL(node.href)
    if(!href || href===location.href) continue
    const text=scrub(node.getAttribute('aria-label') || node.textContent || node.getAttribute('title') || href)
    if(text.length<2) continue
    const key=text.toLowerCase()+'|'+href
    if(seen.has(key)) continue
    seen.add(key)
    const selector=select?select(node):null
    links.push({
      href,text,selector,
      hidden:!visible(node),
      id:'l'+links.length
    })
    if(links.length>=80) break
  }
  return links
}

export function literalFind(query,links) {
  const terms=String(query??'').toLowerCase().trim().split(/\s+/).filter(term=>term.length>1)
  if(!terms.length) return []
  return links.filter(link=>{
    const hay=(link.text+' '+link.href).toLowerCase()
    return terms.every(term=>hay.includes(term))
  })
}

export function finderCandidates(query,links) {
  const literal=literalFind(query,links)
  if(literal.length) return {literal,candidates:[]}
  const terms=String(query??'').toLowerCase().trim().split(/\s+/).filter(term=>term.length>1)
  const scored=links.map(link=>{
    const hay=(link.text+' '+link.href).toLowerCase()
    const hits=terms.filter(term=>hay.includes(term)).length
    return {link,hits}
  }).sort((a,b)=>b.hits-a.hits || a.link.text.length-b.link.text.length)
  const picked=[]
  const seen=new Set()
  for(const {link} of scored) {
    if(seen.has(link.href)) continue
    seen.add(link.href)
    picked.push(link)
    if(picked.length===24) break
  }
  return {literal:[],candidates:picked}
}

export function focusFromBox(box) {
  if(!box) return null
  const x=((box.left+box.right)/2)*innerWidth
  const y=((box.top+box.bottom)/2)*innerHeight
  let node=document.elementFromPoint(x,y)
  if(!node || node.closest(excluded)) return null
  return focusGlanceNode(node.closest('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"]),[role=button],[role=link],[role=tab]')
    || node.closest('main,[role=main],article,section,header,nav') || node)
}

function area(node) {
  const box=node.getBoundingClientRect()
  return Math.max(0,Math.min(innerWidth,box.right)-Math.max(0,box.left))*Math.max(0,Math.min(innerHeight,box.bottom)-Math.max(0,box.top))
}

export function glanceMain() {
  const landmark=[...document.querySelectorAll('main,[role=main]')].find(node=>visible(node) && !node.closest(excluded))
  if(landmark) return landmark
  const ranked=[...document.querySelectorAll('article,[role=article],#content,#main,.content,.main')]
    .filter(node=>visible(node) && !node.closest(excluded) && !node.closest('header,nav,footer,aside,[role=banner],[role=navigation],[role=contentinfo],[role=complementary]'))
    .sort((a,b)=>area(b)-area(a))
  return ranked[0]||null
}

export function glanceRegions() {
  const pick=selector=>[...document.querySelectorAll(selector)].find(node=>visible(node) && !node.closest(excluded))||null
  return {
    dialog:pick('dialog[open],[role=dialog],[aria-modal=true],.modal,[class*=modal i]'),
    cookie:pick('[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[class*=gdpr i]'),
    error:pick('[role=alert],.error,[class*=error i]'),
    main:glanceMain()
  }
}

export function focusGlanceNode(node) {
  if(!node?.isConnected) return null
  if(node.tabIndex<0 && !node.matches('a[href],button,input,select,textarea,summary')) node.tabIndex=-1
  try {node.focus({preventScroll:false})} catch {return null}
  return node
}
