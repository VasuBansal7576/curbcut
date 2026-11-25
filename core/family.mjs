import {readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {ROOT,instant,readJSON,relative,saveJSON} from './io.mjs'
import {normalizeTask,acceptableURL,allowedHost} from './task.mjs'
import {replayLane} from './probe.mjs'
import {inherited,bundledTemplates,digest,candidate} from './recipes.mjs'
import {actionSignature,recipeMeta,parseUrlList} from './census-recipes.mjs'
import {familyDecision,fix} from './loop.mjs'
import {estimateKanePlan,requireKane} from './kane.mjs'
import {balanceNumber,recordCost} from './cost.mjs'
import familyPolicy from './cost-policy.json' with {type:'json'}
import {createFamilyReport} from '../extension/lib/report.js'
import validate from './validate.generated.cjs'

export const KANE_FLOOR=1380
export const KANE_BUDGET=80
export const KANE_SITE_CAP=2

function samePage(left,right) {
  try {
    const a=new URL(left),b=new URL(right)
    const trail=value=>(value.pathname.replace(/\/$/,'')||'/')
    return a.origin===b.origin && trail(a)===trail(b)
  } catch {return false}
}

export async function resolveTargets(args) {
  if(!args.length) throw new Error('family needs a URL list file or one or more URLs.')
  if(args.length===1 && !/^https?:\/\//i.test(args[0])) {
    const text=await readFile(path.resolve(args[0]),'utf8')
    return parseUrlList(text)
  }
  return parseUrlList(args.join('\n'))
}

export function familyOf(patch) {
  const signature=actionSignature(patch.rules)
  const meta=recipeMeta(signature)
  if(patch.rules?.every(rule=>rule.action==='addLabel')) return {id:'unnamed-field',...meta,idOverride:'unnamed-field'}
  return meta
}

export function matchesFamily(template,familyId,source) {
  if(!familyId) return false
  if(template.id===familyId || template.source===familyId) return true
  if(source?.id===familyId) return true
  const signature=actionSignature(source?.rules??template.rules?.map(rule=>({...rule,selector:rule.selector?.startsWith('$')?'#x':rule.selector}))??[])
  const meta=source?familyOf(source):recipeMeta(signature)
  return meta.id===familyId || signature===familyId
}

function compact(outcome) {
  return outcome?{status:outcome.status,reason:outcome.reason}:null
}

function withPointerContext(before,control) {
  const snapshot=before.snapshot??control?.snapshot
  if(!snapshot) return snapshot
  if(!before.snapshot?.url || before.snapshot.url!==control?.snapshot?.url) return snapshot
  const nodes=new Map(before.snapshot.nodes.map(node=>[node.selector,node]))
  for(const node of control.snapshot.nodes) if(!nodes.has(node.selector)) nodes.set(node.selector,node)
  return {...before.snapshot,nodes:[...nodes.values()],pointerContext:control.snapshot.interactionContext??control.snapshot.context}
}

function snapshotNodes(snapshot) {
  return [...snapshot?.nodes??[],...snapshot?.context?.nodes??[],...snapshot?.interactionContext?.nodes??[]]
}

function selectorShape(selector) {
  return selector.replace(/#[\w-]+/g,'#*').replace(/(?:[a-f0-9]{8,}|\d+)(?=[\w-]*\b)/gi,'*')
}

function instantiateRules(template,snapshot) {
  const nodes=snapshotNodes(snapshot)
  const known=new Set(nodes.map(node=>node.selector))
  let missing=false
  const rules=template.rules.map(rule=>Object.fromEntries(Object.entries(rule).map(([key,value])=>{
    if(typeof value!=='string' || !value.startsWith('$')) return [key,value]
    const name=value.slice(1)
    const selector=template.slots[name]
    if(selector==='html' || known.has(selector)) return [key,selector]
    const slot=template.descriptors?.[name]
    const tagged=nodes.filter(node=>slot?.tag && node.tag===slot.tag)
    const shaped=tagged.filter(node=>selectorShape(node.selector)===slot?.shape)
    const pool=shaped.length?shaped:tagged
    const preferred=pool.find(node=>/hljs|\bcode\b|\bpre\b/.test(node.selector))||pool[0]
    if(!preferred) {
      missing=true
      return [key,selector]
    }
    return [key,preferred.selector]
  })))
  return missing || !rules.length?null:rules
}

function familyObjective(donor,url,selector) {
  const href=new URL(url).href
  const parsed=new URL(href)
  const {evidence,history,rules,status,match,site,...task}=donor
  const fits=selector?[{kind:'fits-width',selector}]:donor.outcomeChecks
  return {
    ...task,
    id:'family-'+digest([href,donor.id,selector||donor.observedSelector||'']).slice(0,16),
    url:href,
    site:parsed.hostname,
    match:parsed.origin+parsed.pathname,
    observedSelector:selector||donor.observedSelector,
    outcomeChecks:donor.outcomeChecks?.some(check=>check.kind==='fits-width')?fits:donor.outcomeChecks,
    ...(donor.persona==='low-vision'?{
      task:'At 320 CSS pixels, read the preformatted code and verify it fits within the visible width using vertical scrolling only.',
      controlTask:'At normal width, read the preformatted code and verify all its text is visible without horizontal scrolling.'
    }:{})
  }
}

async function observe(task,replay,pauseMs) {
  if(pauseMs) await delay(pauseMs)
  const before=await replay(task,task.persona)
  if(pauseMs) await delay(pauseMs)
  const control=before.status==='blocked'?null:await replay(task,'control')
  return {before,control,snapshot:withPointerContext(before,control)}
}

export function selectFamilyTemplates(familyId,templates,patches) {
  const bySource=new Map(patches.map(patch=>[patch.id,patch]))
  const selected=templates.filter(template=>matchesFamily(template,familyId,bySource.get(template.source)))
  if(selected.length) return selected
  const donor=patches.find(patch=>patch.id===familyId)
  if(!donor) return []
  return templates.filter(template=>template.source===donor.id)
}

async function seedFamilyState(templateId,donors,policy) {
  const file=path.join(ROOT,'.curbcut','families',templateId+'.json')
  const existing=await readJSON(file).catch(error=>{if(error.code==='ENOENT') return null;throw error})
  if(existing) return existing
  const verified=donors.filter(patch=>patch.status==='verified').slice(0,policy.minimumVerified)
    .map(patch=>digest(['source',patch.id]))
  const state={verified:verified.length?verified:[digest(['source',templateId])]}
  await saveJSON(file,state)
  return state
}

async function scanSite(entry,templates,patches,{replay,pauseMs}) {
  const url=entry.url
  const parsed=new URL(url)
  if(!acceptableURL(parsed) || !await allowedHost(parsed.hostname).catch(()=>false)) {
    return {url,status:'blocked',reason:'Not a public HTTPS page'}
  }
  const known=patches.find(patch=>samePage(patch.url,url) && (patch.probe||patch.journey||patch.evaluation))
  const donor=patches.find(patch=>templates.some(template=>template.source===patch.id))??patches[0]
  const seedSelector=donor.observedSelector||Object.values(templates[0]?.slots??{})[0]
  let task
  try {task=await normalizeTask(known??familyObjective(donor,url,seedSelector))}
  catch(error) {return {url,status:'blocked',reason:error.message.split('\n')[0]}}
  let {before,control,snapshot}=await observe(task,replay,pauseMs)
  if(before.status!=='fail' || control?.status!=='pass') {
    const retrySelector=templates.map(template=>instantiateRules(template,before.snapshot||snapshot)?.[0]?.selector).find(Boolean)
    if(retrySelector && retrySelector!==task.observedSelector) {
      try {task=await normalizeTask(familyObjective(donor,url,retrySelector))}
      catch(error) {return {url,status:'blocked',reason:error.message.split('\n')[0]}}
      const retry=await observe(task,replay,pauseMs)
      before=retry.before
      control=retry.control
      snapshot=retry.snapshot
    }
  }
  const row={url,id:task.id,site:task.site,persona:task.persona,before:compact(before),control:compact(control)}
  if(before.status==='blocked') return {...row,status:'blocked',reason:before.reason}
  if(before.status!=='fail' || control?.status!=='pass') {
    return {...row,status:before.status==='pass'?'already-accessible':'drifted or blocked',reason:before.reason||control?.reason}
  }
  const inheritedPatches=inherited(task,snapshot,templates.filter(template=>template.source!==task.id))
  const direct=templates.flatMap(template=>{
    const rules=instantiateRules(template,snapshot)
    if(!rules) return []
    const patch=candidate(task,template.barrier,rules,{repairMethod:'inheritance',templateId:template.id,'inherited-from':template.source})
    return validate(patch)?[patch]:[]
  })
  const seen=new Set()
  const patchesToTry=[...inheritedPatches,...direct].filter(patch=>{
    const key=JSON.stringify(patch.rules)
    if(seen.has(key)) return false
    seen.add(key)
    return true
  })
  if(!patchesToTry.length) return {...row,status:'no-template-matched'}
  const verdicts=[]
  for(const patch of patchesToTry) {
    if(pauseMs) await delay(pauseMs)
    const after=await replay(task,task.persona,patch)
    if(pauseMs) await delay(pauseMs)
    const pointer=after.status==='blocked'?null:await replay(task,'control',patch)
    verdicts.push({templateId:patch.evidence.templateId,source:patch.evidence['inherited-from'],rules:patch.rules,
      after:compact(after),pointer:compact(pointer)})
    if(after.status==='pass' && pointer?.status==='pass') {
      return {...row,status:'repaired',patch,verdicts,reason:after.reason}
    }
  }
  return {...row,status:verdicts.some(item=>item.after?.status==='pass')?'near-miss':'not-repaired',verdicts,
    reason:verdicts.at(-1)?.after?.reason||verdicts.at(-1)?.pointer?.reason}
}

async function kaneBalance() {
  const text=await requireKane()
  const value=balanceNumber(text)
  if(value===null) throw new Error('Kane balance could not be read.')
  return {text,value}
}

function registeredCandidate(task,patch) {
  const parsed=new URL(task.url)
  const candidate={
    ...task,
    site:parsed.hostname,
    match:parsed.origin+parsed.pathname,
    barrier:patch.barrier,
    rules:patch.rules,
    status:'candidate',
    evidence:{
      repairMethod:patch.evidence?.repairMethod||'inheritance',
      ...(patch.evidence?.templateId?{templateId:patch.evidence.templateId}:{}),
      ...(patch.evidence?.['inherited-from']?{'inherited-from':patch.evidence['inherited-from']}:{})
    },
    history:[]
  }
  if(!validate(candidate)) throw new Error('Family Kane candidate failed schema validation.')
  return candidate
}

async function defaultKaneVerify(site,patch,directory) {
  const task=await normalizeTask({
    id:site.id,url:site.url,persona:patch.persona,task:patch.task,controlTask:patch.controlTask,
    observedSelector:patch.observedSelector,outcomeChecks:patch.outcomeChecks,probe:patch.probe,
    journey:patch.journey,evaluation:patch.evaluation,requiredName:patch.requiredName,
    barrierClass:patch.barrierClass,relatedSelectors:patch.relatedSelectors
  })
  const base=path.join(directory,'sites',site.id)
  await saveJSON(path.join(base,'local-repair.json'),{id:site.id,url:site.url,status:'repaired',rules:patch.rules,verdicts:site.verdicts})
  return fix(task,{
    registeredCandidate:registeredCandidate(task,patch),
    provenance:{sourceLocalRun:relative(path.join(base,'local-repair.json')),repairDirectory:relative(base),
      localOracle:{before:'fail',control:'pass',after:'pass'}},
    persist:async verified=>saveJSON(path.join(base,'patch.json'),verified),
    base
  })
}

export async function runFamily(args,{template,kane=false,replay=replayLane,directory=path.join(ROOT,'proof/family'),
  catalogPatches,templates,policy=familyPolicy,pauseMs=2000,verify,budget=KANE_BUDGET,floor=KANE_FLOOR,siteCap=KANE_SITE_CAP}={}) {
  if(!template) throw new Error('family --template <family-id> is required.')
  const targets=await resolveTargets(args)
  if(targets.length<1) throw new Error('family needs at least one public URL.')
  const patches=catalogPatches??(await readJSON(path.join(ROOT,'extension/bundled.json')))
    .filter(patch=>['verified','locally-verified'].includes(patch.status))
  const allTemplates=templates??await bundledTemplates()
  const familyTemplates=selectFamilyTemplates(template,allTemplates,patches)
  if(!familyTemplates.length) throw new Error('No inherited template matches '+template+'.')
  const donors=patches.filter(patch=>familyTemplates.some(item=>item.source===patch.id))
  const familyMeta=donors[0]?familyOf(donors[0]):recipeMeta(actionSignature(familyTemplates[0].rules))
  const familyName=familyMeta.title||template
  await saveJSON(path.join(directory,'templates.json'),familyTemplates.map(item=>({id:item.id,source:item.source,persona:item.persona,barrier:item.barrier})))
  const sites=[]
  for(const entry of targets) {
    try {sites.push(await scanSite(entry,familyTemplates,patches,{replay,pauseMs}))}
    catch(error) {sites.push({url:entry.url,status:'failed',reason:error.message.split('\n')[0]})}
    await saveJSON(path.join(directory,'results.json'),{template,familyName,sites})
  }
  const repaired=sites.filter(site=>site.status==='repaired')
  for(const site of repaired) {
    const measurement=path.join(directory,'sites',site.id,'local-repair.json')
    await saveJSON(measurement,{id:site.id,url:site.url,rules:site.patch.rules,verdicts:site.verdicts,status:'repaired'})
    site.patch.evidence={...site.patch.evidence,localMeasurement:relative(measurement)}
  }
  let kaneUsed=0,balanceBefore=null,balanceAfter=null,kaneSites=[]
  if(kane) {
    const start=await kaneBalance()
    balanceBefore=start.value
    if(start.value<floor+1) throw new Error('Kane balance '+start.value+' is below the floor of '+floor+'.')
    for(const site of repaired) {
      if(kaneSites.length>=siteCap) {
        site.verification={mode:'capped',reason:'Family scan verifies at most '+siteCap+' sites with Kane.'}
        continue
      }
      const patch=site.patch
      if(patch.evidence?.templateId) await seedFamilyState(patch.evidence.templateId,donors,policy)
      const decided=await familyDecision(site,patch,policy)
      if(decided) {
        site.verification=decided.evidence
        if(decided.evidence.mode==='local-sample-bypass') {
          recordCost('family-sampling',{kaneRunsAvoided:3})
          site.status='locally-verified'
          const measurement=path.join(directory,'sites',site.id,'local-repair.json')
          await saveJSON(measurement,{id:site.id,url:site.url,rules:patch.rules,policy:decided.evidence,verdicts:site.verdicts})
          patch.evidence={...patch.evidence,localMeasurement:relative(measurement)}
          continue
        }
      }
      const remaining=start.value-kaneUsed-floor
      const plan=estimateKanePlan(await normalizeTask({...patch,url:site.url,id:site.id}),{attempts:1})
      if(remaining<1 || kaneUsed>=budget || plan.estimatedCredits>remaining || kaneUsed+plan.estimatedCredits>budget) {
        site.verification={...(site.verification??{}),mode:'budget-skip',
          reason:'Kane budget remaining is '+Math.max(0,Math.min(budget-kaneUsed,remaining))+' credits.'}
        continue
      }
      if(verify!==false) {
        const previousFloor=process.env.CURBCUT_KANE_MIN_CREDITS
        process.env.CURBCUT_KANE_MIN_CREDITS=String(floor)
        const before=await kaneBalance()
        let outcome
        try {outcome=await (verify??((row,candidate)=>defaultKaneVerify(row,candidate,directory)))(site,patch)}
        catch(error) {outcome={status:'failed',reason:error.message.split('\n')[0]}}
        finally {
          if(previousFloor===undefined) delete process.env.CURBCUT_KANE_MIN_CREDITS
          else process.env.CURBCUT_KANE_MIN_CREDITS=previousFloor
        }
        const after=await kaneBalance()
        const spent=before.value-after.value
        kaneUsed+=Number.isFinite(spent)?spent:0
        kaneSites.push({url:site.url,id:site.id,spent,status:outcome.status,reason:outcome.reason})
        site.kane={status:outcome.status,reason:outcome.reason,before:compact(outcome.before),
          control:compact(outcome.control),after:compact(outcome.after)}
        if(outcome.status==='verified') {
          site.status='verified'
          site.patch=outcome.patch??patch
        } else site.kaneReason=outcome.reason||outcome.status
        if(after.value<floor) break
      }
    }
    balanceAfter=(await kaneBalance()).value
    kaneUsed=balanceBefore-balanceAfter
  }
  const rules=repaired[0]?.patch?.rules??donors[0]?.rules??[]
  const evidence=[]
  for(const site of sites) {
    if(site.patch?.evidence?.before) evidence.push(['Kane before '+site.url,site.patch.evidence.before])
    if(site.patch?.evidence?.after) evidence.push(['Kane after '+site.url,site.patch.evidence.after])
    if(site.patch?.evidence?.localMeasurement) evidence.push(['Local measurement '+site.url,site.patch.evidence.localMeasurement])
  }
  const report=createFamilyReport({
    familyId:template,familyName,barrier:familyTemplates[0]?.barrier||donors[0]?.barrier,
    template:familyTemplates[0],sites,rules,evidence
  })
  await saveJSON(path.join(directory,'results.json'),{
    generatedAt:instant(),template,familyName,familyId:familyMeta.id,sites,repaired:repaired.length,
    scanned:sites.length,kane:{enabled:kane,used:kaneUsed,balanceBefore,balanceAfter,floor,budget,sites:kaneSites}
  })
  await writeFile(path.join(directory,'report.md'),report)
  return {template,familyName,sites,repaired:repaired.length,scanned:sites.length,report,directory:relative(directory),
    kane:{enabled:kane,used:kaneUsed,balanceBefore,balanceAfter,sites:kaneSites}}
}
