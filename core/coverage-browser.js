import {computeAccessibleName,getRole,isInaccessible} from 'dom-accessibility-api'
import {contrastModel,measureContrast} from './contrast.js'

const clean=value=>(value??'').trim().replace(/\s+/g,' ')
const namesSelector='a[href],button,[role=link],[role=button],input[type=button],input[type=image],img:not([alt])'
const blockNames=/\b(?:log.?in|sign.?in|sign.?up|checkout|subscribe|donate|register|pay|account|submit|send)\b/i

function onsite(node) {
  const box=node.getBoundingClientRect()
  if(box.width<13 || box.height<13 || box.top>=innerHeight || box.bottom<=0 || box.right<=0 || box.left>=innerWidth ||
    !node.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}) || isInaccessible(node)) return false
  const x=(Math.max(0,box.left)+Math.min(innerWidth,box.right))/2
  const y=(Math.max(0,box.top)+Math.min(innerHeight,box.bottom))/2
  return node.contains(document.elementFromPoint(x,y))
}

function linkTarget(node) {
  if(!node.hasAttribute('href')) return null
  const url=new URL(node.href,location.href)
  return url.protocol==='https:' && url.pathname!=='/' && (url.origin!==location.origin || url.pathname!==location.pathname)?
    url.origin+url.pathname:null
}

export function discoverCoverage(select) {
  const names={}
  for(const node of document.querySelectorAll(namesSelector)) {
    let role=getRole(node)
    if(!['img','link','button'].includes(role) && node.localName==='img') role='img'
    if(!['img','link','button'].includes(role) || computeAccessibleName(node).trim() || !onsite(node)) continue
    const host=node.closest('a[href],button,[role=button],[role=link]')
    if(role==='img' && host && !computeAccessibleName(host).trim()) continue
    const img=role==='img'?node:node.querySelector('img:not([alt])')
    const isImage=img?.localName==='img'
    if(isImage && (!img.complete || img.naturalWidth<12 || img.naturalHeight<12)) continue
    if(role==='button' && (node.matches(':disabled,[aria-disabled=true]') || node.form && node.type==='submit')) continue
    const href=role==='link'?linkTarget(node):null
    const context=clean(node.parentElement?.innerText).slice(0,300)
    const attributes={}
    for(const attr of ['id','class','title','data-action','data-testid','data-target','aria-controls','name']) {
      if(node.hasAttribute(attr)) attributes[attr]=String(node.getAttribute(attr)).slice(0,120)
    }
    const controlled=attributes['aria-controls']?document.getElementById(attributes['aria-controls']):null
    const icon=node.querySelector('svg use')
    const iconId=icon?.getAttribute('href')??icon?.getAttribute('xlink:href')
    const source=isImage?img.currentSrc.split('?')[0].slice(-170):null
    if(blockNames.test([href,...Object.values(attributes)].join(' '))) continue
    if(role==='link' && (!href || !node.matches('a[href]'))) continue
    if(role==='button' && !node.querySelector('svg,img,i') && !controlled && !Object.values(attributes).some(Boolean)) continue
    const category=role==='link' && !isImage?'empty-link':role==='button'?'empty-button':'missing-alt'
    const selector=select(node),imageSelector=isImage?select(img):null
    if(names[category] || document.querySelectorAll(selector).length!==1 || (imageSelector && document.querySelectorAll(imageSelector).length!==1)) continue
    names[category]={category,selector,role,imageSelector,href,context,attributes,iconId,source,
      title:document.title.slice(0,180),heading:clean(node.closest('figure,section,article,header,nav')?.querySelector('h1,h2,h3,figcaption')?.innerText).slice(0,130),
      controlled:clean(controlled?.querySelector('h1,h2,h3')?.innerText).slice(0,130)}
  }
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT)
  const seen=new Set()
  let contrast
  for(let index=0,node;index<6000 && (node=walker.nextNode());index++) {
    if(clean(node.textContent).length<3) continue
    const parent=node.parentElement
    if(seen.has(parent)) continue
    seen.add(parent)
    const model=contrastModel(parent)
    if(!model) continue
    const value=measureContrast(model)
    if(value.ratio>=value.threshold) continue
    const selector=select(parent)
    if(document.querySelectorAll(selector).length!==1) continue
    contrast={category:'low-contrast',selector,text:model.text,measurement:value}
    break
  }
  const lang=document.documentElement.getAttribute('lang')
  const main=document.querySelector('main,[role=main],article')
  const language=!lang?.trim()?{category:'missing-language',selector:'html',
    sample:clean((main?.innerText?.length??0)>=130?main.innerText:document.body.innerText).slice(0,2048)}:null
  return {names:Object.values(names),contrast,language}
}

export function coverageObservation(node,evaluation) {
  if(evaluation.category==='missing-language') return {lang:node.getAttribute('lang')}
  if(evaluation.category==='low-contrast') {
    const model=contrastModel(node)
    return model?{text:model.text,...measureContrast(model),model}:null
  }
  return {role:getRole(node)??(node.localName==='img'?'img':null),name:computeAccessibleName(node).trim(),
    alt:(node.matches('img')?node:node.querySelector('img'))?.getAttribute('alt')??null,visible:onsite(node)}
}
