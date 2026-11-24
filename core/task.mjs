import {isIP} from 'node:net'
import {lookup} from 'node:dns/promises'
import {createHash} from 'node:crypto'
import ipaddr from 'ipaddr.js'
import {getDomain} from 'tldts'
export const managedKeyboardSelector='[role=tablist],[role=listbox],[role=menu],[role=menubar],[role=radiogroup],[role=tree],[role=grid],[role=toolbar]'
const journeyKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter','Space','Escape','Tab','Shift+Tab'])
const validSelector=value=>typeof value==='string' && value.trim().length>0 && value.length<=280
const restrictedAction=/(?:^|[^a-z])(?:log ?(?:in|out)|sign ?(?:in|up|out)|checkout|pay(?:ment)?|register|subscribe|purchase|book now|account|submit|send|order|donate)(?:$|[^a-z])/i
export const forbiddenJourneyAction=value=>restrictedAction.test(value)
const personas=new Set(['keyboard-only','low-vision','screen-reader-view','color-blind'])
const restricted=/(?:^|[/?&=_-])(?:log[-_]?in|sign[-_]?(?:up|in)|checkout|payment|register|oauth|password|account)(?:[/?&=_.-]|$)/i
const restrictedHost=/^(?:accounts?|auth|checkout|login|oauth|payments?|signin|sso)$/i
export function fixtureURL(url) {return url.origin==='http://127.0.0.1:4317' && url.pathname.startsWith('/fixtures/shop/')}
function publicAddress(value) {
  try {return ipaddr.process(value).range()==='unicast'} catch {return false}
}
export async function allowedHost(hostname) {
  const host=hostname.replace(/^\[|\]$/g,'')
  if(isIP(host)) return publicAddress(host)
  const ips=await lookup(host,{all:true})
  return ips.length>0 && ips.every(item=>publicAddress(item.address))
}
export function acceptableURL(url) {
  if(url.username || url.password || restricted.test(decodeURIComponent(url.pathname+url.search)) || url.hostname.split('.').slice(0,-2).some(label=>restrictedHost.test(label))) return false
  return fixtureURL(url) || url.protocol==='https:' && !url.port
}
export function siteKey(url) {
  return getDomain(url.hostname,{allowPrivateDomains:true})??url.hostname
}
export function taskNavigation(base,url) {
  return acceptableURL(url) && (fixtureURL(base)?fixtureURL(url):url.protocol==='https:' && siteKey(base)===siteKey(url))
}
export function journeyPaths(task) {
  const checks=[...(task.outcomeChecks??[]),...(task.journey??[]).flatMap(step=>step.checks??[])]
  const expected=checks.filter(check=>check.kind==='url-path').map(check=>check.equals)
  return expected.length?[...new Set([new URL(task.url).pathname,...expected])]:null
}
export function taskDestination(task,url) {
  const base=new URL(task.url)
  const paths=task.journey && journeyPaths(task)
  return taskNavigation(base,url) && (!paths || fixtureURL(base) || paths.includes(url.pathname))
}
function normalizeChecks(checks) {
  if(checks!==undefined && (!Array.isArray(checks) || checks.length<1 || checks.length>4 || checks.some(check=>
    !check || !['text','contains','value','visible','fits-width','url-path','expanded','hidden','focused','selected'].includes(check.kind) ||
    (check.kind!=='url-path' && (typeof check.selector!=='string' || !check.selector.trim() || check.selector.length>280)) ||
    (['text','contains','value','url-path'].includes(check.kind) && (typeof check.equals!=='string' || !check.equals || check.equals.length>240)) ||
    (check.kind==='url-path' && (!check.equals.startsWith('/') || check.equals.startsWith('//')))))) throw new Error('Invalid declarative outcome checks')
  return checks?.map(({selector,kind,equals})=>({kind,...(kind==='url-path'?{}:{selector}),...(equals===undefined?{}:{equals})}))
}
export async function normalizeTask(data) {
  const url=new URL(data.url)
  if(!acceptableURL(url) || (!fixtureURL(url) && !await allowedHost(url.hostname))) throw new Error('Use a public HTTPS page or the local fixture.')
  const task=data.task?.trim()
  if(!task || task.length>1400 || !personas.has(data.persona)) throw new Error('A persona and a task of 1–1400 characters are required.')
  const id=data.id ?? 'report-'+createHash('sha256').update([url.href,data.persona,task].join('\n')).digest('hex').slice(0,18)
  if(!/^[a-z0-9][a-z0-9-]{0,95}$/.test(id)) throw new Error('Invalid task id')
  for(const key of ['observedSelector','successSelector']) {
    if(data[key]!==undefined && (typeof data[key]!=='string' || data[key].length>280)) throw new Error(key+' must be a string of at most 280 characters.')
  }
  const observedSelector=data.observedSelector?.trim(), successSelector=data.successSelector?.trim()
  const controlTask=typeof data.controlTask==='string'?data.controlTask.trim().slice(0,1400):undefined
  const requiredName=typeof data.requiredName==='string'?data.requiredName.trim():undefined
  if(requiredName && (!observedSelector || requiredName.length>240)) throw new Error('A required accessible name needs an observed selector and at most 240 characters.')
  const outcomeChecks=normalizeChecks(data.outcomeChecks)
  const {minimumTabPresses}=data
  if(minimumTabPresses!==undefined && (!Number.isInteger(minimumTabPresses) || minimumTabPresses<1 || minimumTabPresses>12)) throw new Error('Minimum Tab presses must be between 1 and 12.')
  const keyboardEvidence=data.keyboardEvidence
  if(keyboardEvidence!==undefined && !['activate','text'].includes(keyboardEvidence)) throw new Error('Invalid keyboard evidence requirement')
  let probe
  if(data.probe!==undefined) {
    const {action,value,role}=data.probe??{}
    if(!observedSelector || !outcomeChecks || !['click','type','read'].includes(action) ||
      (action==='type' && (typeof value!=='string' || !value.trim() || value.length>100)) ||
      (action==='read' && data.persona!=='low-vision') ||
      (data.persona==='screen-reader-view' && (!requiredName || typeof role!=='string' || !/^[a-z]+$/.test(role)))) throw new Error('Invalid declarative barrier probe')
    probe={action,...(action==='type'?{value}:{}),...(role?{role}:{})}
  }
  let journey
  const {barrierClass,relatedSelectors}=data
  if(relatedSelectors!==undefined && (!Array.isArray(relatedSelectors) || !relatedSelectors.length ||
    relatedSelectors.length>18 || new Set(relatedSelectors).size!==relatedSelectors.length || relatedSelectors.some(selector=>!validSelector(selector)))) {
    throw new Error('Invalid related journey selectors')
  }
  if(barrierClass!==undefined && (!Number.isInteger(barrierClass) || barrierClass<1 || barrierClass>6)) throw new Error('Invalid barrier class')
  if(data.journey!==undefined) {
    if(probe || !observedSelector || !outcomeChecks || !barrierClass || !Array.isArray(data.journey) ||
      data.journey.length<2 || data.journey.length>6) throw new Error('Invalid journey objective')
    journey=data.journey.map(step=>{
      if(!step || !validSelector(step.selector) || !['activate','focus','key','observe'].includes(step.action) ||
        (step.action==='key'?(!journeyKeys.has(step.key) || !step.pointer):step.key!==undefined) ||
        (step.action==='focus' && !step.pointer) ||
        (step.pointer && (!['hover','click'].includes(step.pointer.action) || (step.pointer.selector!==undefined && !validSelector(step.pointer.selector)))) ||
        (data.persona==='screen-reader-view' && !step.reader && step.action!=='observe') ||
        (step.reader && (typeof step.reader.name!=='string' || !step.reader.name.trim() || step.reader.name.length>240 ||
          typeof step.reader.role!=='string' || !/^[a-z]+$/.test(step.reader.role)))) throw new Error('Invalid journey step')
      const {selector,action,key,pointer,reader}=step
      const checks=normalizeChecks(step.checks)
      return {selector,action,...(key?{key}:{}),...(pointer?{pointer:{action:pointer.action,...(pointer.selector?{selector:pointer.selector}:{})}}:{}),
        ...(reader?{reader:{role:reader.role,name:reader.name.trim()}}:{}),...(checks?{checks}:{})}
    })
  }
  return {id,url:url.href,persona:data.persona,task,...(controlTask?{controlTask}:{}),...(observedSelector?{observedSelector}:{}),...(requiredName?{requiredName}:{}),...(successSelector?{successSelector}:{}),...(outcomeChecks?{outcomeChecks}:{}),...(minimumTabPresses?{minimumTabPresses}:{}),...(keyboardEvidence?{keyboardEvidence}:{}),...(probe?{probe}:{}),...(barrierClass?{barrierClass}:{}),...(relatedSelectors?{relatedSelectors}:{}),...(journey?{journey}:{})}
}
