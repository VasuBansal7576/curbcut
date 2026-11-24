import {computeAccessibleName} from 'dom-accessibility-api'
import {keyboardVisibility} from './geometry.js'

const interactive='a[href],button,summary,input:not([type=hidden]),select,textarea,[role=link],[role=button],[tabindex],[onclick]'
const unsafe=/\b(?:log\s*in|sign\s*(?:in|up)|register|check\s*out|payment|password|account|purchase|donate|subscribe|submit|send)\b/i
const clean=(value,length=90)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,length)
const direct=node=>[...node?.childNodes??[]].filter(child=>child.nodeType===3).map(child=>child.textContent).join(' ')
const words=value=>clean(value?.replace(/\.(?:html?|aspx|php|jpe?g|png|svg|webp|gif)$/i,'').replace(/[-_.+]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2'))
const named=value=>/[\p{L}]{2}/u.test(value) && !/^(?:img|image|photo|icon|btn|link|button|menu item|untitled|dsc|px)(?:\s*\d+)?$/i.test(value)
const insideView=(box,width)=>box.bottom>0 && box.top<innerHeight && box.right>0 && box.left<width
const enabled=node=>!node.closest('[inert],[aria-hidden=true],[data-curbcut-reader],[data-curbcut-instant]') && !node.matches(':disabled,[aria-disabled=true]')

function linkWords(node,name) {
  try {
    const url=new URL(node.getAttribute(name),location.href)
    if(!node.hasAttribute(name) || !['http:','https:'].includes(url.protocol)) return ''
    return words(decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1)??''))
  } catch {return ''}
}

function nameOptions(node) {
  const image=node.localName==='img'?node:node.querySelector('img')
  const link=node.closest('a[href]')
  const options=[
    [node.getAttribute('title'),'element title'],
    [node.getAttribute('placeholder'),'input placeholder'],
    ...[...node.labels??[]].map(label=>[label.textContent,'associated label']),
    [node.querySelector('svg title')?.textContent,'icon title'],
    [image?.getAttribute('title'),'image title'],
    [link?.getAttribute('title'),'link title'],
    [link && linkWords(link,'href'),'destination path'],
    [image && linkWords(image,'src'),'image filename'],
    [direct(node.previousElementSibling) || direct(node.nextElementSibling),'adjacent text'],
    [direct(node.parentElement),'parent text'],
    [words(node.getAttribute('aria-controls') || node.id || node.getAttribute('name')),'control identifier']
  ]
  const unique=new Set()
  return options.flatMap(([text,source])=>{
    text=clean(text,120)
    const key=text.toLowerCase()
    if(!named(text) || unique.has(key) || unsafe.test(text)) return []
    unique.add(key)
    return [{text,source}]
  }).slice(0,10)
}

function hoverSelectors() {
  const found=[]
  const visited=new Set()
  function visit(parent) {
    if(visited.has(parent) || found.length>=100) return
    visited.add(parent)
    let rules
    try {rules=parent.cssRules} catch {return}
    for(const rule of rules??[]) {
      if(found.length>=100) break
      if(rule.selectorText?.includes(':hover') && /(?:display|visibility|opacity|transform|clip|height|left|top)/.test(rule.style?.cssText??'')) {
        for(const selector of rule.selectorText.split(',')) {
          const [owner,descendant]=selector.split(/:hover(?![\w-])/)
          if(owner?.trim() && /^(\s|[>+~])/.test(descendant??'') && descendant.trim()) {
            try {document.querySelector(owner);found.push(owner.trim())} catch {}
          }
        }
      }
      if(rule.styleSheet) visit(rule.styleSheet)
      if(rule.cssRules) visit(rule)
    }
  }
  for(const sheet of [...document.styleSheets,...document.adoptedStyleSheets]) visit(sheet)
  return [...new Set(found)]
}

