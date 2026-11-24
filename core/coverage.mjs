import {francAll} from 'franc-min'
import {iso6393To1} from 'iso-639-3'
import {contrastRepair} from './contrast.js'

export const categories=['missing-alt','empty-link','empty-button','low-contrast','missing-language']
export const labels={'missing-alt':'Missing alternative text','empty-link':'Empty links','empty-button':'Empty buttons',
  'low-contrast':'Low contrast text','missing-language':'Missing document language'}

export function detectLanguage(text) {
  if(text.replace(/[^\p{L}]/gu,'').length<110) return null
  const ranks=francAll(text,{minLength:120})
  const [[code,score],second]=ranks
  const gap=second?score-second[1]:1
  if(code==='und' || gap<0.10) return null
  return {tag:iso6393To1[code]??code,code,gap,method:'franc-min 6.2.0, margin 0.10, at least 110 letters'}
}

export function verdict(evaluation,observation,enabled) {
  if(!observation) return 'inconclusive'
  const {category,text,role,name}=evaluation
  if(category==='low-contrast') {
    if(observation.text!==text) return 'inconclusive'
    return observation.ratio>=observation.threshold?'pass':'fail'
  }
  if(category==='missing-language') {
    if(!observation.lang?.trim()) return 'fail'
    return observation.lang===name?'pass':'inconclusive'
  }
  if(!observation.visible) return 'inconclusive'
  if(role==='img' && enabled && name==='') return observation.alt==='' && !observation.name?'pass':'fail'
  if(observation.role!==role) return 'inconclusive'
  return observation.name===name && name?'pass':!observation.name?'fail':'inconclusive'
}

export async function observeCoverage(page,task,{enabled=false}={}) {
  const {evaluation,observedSelector}=task
  const locator=page.locator(observedSelector)
  if(await locator.count()!==1) return {status:'inconclusive',measurement:null}
  const measurement=await locator.evaluate((node,evaluation)=>CurbCut.coverageObservation(node,evaluation),evaluation)
  return {status:verdict(evaluation,measurement,enabled),measurement}
}

export function coverageRule(task,before,detail) {
  const {category,role,name}=task.evaluation
  const selector=task.observedSelector
  if(category==='low-contrast') {
    const value=before?.model && contrastRepair(before.model)
    return value?{selector,action:'setContrast',value}:null
  }
  if(category==='missing-language') return {selector:'html',action:'setLang',value:name}
  if(category==='missing-alt') return {selector:detail.imageSelector,action:'setAltText',value:name}
  if(['link','button'].includes(role)) return {selector,action:'addLabel',value:name}
  return null
}
