import {computeAccessibleName,getRole,isInaccessible} from 'dom-accessibility-api'

const selector='a[href],button,[role=link],[role=button],input[type=button],input[type=image],img:not([alt]),svg[role=img],[role=img]'
const roles=new Set(['img','link','button'])
const scrub=value=>String(value??'').trim().replace(/\s+/g,' ').slice(0,160)
const excluded='[data-curbcut-reader],[data-curbcut-instant],[data-curbcut-offer]'
const roleOf=node=>node.localName==='img'?(node.hasAttribute('alt')?getRole(node):'img'):getRole(node)
const visible=node=>node.checkVisibility({opacityProperty:true,visibilityProperty:true}) && !isInaccessible(node)

function bounds(node) {
  if(!visible(node)) return null
  const box=node.getBoundingClientRect()
  const xs=[Math.max(0,box.left),Math.min(innerWidth,box.right)],ys=[Math.max(0,box.top),Math.min(innerHeight,box.bottom)]
  if(xs[1]-xs[0]<6 || ys[1]-ys[0]<6 || !node.contains(document.elementFromPoint((xs[0]+xs[1])/2,(ys[0]+ys[1])/2))) return null
  return [xs[0],ys[0],xs[1],ys[1]]
}

function cleanURL(value) {
  try {
    const url=new URL(value,location.href)
    if(!['http:','https:'].includes(url.protocol) || url.username || url.password) return null
    return url.origin+url.pathname
  } catch {return null}
}

export function collectNames(select) {
  const targets=[]
  const titledLinks=new Map()
  for(const anchor of document.querySelectorAll('a[href]')) {
    if(anchor.closest(excluded)) continue
    const name=scrub(anchor.getAttribute('title') || anchor.getAttribute('aria-label') || anchor.textContent)
    if(name) titledLinks.set(cleanURL(anchor.href),name)
  }
  for(const node of document.querySelectorAll(selector)) {
    if(node.closest(excluded) || node.matches(':disabled,[aria-disabled=true]') || node.form && node.type==='submit') continue
    const role=roleOf(node)
    if(!roles.has(role) || computeAccessibleName(node).trim()) continue
    const container=node.parentElement?.closest('a[href],button,[role=link],[role=button]')
    if(role==='img' && container && !computeAccessibleName(container).trim()) continue
    const box=bounds(node)
    if(!box) continue
    const image=node.matches('img')?node:node.querySelector('img')
    if(image && (!image.complete || image.naturalWidth<6 || image.naturalHeight<6)) continue
    const href=node.matches('a[href]')?cleanURL(node.href):null
    const attributes={}
    for(const attr of ['id','class','title','aria-controls','data-action','data-testid']) {
      const svg=node.matches('svg')?node:node.querySelector('svg')
      const value=scrub([node.getAttribute(attr),svg && svg!==node?svg.getAttribute(attr):null].filter(Boolean).join(' '))
      if(value) attributes[attr]=value
    }
    const controlled=document.getElementById(node.getAttribute('aria-controls')??'')
    const icon=node.querySelector('use')
    const context=scrub(node.parentElement?.innerText)
    const targetTitle=href && (href===location.origin+'/' && location.pathname==='/'?scrub(document.title):titledLinks.get(href))
    const imageSelector=image===node?select(node):null
    const target={role,selector:select(node),imageSelector,box,href,host:location.hostname,
      source:image?cleanURL(image.currentSrc):null,iconTitle:scrub(node.querySelector('svg title,title')?.textContent),
      iconId:scrub((icon?.getAttribute('href')??icon?.getAttribute('xlink:href'))?.split('#').at(-1)),
      heading:scrub(node.closest('header,main,article,nav,section,figure,footer')?.querySelector('h1,h2,h3')?.innerText),
      caption:scrub(node.closest('figure')?.querySelector('figcaption')?.innerText),
      controlled:scrub(controlled?.getAttribute('aria-label') || controlled?.querySelector('h1,h2,h3')?.innerText),
      context,attributes,targetTitle}
    if(document.querySelectorAll(target.selector).length===1) targets.push(target)
  }
  return {language:document.documentElement.lang,targets,viewport:{width:innerWidth,height:innerHeight}}
}

export function visibleLanguageSample() {
  const main=document.querySelector('main,[role=main],article')
  const text=(main?.innerText?.length??0)>=130?main.innerText:document.body?.innerText
  return (text??'').trim().replace(/\s+/g,' ').slice(0,2048)
}

export function applyLiveName(node,role,name) {
  if(!node?.isConnected || roleOf(node)!==role || computeAccessibleName(node).trim() || name==null) return null
  if(name==='' && (!node.matches('img') || role!=='img')) return null
  const attr=node.matches('img')?'alt':'aria-label'
  if(attr==='alt' && node.hasAttribute(attr)) return null
  const prior=node.getAttribute(attr)
  node.setAttribute(attr,name)
  return ()=>{
    if(node.getAttribute(attr)!==name) return
    if(prior===null) node.removeAttribute(attr)
    else node.setAttribute(attr,prior)
  }
}
