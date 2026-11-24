import {createHash} from 'node:crypto'
import {match} from './engine.js'
import {siteKey} from './task.mjs'

export function actionSignature(rules) {
  const seen=[]
  for(const rule of rules??[]) {
    if(rule?.action && !seen.includes(rule.action)) seen.push(rule.action)
  }
  return seen.join('+')
}

const named={
  'makeFocusable+setRole+bindEnterToClick+restoreFocusOutline':{
    id:'clickable-div-as-button',title:'Clickable div as button',
    pattern:'Visible elements with click handlers but no button role or keyboard tabindex',
    question:'Does this page show a pattern that recipe clickable-div-as-button would fix?'
  },
  'mirrorHoverToFocus':{
    id:'hover-only-menu',title:'Hover-only menu',
    pattern:'CSS :hover rules that reveal descendant menus or panels',
    question:'Does this page show a pattern that recipe hover-only-menu would fix?'
  },
  addLabel:{
    id:'unnamed-field',title:'Unnamed field',
    pattern:'Visible inputs, buttons or links with no accessible name',
    question:'Does this page show a pattern that recipe unnamed-field would fix?'
  },
  setContrast:{
    id:'setContrast',title:'Low contrast text',
    pattern:'Visible text below WCAG AA contrast',
    question:'Does this page show a pattern that recipe setContrast would fix?'
  },
  setAltText:{
    id:'setAltText',title:'Missing image alternative',
    pattern:'Visible images with no alt text',
    question:'Does this page show a pattern that recipe setAltText would fix?'
  },
  setLang:{
    id:'setLang',title:'Missing document language',
    pattern:'The document element has no language attribute',
    question:'Does this page show a pattern that recipe setLang would fix?'
  },
  injectCSS:{
    id:'reflow',title:'Reflow overflow',
    pattern:'Content wider than the viewport that injectCSS can wrap or constrain',
    question:'Does this page show a pattern that recipe reflow would fix?'
  },
  toggleOnActivate:{
    id:'toggle-on-activate',title:'Toggle on activate',
    pattern:'Expanded widgets that do not toggle from keyboard activation',
    question:'Does this page show a pattern that recipe toggle-on-activate would fix?'
  },
  arrowKeyNavigation:{
    id:'arrow-key-navigation',title:'Arrow key navigation',
    pattern:'Tab lists, listboxes or similar widgets without arrow-key movement',
    question:'Does this page show a pattern that recipe arrow-key-navigation would fix?'
  },
  'makeFocusable+bindEnterToClick+restoreFocusOutline':{
    id:'clickable-without-role',title:'Clickable control without a role',
    pattern:'Clickable non-native controls that are not in the tab order',
    question:'Does this page show a pattern that recipe clickable-without-role would fix?'
  },
  'makeFocusable+toggleOnActivate':{
    id:'focusable-toggle',title:'Focusable toggle',
    pattern:'Toggle widgets that need both focus and activation',
    question:'Does this page show a pattern that recipe focusable-toggle would fix?'
  },
  'makeFocusable+setRole+addLabel+bindEnterToClick+restoreFocusOutline':{
    id:'named-clickable-div',title:'Unnamed clickable div',
    pattern:'Clickable non-native controls that also lack an accessible name',
    question:'Does this page show a pattern that recipe named-clickable-div would fix?'
  }
}

function fallbackMeta(signature) {
  const id=signature.split('+').join('-')
  return {id,title:signature,pattern:'Pages that match the '+signature+' action sequence',
    question:'Does this page show a pattern that recipe '+id+' would fix?'}
}

export function recipeMeta(signature) {
  return {signature,...(named[signature]??fallbackMeta(signature))}
}

export function groupRecipes(patches) {
  const groups=new Map()
  for(const patch of patches) {
    const signature=actionSignature(patch.rules)
    if(!groups.has(signature)) {
      groups.set(signature,{...recipeMeta(signature),patchCount:0,patchIds:[],sites:[],urls:[]})
    }
    const group=groups.get(signature)
    group.patchCount++
    group.patchIds.push(patch.id)
    if(patch.site && !group.sites.includes(patch.site)) group.sites.push(patch.site)
    if(patch.url && !group.urls.includes(patch.url)) group.urls.push(patch.url)
  }
  return [...groups.values()].sort((a,b)=>b.patchCount-a.patchCount || a.id.localeCompare(b.id))
}

export function catalogDocument(patches) {
  const recipes=groupRecipes(patches)
  return {source:'extension/bundled.json',patchCount:patches.length,recipeCount:recipes.length,recipes}
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function drawSample(sites,seed,count) {
  return sites.map(site=>({...site,order:sha256(seed+'\n'+(site.site||site.url))}))
    .sort((a,b)=>a.order.localeCompare(b.order)).slice(0,count)
    .map(({order,...row})=>row)
}

export function parseUrlList(text) {
  const trimmed=String(text??'').trim()
  if(!trimmed) return []
  if(trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const data=JSON.parse(trimmed)
    const rows=Array.isArray(data)?data:data.sites??data.urls??data.pages??[]
    return rows.map(row=>{
      if(typeof row==='string') return {url:row.startsWith('http')?row:'https://'+row+'/'}
      const url=row.url||(row.site?'https://'+row.site+'/':null)
      if(!url) throw new Error('URL list entries need url or site')
      return {url,site:row.site,rank:row.rank,set:row.set||'sample'}
    })
  }
  return trimmed.split(/\r?\n/).map(line=>line.trim()).filter(line=>line && !line.startsWith('#')).map(line=>{
    const url=line.startsWith('http')?line:'https://'+line+'/'
    return {url,set:'sample'}
  })
}

export function calibrationPages(patches,recipes) {
  const byUrl=new Map()
  const index=new Map(recipes.map(recipe=>[recipe.signature,recipe]))
  for(const patch of patches) {
    const recipe=index.get(actionSignature(patch.rules))
    if(!recipe || !patch.url) continue
    const row=byUrl.get(patch.url)??{url:patch.url,site:patch.site,set:'calibration',labels:[]}
    row.labels.push({recipeId:recipe.id,patchId:patch.id,source:'patch-url'})
    byUrl.set(patch.url,row)
  }
  return [...byUrl.values()]
}

export function labelsForUrl(url,patches,recipes) {
  const index=new Map(recipes.map(recipe=>[recipe.signature,recipe]))
  const labels=[]
  let site
  try {site=siteKey(new URL(url))} catch {return labels}
  for(const patch of patches) {
    const recipe=index.get(actionSignature(patch.rules))
    if(!recipe) continue
    const exact=match(patch,url)
    let sameSite=false
    try {sameSite=siteKey(new URL(patch.url))===site} catch {}
    if(exact) labels.push({recipeId:recipe.id,patchId:patch.id,source:'patch-url'})
    else if(sameSite) labels.push({recipeId:recipe.id,patchId:patch.id,source:'site'})
  }
  return labels
}
