import {askJev,noul} from './jev-policy.js'

export const stuckModel='jev-1.14.0'
export const stuckThreshold=.75
export const traceKeys=['Tab','Shift+Tab','Enter','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','Home','End']
const roles=new Set(['link','button','menuitem','tab','checkbox','radio','switch','combobox','textbox','listbox','option','dialog','other'])

export function cleanTrace(trace) {
  if(!Array.isArray(trace)) return []
  return trace.slice(-16).filter(step=>traceKeys.includes(step?.key)).map(({key,focus,visible,named,role,gapMs,effect,revisited})=>({
    key,focus:Number.isInteger(focus) && focus>=0 && focus<256?focus:null,
    role:roles.has(role)?role:null,visible:typeof visible==='boolean'?visible:null,named:typeof named==='boolean'?named:null,
    gapMs:Number.isFinite(gapMs)?Math.min(20000,Math.max(0,Math.round(gapMs/100)*100)):null,
    effect:['progress','unchanged','focus-change'].includes(effect)?effect:null,
    revisited:typeof revisited==='boolean'?revisited:null
  }))
}

export async function chooseStuck(key,trace) {
  const history=cleanTrace(trace)
  if(history.length<6) return {p:null,reason:'short-trace'}
  const {answers,providerMs,model}=await askJev(key,{model:stuckModel,state:{recentKeyboardNavigation:history},questions:{
    stuck:noul('Does this recent anonymized keyboard interaction show the user is unable to make progress? Missing fields are unknown. Focus numbers repeat for the same control.',
      'A repeated short focus cycle, invisible focus, or repeated activation without progress provides clear evidence of a barrier.',
      'Sequential navigation, focus moving through new controls, a meaningful activation, or insufficient evidence to infer a barrier.')
  }})
  const value=answers?.stuck?.noul
  return {p:Number.isFinite(value) && value>=0 && value<=1?value:null,providerMs,model}
}