function hoverEvent(node) {
  return ['mouseenter','pointerenter','mouseover','pointerover'].find(type=>typeof node['on'+type]==='function')
}

function styleRepair(node,style,box,width) {
  const size={}
  if(box.width>width+1 || node.clientWidth>width+1 || parseFloat(style.minWidth)>width) {
    Object.assign(size,{'min-width':'0','max-width':'100%',width:'auto','box-sizing':'border-box'})
    if(box.left>width*.4 && ['absolute','fixed','sticky'].includes(style.position)) return null
  }
  if(style.display.includes('grid')) size['grid-template-columns']='minmax(0, 1fr)'
  if(style.display.includes('flex') && style.flexDirection.startsWith('row')) size['flex-wrap']='wrap'
  if(/^(?:nowrap|pre)$/.test(style.whiteSpace) || node.scrollWidth>node.clientWidth+4 && node.children.length===0) {
    size['white-space']=style.whiteSpace==='pre'?'pre-wrap':'normal'
    size['overflow-wrap']='anywhere'
  }
  if(node.matches('table,pre,code,p') && box.right>width+1) size['overflow-wrap']='anywhere'
  return Object.keys(size).length?size:null
}

export function instantPrivacy() {
  if(!document.body || document.designMode==='on') return false
  if(document.querySelector('input[type=password], input[autocomplete^=cc-], [role=textbox][contenteditable=true]')) return false
  if(/\b(?:verify (?:that )?you are (?:a )?human|security check|access denied|checking your browser)\b/i.test(document.title)) return false
  return ![...document.querySelectorAll('input,textarea,[contenteditable=true]')].some(node=>{
    if(!node.getClientRects().length) return false
    if(node.matches('input[type=checkbox],input[type=radio],input[type=range],input[type=button],input[type=submit],input[type=reset],input[type=hidden]')) return false
    return Boolean(node.isContentEditable ? node.textContent.trim() : node.value)
  })
}

