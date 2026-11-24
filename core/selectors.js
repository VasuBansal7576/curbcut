import {selectorFields} from './widgets.js'

const uniqueFields=new Set(['trigger','target','dialog','opener','list','close'])
const scopeFields={items:'container',options:'list',close:'dialog'}

function describe(node) {
  return {tag:node.localName,id:node.id||undefined,classes:[...node.classList].slice(0,4),
    role:node.getAttribute('role')??undefined,label:(node.getAttribute('aria-label')||node.textContent.trim()).replace(/\s+/g,' ').slice(0,100)}
}

export function inspectRuleSelectors(rules) {
  return rules.flatMap((rule,index)=>selectorFields.filter(field=>rule[field]).map(field=>{
    const selector=rule[field],scope=rule[scopeFields[field]]
    try {
      const matches=[...document.querySelectorAll(selector)]
      const candidates=scope?new Set([...document.querySelectorAll(scope)].flatMap(node=>[...node.querySelectorAll(selector)])):null
      const scoped=candidates?[...candidates]:matches
      const count=scoped.length
      const issue=count===0?'no matches':count>1 && uniqueFields.has(field)?'expected one match':null
      return {index,field,selector,scope,count,issue,matches:(count?scoped:matches).slice(0,5).map(describe)}
    } catch(error) {return {index,field,selector,scope,count:0,issue:'invalid selector: '+error.message,matches:[]}}
  }))
}
