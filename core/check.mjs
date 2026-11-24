import {mkdir,readdir,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {ROOT,instant,readJSON,relative,saveJSON} from './io.mjs'
import {fixtureURL,normalizeTask} from './task.mjs'
import {session} from './chrome.mjs'
import {repairLocally,fix} from './loop.mjs'
import {estimateKanePlan} from './kane.mjs'
import {createReport,wcagCriteria} from '../extension/lib/report.js'

const personas=new Set(['keyboard-only','screen-reader-view','low-vision'])
const fold=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()

export function similarTask(left,right) {
  const a=fold(left),b=fold(right)
  if(!a || !b) return false
  if(a===b || a.includes(b) || b.includes(a)) return true
  const tokens=[...new Set(b.split(' ').filter(word=>word.length>3))]
  if(!tokens.length) return false
  return tokens.filter(word=>a.includes(word)).length/tokens.length>=0.72
}

function samePage(left,right) {
  try {
    const a=new URL(left),b=new URL(right)
    const trail=value=>value.pathname.replace(/\/$/,'')||'/'
    return a.origin===b.origin && trail(a)===trail(b)
  } catch {return false}
}

export function searchValue(text) {
  return text.match(/\bsearch\s+for\s+[“"'‘]?([a-z0-9][\w-]{1,40})[”"'’]?/i)?.[1]
    ?? text.match(/\b(?:type|enter)\s+[“"'‘]?([a-z0-9][\w-]{1,40})[”"'’]?/i)?.[1]
}

async function loadKnownTasks() {
  const files=['tasks/keyboard-only.json','tasks/low-vision.json','tasks/screen-reader-view.json']
  for(const folder of ['tasks/public','tasks/public/kane']) {
    const names=await readdir(path.join(ROOT,folder)).catch(()=>[])
    for(const name of names) if(name.endsWith('.json')) files.push(path.join(folder,name))
  }
  const loaded=await Promise.all(files.map(file=>readJSON(path.join(ROOT,file)).catch(()=>null)))
  const demo=await readJSON(path.join(ROOT,'extension/demo.json'))
  const contract=await readJSON(path.join(ROOT,'fixtures/shop/contract.json'))
  const journeys=await readJSON(path.join(ROOT,'fixtures/shop/journeys.json'))
  const extras=new Map(demo.map(patch=>[patch.id,patch]))
  for(const item of contract.tasks) {
    const current=extras.get(item.id)??{}
    extras.set(item.id,{...current,...item,task:item.objective??current.task})
  }
  const known=[]
  for(const task of loaded.filter(Boolean)) known.push({...extras.get(task.id),...task})
  for(const journey of journeys) known.push({...journey,url:'http://127.0.0.1:4317/fixtures/shop/journeys.html'})
  return known
}

function withProbe(task,persona) {
  if(task.probe || task.journey) return task
  const typed=searchValue(task.task??'')
  if(!task.observedSelector) return task
  if(persona==='screen-reader-view') {
    if(!task.requiredName) return task
    const action=typed?'type':'click'
    const role=action==='type'?'searchbox':'button'
    return {...task,probe:{action,role,...(action==='type'?{value:typed}:{})}}
  }
  if(typed) return {...task,probe:{action:'type',value:typed}}
  return {...task,probe:{action:'click'}}
}

function shopObjective(task,persona) {
  if(!fixtureURL(new URL(task.url))) return withProbe(task,persona)
  const text=task.task??''
  const typed=searchValue(text)
  if(task.id==='reader-search-products' || /search products|searchbox/i.test(text)) {
    const value=typed||'speaker'
    return {...task,observedSelector:task.observedSelector||'#search',
      ...(persona==='screen-reader-view'?{requiredName:task.requiredName||'Search products'}:{}),
      probe:{action:'type',value,...(persona==='screen-reader-view'?{role:'searchbox'}:{})},
      outcomeChecks:[{selector:'#search',kind:'value',equals:value}]}
  }
  if(persona==='screen-reader-view') {
    return {...task,observedSelector:task.observedSelector||'div.add-to-cart',requiredName:task.requiredName||'Add to cart',
      probe:{action:'click',role:'button'},
      outcomeChecks:task.outcomeChecks??[{selector:'#cart-status',kind:'text',equals:'Field Headphones added to cart.'}]}
  }
  if(persona==='low-vision' && (task.id==='low-vision-shop-speaker' || /porch speaker/i.test(text))) {
    return {...task,observedSelector:task.observedSelector||'[data-product=speaker] [data-add]',probe:{action:'click'},
      outcomeChecks:task.outcomeChecks??[{selector:'#cart-status',kind:'text',equals:'Porch Speaker added to cart.'}]}
  }
  if(task.id==='keyboard-add-headphones' || /field headphones|add to cart/i.test(text)) {
    return {...task,observedSelector:task.observedSelector||'div.add-to-cart',probe:{action:'click'},
      outcomeChecks:task.outcomeChecks??[{selector:'#cart-status',kind:'text',equals:'Field Headphones added to cart.'}]}
  }
  return withProbe(task,persona)
}

async function inspectPageForTask({url,task,persona}) {
  const draft=await normalizeTask({url,persona,task})
  const browser=await session(draft,'control',null,tmpdir(),{local:true,gate:true})
  try {
    const phrases=[...task.matchAll(/[“"'‘]([^”"'’]{2,80})[”"'’]/g)].map(match=>match[1])
    const confirm=task.match(/\b(?:confirm|verify|assert)\s+(.+?)(?:\.|$)/i)?.[1]?.trim()
    if(confirm) phrases.push(confirm)
    const typed=searchValue(task)
    const found=await browser.page.evaluate(({phrases,typed})=>{
      const identify=el=>el.id?'#'+CSS.escape(el.id):el.localName+[...el.classList].slice(0,2).map(name=>'.'+CSS.escape(name)).join('')
      const unique=selector=>{try{return document.querySelectorAll(selector).length===1}catch{return false}}
      const nodes=[...document.querySelectorAll('a[href],button,input,textarea,select,summary,[role],[tabindex],div[class],div[id],[aria-label]')]
        .filter(node=>node.checkVisibility?.({visibilityProperty:true})!==false)
      const hits=[]
      for(const phrase of phrases) {
        const folded=phrase.toLowerCase()
        const matches=nodes.filter(node=>[node.id,node.getAttribute('aria-label'),node.getAttribute('placeholder'),node.textContent]
          .filter(Boolean).join(' ').toLowerCase().includes(folded))
        if(matches.length!==1) continue
        const node=matches[0]
        const selector=identify(node)
        if(unique(selector)) hits.push({selector,tag:node.localName,text:(node.textContent||'').trim().slice(0,120)})
      }
      let search=null
      if(typed) {
        const inputs=[...document.querySelectorAll('input[type=search],input[type=text],input:not([type]),textarea')].filter(node=>!node.disabled)
        if(inputs.length===1) {
          const selector=identify(inputs[0])
          if(unique(selector)) search={selector,role:inputs[0].type==='search'?'searchbox':'textbox'}
        }
      }
      return {hits,search}
    },{phrases,typed})
    const outcome=found.hits.find(hit=>confirm && fold(hit.text).includes(fold(confirm)))??found.hits.at(-1)
    const target=found.search??found.hits.find(hit=>hit.selector!==outcome?.selector)
    if(!target?.selector || !outcome?.selector) {
      throw new Error('Could not derive a reliable outcome check from that task. The page did not expose a unique control and outcome for the named text.')
    }
    const probe=typed && found.search?{action:'type',value:typed,...(persona==='screen-reader-view'?{role:found.search.role}:{})}:{action:'click'}
    const requiredName=persona==='screen-reader-view'?(target.text||phrases[0]||'').trim():undefined
    if(persona==='screen-reader-view' && (!requiredName || (probe.action==='click' && !probe.role))) {
      probe.role=probe.action==='type'?found.search?.role||'searchbox':'button'
    }
    const check=outcome.text?{selector:outcome.selector,kind:'contains',equals:outcome.text.slice(0,240)}:{selector:outcome.selector,kind:'visible'}
    const outcomeChecks=typed && found.search?[{selector:found.search.selector,kind:'value',equals:typed},check]:[check]
    return {url,persona,task,observedSelector:target.selector,probe,...(requiredName?{requiredName}:{}),outcomeChecks}
  } finally {await browser.abort()}
}

export async function deriveTask({url,task,persona='keyboard-only'}) {
  if(!personas.has(persona)) throw new Error('Persona must be keyboard-only, screen-reader-view, or low-vision.')
  const text=task?.trim()
  if(!text) throw new Error('A task in plain English is required.')
  const known=await loadKnownTasks()
  const page=known.filter(entry=>entry.url && samePage(entry.url,url))
  const match=page.find(entry=>entry.persona===persona && similarTask(entry.task,text))??page.find(entry=>similarTask(entry.task,text))
  const data=match?shopObjective({...match,url,task:text,persona,id:match.id},persona):await inspectPageForTask({url,task:text,persona})
  if(!data.probe && !data.journey) {
    throw new Error('Could not derive a reliable outcome check from that task. Name a unique visible control and the exact outcome text, or pass a task JSON file to curbcut fix.')
  }
  if(!data.outcomeChecks?.length) {
    throw new Error('Could not derive a reliable outcome check from that task. Include the exact on-page text that means the task succeeded.')
  }
  return normalizeTask(data)
}

export function compactDOM(snapshot,selector) {
  const nodes=snapshot?.nodes??[]
  const preferred=selector?nodes.filter(node=>node.selector===selector):[]
  return (preferred.length?preferred:nodes).slice(0,8).map(node=>({
    selector:node.selector,tag:node.tag,role:node.role,name:node.name,tabIndex:node.tabIndex,display:node.display
  }))
}

function formatCriteria(patch) {
  return wcagCriteria(patch).map(entry=>entry.id+' '+entry.name).join(', ')
}

function formatDryRun(task,local,plan) {
  const checks=(task.outcomeChecks??[]).map(check=>check.kind+(check.selector?' '+check.selector:'')+(check.equals?' = '+check.equals:'')).join('; ')
  const kane=local?'0 Kane credits. Local oracle and local repair only.':
    'Kane runs: '+plan.runs+' (before, control, after × '+plan.attempts+'). Max steps / estimated credits: '+plan.estimatedCredits+'.'
  return ['check dry-run',
    'url: '+task.url,
    'persona: '+task.persona,
    'id: '+task.id,
    'task: '+task.task,
    'observedSelector: '+(task.observedSelector??'—'),
    'probe: '+(task.probe?task.probe.action+(task.probe.value?' '+task.probe.value:''):task.journey?'journey':'—'),
    'outcomeChecks: '+checks,
    kane].join('\n')+'\n'
}

function formatSummary({task,result,dir,reportPath}) {
  const patch=result.patch
  const barrier=patch?.barrier??result.reason??result.failure?.reason??result.local?.persona?.reason??'—'
  const phases=(result.phases??[]).map(phase=>'  '+phase.name+'  '+phase.status+(phase.file?'  '+phase.file:'')).join('\n')
  const recordings=[result.before?.video,result.control?.video,result.after?.video,result.patch?.evidence?.before,result.patch?.evidence?.after,result.patch?.evidence?.control]
    .filter(Boolean)
  const lines=['check '+result.status,
    'barrier: '+barrier,
    'WCAG: '+formatCriteria(patch??task),
    phases?'phases:\n'+phases:null,
    recordings.length?'recordings: '+recordings.join(', '):null,
    'work: '+relative(dir),
    patch?'patch: '+patch.id:null,
    reportPath?'report: '+relative(reportPath):null]
  return lines.filter(Boolean).join('\n')+'\n'
}

export async function checkPage({url,task,persona='keyboard-only',local=false,dryRun=false,base,write,run,persist}) {
  const derived=await deriveTask({url,task,persona})
  const plan=estimateKanePlan(derived,{attempts:3,repair:true})
  if(dryRun) return {ok:true,dryRun:true,task:derived,kane:{local,runs:local?0:plan.runs,estimatedCredits:local?0:plan.estimatedCredits,phases:local?[]:plan.phases},text:formatDryRun(derived,local,plan)}
  const dir=base??path.join(ROOT,'.curbcut','check',derived.id,instant().replaceAll(':','-'))
  await mkdir(dir,{recursive:true})
  await saveJSON(path.join(dir,'task.json'),derived)
  const result=local?await repairLocally(derived,{base:dir,attempts:3,...(write?{write}:{})}):
    await fix(derived,{base:dir,attempts:3,...(write?{write}:{}),...(run?{run}:{}),...(persist?{persist}:{})})
  let reportPath=null
  if(result.patch) {
    const reportable={...result.patch,status:result.patch.status==='verified'?'verified':'locally-verified'}
    try {
      reportPath=path.join(dir,'report.md')
      await writeFile(reportPath,createReport(reportable))
    } catch {reportPath=null}
  }
  const ok=['already-accessible','verified','locally-fixed'].includes(result.status)
  return {ok,task:derived,result,reportPath,dir,text:formatSummary({task:derived,result,dir,reportPath})}
}