export function collectInstantState(exactSelector) {
  const width=document.documentElement.clientWidth || innerWidth
  const focused=document.activeElement===document.body?null:document.activeElement
  const context=[focused,focused?.parentElement,focused?.previousElementSibling,focused?.nextElementSibling,...[...focused?.children??[]].slice(0,4)].filter(Boolean)
  const near=new Set(context)
  const candidates=[]
  const visibility=new WeakMap()
  const relevant=node=> !focused?0: node===focused?75: near.has(node) || (node!==document.body && node.contains(focused))?42:node.parentElement===focused.parentElement?22:0
  function visible(node) {
    if(!visibility.has(node)) visibility.set(node,node.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))
    return visibility.get(node)
  }
  function collect(node,actions,details,score) {
    const box=node.getBoundingClientRect()
    const onScreen=insideView(box,width)
    if(!onScreen && !relevant(node) && !details.menu) return
    candidates.push({node,actions,details,score:score+relevant(node)+(onScreen?10-Math.min(8,box.y/innerHeight*8):0),
      box:[box.left,box.top,box.width,box.height].map(Math.round)})
  }

  const cssOwners=hoverSelectors()
  const menuNodes=new Map()
  const controls=[...document.querySelectorAll(interactive+',img')].slice(0,2500)
  for(const node of controls) {
    if(!enabled(node) || node.matches('input[type=file],input[type=hidden],button[type=submit],input[type=submit]')) continue
    const box=node.getBoundingClientRect()
    if(!insideView(box,width) && !relevant(node) && node.tabIndex<0) continue
    const shown=visible(node)
    const invisible=(!shown || Boolean(keyboardVisibility(node))) && node.matches('a[href],[role=menuitem]') && node.tabIndex>=0
    if(invisible) {
      for(let owner=node.parentElement,depth=0;owner && depth<5;owner=owner.parentElement,depth++) {
        const event=hoverEvent(owner)
        const css=cssOwners.some(selector=>owner.matches(selector))
        if(!event && !css) continue
        const trigger=owner.querySelector('a[href],button,[tabindex]')
        if(trigger===node || !trigger || !visible(trigger) || !insideView(trigger.getBoundingClientRect(),width) && !relevant(owner)) continue
        const found=menuNodes.get(owner)??{event,css,trigger,items:[]}
        if(found.items.length<4) found.items.push(clean(node.textContent,45)||linkWords(node,'href'))
        menuNodes.set(owner,found)
        break
      }
    }
    if(!shown || !insideView(box,width) && !relevant(node)) continue
    const actions={}
    const name=clean(computeAccessibleName(node))
    const style=getComputedStyle(node)
    const interactiveNode=node.matches(interactive)
    const uncapturedClick=!node.matches('a[href],button,input,select,textarea,summary') && !node.closest('form') &&
      (node.hasAttribute('onclick') || typeof node.onclick==='function' || node.matches('[role=button]') && style.cursor==='pointer')
    if(uncapturedClick && node.tabIndex<0 && !unsafe.test(name+' '+clean(node.textContent))) actions.makeFocusable=true
    const names=(!name && interactiveNode || node.localName==='img' && !node.hasAttribute('alt'))?nameOptions(node):[]
    if(names.length) actions[node.localName==='img'?'setAltText':'addLabel']=true
    if(Object.keys(actions).length) collect(node,actions,{name,names},names.length?17:30)
  }
  for(const [node,{event,css,trigger,items}] of menuNodes) {
    const actions={...(css?{mirrorHoverToFocus:true}:{}),...(event?{mirrorHoverEventToFocus:event}:{})}
    collect(node,actions,{name:clean(computeAccessibleName(trigger)||trigger.textContent),menu:items},42)
  }
  if(width<1000 || document.documentElement.scrollWidth>width+4) {
    for(const node of [...document.querySelectorAll('main,article,section,div,p,pre,td,table,code,ul,figure,header,nav')].slice(0,2200)) {
      const box=node.getBoundingClientRect()
      if(!insideView(box,width) || box.width<18 || box.height<10 || box.right<=width+3 && node.scrollWidth<=node.clientWidth+3 || !visible(node) || !enabled(node)) continue
      const style=getComputedStyle(node)
      if(style.overflowX==='auto' && width>=1000 || style.display==='inline') continue
      const repair=styleRepair(node,style,box,width)
      if(!repair) continue
      const text=clean(direct(node)||node.querySelector('h1,h2,h3,p,pre')?.textContent,80)
      if(!text && !node.childElementCount) continue
      collect(node,{reflow:repair},{name:text,layout:style.display,width:Math.round(box.width),scrollWidth:node.scrollWidth},(width<=500?26:3)+(box.left<width*.25?6:0)+(box.left<width*.25 && box.width>width+30?9:0)+
        (node.matches('main,article,p,pre,table')?5:0)-Math.min(8,Math.abs(box.top+box.height/2-innerHeight/2)/innerHeight*8))
    }
  }
  const nodes=new Map()
  const rows=[]
  for(const {node,actions,details,box} of candidates.sort((a,b)=>b.score-a.score)) {
    const selector=exactSelector(node)
    if(selector.length>280 || nodes.has(selector) || document.querySelectorAll(selector).length!==1) continue
    nodes.set(selector,node)
    rows.push({id:'c'+rows.length,selector,tag:node.localName,box,relation:node===focused?'focused':relevant(node)>0?'near focus':'visible page',actions,...details})
    if(rows.length===16) break
  }
  return {
    state:{url:location.origin+location.pathname,width,height:innerHeight,title:clean(document.title,100),focus:focused?{tag:focused.localName,name:clean(computeAccessibleName(focused)||direct(focused))}:null,
      nearby:context.filter(node=>!node.matches('body,html')).map(node=>({tag:node.localName,text:clean(computeAccessibleName(node)||direct(node),60)})),
      candidates:rows},
    nodes
  }
}
