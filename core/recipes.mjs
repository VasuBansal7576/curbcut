import {createHash} from 'node:crypto'
import path from 'node:path'
import {ROOT,readJSON} from './io.mjs'
import {contrastRepair} from './contrast.js'
import {detectLanguage} from './coverage.mjs'
import {selectorFields} from './widgets.js'
import validate from './validate.generated.cjs'

export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')

export function candidate(task,barrier,rules,evidence={}) {
  const url=new URL(task.url)
  return {...task,site:url.hostname,match:url.origin+url.pathname,barrier,rules,status:'candidate',evidence,history:[]}
}

export function recipes(task,snapshot) {
  const {observedSelector:selector,requiredName}=task
  const {measurement,language,labels,click,explicitRole,hoverOwners}=snapshot?.repair??{}
  const node=snapshot?.nodes?.find(node=>node.selector===selector)
  const out=[]
  function add(barrier,rules) {
    const patch=candidate(task,barrier,rules,{repairMethod:'recipe'})
    if(validate(patch)) out.push(patch)
  }
  if(measurement && measurement.ratio<measurement.threshold) {
    const value=contrastRepair(measurement.model)
    if(value) add('Measured text contrast is below WCAG AA.',[{selector,action:'setContrast',value}])
  }
  if(language) {
    const value=detectLanguage(language)?.tag
    if(value) add('The document omits its primary language.',[{selector:'html',action:'setLang',value}])
  }
  if(click && node && node.tabIndexAttribute===null && explicitRole===null && node.role==='text' && !['button','a','input','select','textarea','summary'].includes(node.tag)) {
    add('The click handler has no keyboard equivalent.',[
      {selector,action:'makeFocusable'},{selector,action:'setRole',value:'button'},
      ...['bindEnterToClick','restoreFocusOutline'].map(action=>({selector,action}))])
  }
  if(node && !node.name) for(const value of new Set(labels??[])) {
    if(requiredName && value!==requiredName) continue
    add('The control lacks a name present in nearby text.',[{selector,action:'addLabel',value}])
  }
  for(const owner of hoverOwners??[]) add('A CSS hover rule reveals a descendant.',[{selector:owner,action:'mirrorHoverToFocus'}])
  return out
}

function rewrite(rules,replace) {
  return rules.map(rule=>Object.fromEntries(Object.entries(rule).map(([key,value])=>
    [key,selectorFields.includes(key) && typeof value==='string'?replace(value,key):value])))
}

function shapeNodes(snapshot) {
  return [...snapshot?.context?.nodes??[],...snapshot?.interactionContext?.nodes??[],...snapshot?.nodes??[]]
}

function selectorShape(selector) {
  return selector.replace(/#[\w-]+/g,'#*').replace(/(?:[a-f0-9]{8,}|\d+)(?=[\w-]*\b)/gi,'*')
}

function observations(patch,snapshot) {
  const nodes=snapshot?.context?.nodes??[]
  const target=nodes.find(node=>node.selector===patch.observedSelector)
  const fallback=snapshot?.nodes?.find(node=>node.selector===patch.observedSelector)
  return {
    stack:snapshot?.repair?.stack??[],
    shape:target?[target.tag,nodes.find(node=>node.selector===target.parent)?.tag,
      ...target.children.map(child=>shapeNodes(snapshot).find(node=>node.selector===child)?.tag??child.match(/^[a-z][\w-]*/i)?.[0]??'*')]:fallback?[fallback.tag]:[],
    role:fallback?.role??null
  }
}

export function templateFor(patch,snapshot) {
  const slots={}
  const rules=rewrite(patch.rules,(value,key)=>{
    const slot=value===patch.observedSelector?'trigger':key==='target'?'panel':key==='items'?'link':key
    const identity=Object.keys(slots).find(name=>slots[name]===value)
    if(identity) return '$'+identity
    const unique=Object.hasOwn(slots,slot)?slot+Object.keys(slots).length:slot
    slots[unique]=value
    return '$'+unique
  })
  const fingerprint=observations(patch,snapshot)
  const id=patch.evidence?.templateId??digest([patch.persona,rules,fingerprint]).slice(0,20)
  const descriptors=Object.fromEntries(Object.entries(slots).map(([name,selector])=>{
    const node=shapeNodes(snapshot).find(node=>node.selector===selector)
    return [name,{tag:node?.tag,role:node?.role,shape:selectorShape(selector)}]
  }))
  return {id,source:patch.id,persona:patch.persona,barrier:patch.barrier,fingerprint,rules,slots,descriptors,observedSelector:patch.observedSelector}
}

export async function bundledTemplates({include=()=>true}={}) {
  const patches=await readJSON(path.join(ROOT,'extension/bundled.json'))
  return Promise.all(patches.filter(patch=>patch.status==='verified' && include(patch)).map(async patch=>{
    const file=patch.evidence?.before
    const baseline=file?await readJSON(path.join(ROOT,path.dirname(file),'result.json')).catch(()=>null):null
    const local=patch.id.startsWith('v5-')?await readJSON(path.join(ROOT,'proof/heldout-v5/local',patch.id,'before.json')).catch(()=>null):null
    const snapshot=local?.snapshot??baseline?.snapshot
    return templateFor(patch,snapshot)
  }))
}

export function inherited(task,snapshot,templates) {
  const current=observations(task,snapshot)
  const known=new Set([...snapshot?.nodes??[],...snapshot?.context?.nodes??[]].map(node=>node.selector))
  const ranked=[]
  for(const template of templates) {
    if(template.persona!==task.persona || template.source===task.id) continue
    const {fingerprint,rules,slots}=template
    const shape=current.shape.length && current.shape.join('|')===fingerprint.shape.join('|')
    const stack=current.stack.filter(value=>fingerprint.stack.includes(value)).length
    const exact=Boolean(task.observedSelector && task.observedSelector===template.observedSelector)
    if(!exact && !(shape && (stack || current.role===fingerprint.role))) continue
    let missing=false
    const instantiated=rewrite(rules,value=>{
      if(value==='$trigger' && slots.trigger===template.observedSelector) return task.observedSelector
      const selector=slots[value.slice(1)]
      if(selector==='html' || known.has(selector)) return selector
      const slot=template.descriptors?.[value.slice(1)]
      const possible=new Set(shapeNodes(snapshot).filter(node=>slot?.tag && node.tag===slot.tag && selectorShape(node.selector)===slot.shape)
        .map(node=>node.selector))
      if(possible.size===1) return [...possible][0]
      missing=true
      return selector
    })
    if(missing) continue
    const patch=candidate(task,template.barrier,instantiated,{repairMethod:'inheritance',templateId:template.id,'inherited-from':template.source})
    if(validate(patch)) ranked.push({patch,score:Number(exact)*4+Number(shape)*2+stack})
  }
  return ranked.sort((a,b)=>b.score-a.score).slice(0,3).map(row=>row.patch)
}
