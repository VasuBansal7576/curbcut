import path from 'node:path'
import {homedir} from 'node:os'
import {copyFile,writeFile,mkdir,readdir} from 'node:fs/promises'
import {session} from './chrome.mjs'
import {ROOT,command,relative,saveJSON} from './io.mjs'
import {BlockedPage,pageBlock} from './access.mjs'
import {match} from './engine.js'
import {managedKeyboardSelector,taskDestination} from './task.mjs'
import {journeySelectors,outcomeChecks,passageQuote} from './probe.mjs'
import {checkKaneAccess} from './preflight.mjs'

export async function requireKane() {
  const balance=await command('kane-cli',['balance'],{timeout:20000})
  if(balance.code!==0) throw new Error('Kane preflight: '+(balance.stderr || balance.stdout).trim())
  return balance.stdout
}
export function parseRun(processResult) {
  const events=processResult.stdout.split('\n').flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}})
  const end=events.findLast(event=>event.type==='run_end')
  const recording=events.find(event=>event.type==='recording_state')
  const evidence=events.findLast(event=>event.type==='coverage')
  const budgetFailure=/\b(?:turn|step) budget (?:was )?exhausted\b|^Maximum steps exceeded/i.test(end?.reason??'')
  const assertionFailure=end?.status==='failed' && processResult.code===1 && !budgetFailure && (!end.reason_code || end.reason_code.startsWith('assertion_error.'))
  const status=end?.status==='passed' && processResult.code===0?'pass':assertionFailure?'fail':'inconclusive'
  return {status,runId:end?.session_id || recording?.session_id || (end?.session_dir && path.basename(end.session_dir)),reason:end?.reason,summary:end?.summary,resultCode:end?.result_code,reasonCode:end?.reason_code,finalUrl:end?.final_state?.url,credits:end?.credits_consumed??end?.credits??null,pack:evidence?.pack,exitCode:processResult.code,exitSignal:processResult.signal??null,steps:events.filter(e=>e.step && ['failed','done'].includes(e.status)).slice(-12).map(e=>e.remark)}
}
async function capturePack(result,directory) {
  if(!/^[a-f0-9-]{36}$/.test(result.runId ?? '')) throw new Error('Kane did not emit a session ID.')
  const folder=path.join(homedir(),'.testmuai','kaneai','sessions',result.runId,'evidence')
  const validName=name=>/^[a-f0-9-]{36}\.evidence$/.test(name)
  const announced=result.pack && path.basename(result.pack)
  if(announced && (!validName(announced) || path.normalize(result.pack)!==path.join(folder,announced))) {
    throw new Error('Kane announced an unexpected evidence path.')
  }
  const files=await readdir(folder,{withFileTypes:true}).catch(error=>{
    if(error.code==='ENOENT') return []
    throw error
  })
  const sealed=files.filter(file=>file.isFile() && validName(file.name))
  const filename=announced??(sealed.length===1?sealed[0].name:null)
  if(!filename) throw new Error(sealed.length?'Multiple unannounced Kane packs.':'No sealed Kane pack was found in the session.')
  const pack=path.join(directory,filename)
  await copyFile(path.join(folder,filename),pack)
  result.evidencePack=relative(pack)
  const validation=await command('kane-cli',['evidence','validate','--json',pack],{timeout:25000})
  await writeFile(path.join(directory,'pack-validation.json'),validation.stdout)
  try {result.evidenceValid=validation.code===0 && JSON.parse(validation.stdout).valid===true}
  catch {result.evidenceValid=false}
  if(!result.evidenceValid) throw new Error('The sealed Kane pack failed validation.')
}
async function focusedFrame(page,selector) {
  const matches=await Promise.all(page.frames().filter(frame=>frame!==page.mainFrame()).map(async frame=>{
    const focused=await frame.evaluate(selector=>document.hasFocus() && Boolean(document.querySelector(selector)),selector).catch(()=>false)
    return focused?frame:null
  }))
  return matches.find(Boolean)
}

async function inspect(page,task,patch,frame) {
  const hints=journeySelectors(task)
  const argumentsForPage={observedSelector:task.observedSelector,hints,rules:patch?.rules??[],action:task.probe?.action,managedKeyboardSelector}
  const info=await page.evaluate(({observedSelector,hints,rules,action,managedKeyboardSelector})=>{
    const matches=observedSelector?[...document.querySelectorAll(observedSelector)]:[]
    const target=matches.length===1?matches[0]:null
    const reader=target && CurbCut?.readerRow(target)
    return {
    harness:globalThis.__curbcutState,
    snapshot:globalThis.CurbCut?.snapshot(observedSelector,hints),
    readerVisible:!!document.querySelector('dialog[data-curbcut-reader]:modal'),
    width:innerWidth,
    target:target?{visible:target.checkVisibility({visibilityProperty:true}),tabIndex:target.tabIndex,managedKeyboard:!!target.closest(managedKeyboardSelector),
      reader:reader?.row.isConnected?{...reader.info,usable:action==='type'?!!reader.row.querySelector('input'):reader.row.localName==='button'}:null}:null,
    ruleMatches:rules.map(({action,selector})=>({action,selector,count:document.querySelectorAll(selector).length}))
  }},argumentsForPage).catch(()=>null)
  if(info && frame) {
    const snapshot=await frame.evaluate(({selector,hints})=>globalThis.CurbCut?.snapshot(selector,hints),{selector:task.observedSelector,hints}).catch(()=>null)
    if(snapshot) info.snapshot=snapshot
  }
  return info
}

const instructions={
 'keyboard-only':'Use only keyboard input. Use Tab or Shift+Tab to move focus and Enter or Space to activate the exact control. Move in whichever direction is shorter. Group repeated Tab presses if supported, checking focus frequently. Do not click, focus elements directly, use JavaScript, or navigate directly to the destination.',
 'screen-reader-view':'Work exclusively inside the Reading view dialog. Use the exact listed role and name for the requested control.',
 'low-vision':'Use the locked 320 CSS pixel viewport and scroll vertically only.',
 'low-contrast-simulation':'Use only the visible screenshot to read the requested text under the low contrast sensitivity simulation. Do not use DOM, accessibility text, page source, zoom, or controls to reveal unreadable text. Report the exact text if legible. Otherwise fail the task and report that it is unreadable.',
 'color-blind':'Keep the color simulation active.',
 control:'Use the normal visual page and a pointer.'
}
const limits={
  'keyboard-only':{maxSteps:50,timeout:360},
  'screen-reader-view':{maxSteps:24,timeout:250},
  'low-vision':{maxSteps:26,timeout:360},
  'low-contrast-simulation':{maxSteps:8,timeout:120},
  'color-blind':{maxSteps:24,timeout:250},
  control:{maxSteps:22,timeout:300}
}
function kaneLimits(task,persona,options={}) {
  const defaults=limits[persona]
  const maxSteps=options.maxSteps??Number(process.env.CURBCUT_KANE_MAX_STEPS??defaults.maxSteps)
  return {maxSteps,timeout:options.timeout??Math.max(defaults.timeout,maxSteps*6),
    assertionMode:options.assertionMode??(persona==='low-contrast-simulation' || task.evaluation?.category==='low-contrast' || !task.probe && persona==='low-vision'?'visual':'dom')}
}

async function keyboardHint(page,task) {
  if(!task.probe || !task.observedSelector) return null
  const result=await page.evaluate(({selector,managedKeyboardSelector})=>{
    const targets=document.querySelectorAll(selector)
    if(targets.length!==1) return null
    const [target]=targets
    if(!target.checkVisibility({visibilityProperty:true}) || target.closest(managedKeyboardSelector)) return null
    if(target.tabIndex<0) return {excluded:true}
    const ordered=[...document.querySelectorAll('a[href],button,input,textarea,select,summary,iframe,[tabindex],[contenteditable]')]
      .filter(node=>node.tabIndex>=0 && !node.matches(':disabled') && !node.closest('[inert]') && node.checkVisibility({visibilityProperty:true}))
      .sort((left,right)=>(left.tabIndex||32768)-(right.tabIndex||32768))
    const index=ordered.indexOf(target)
    if(index<0 || ![document.body,document.documentElement].includes(document.activeElement)) return null
    return {forward:index+1,reverse:ordered.length-index}
  },{selector:task.observedSelector,managedKeyboardSelector}).catch(()=>null)
  if(result?.excluded) return 'The exact visible target is outside the sequential Tab order in the initial browser state. Check this with several real focus moves, including forward Tab. Do not search for a different control.'
  if(!result) return null
  const forward=result.forward<=result.reverse
  return 'Initial focus order suggests roughly '+(forward?result.forward:result.reverse)+' '+(forward?'Tab':'Shift+Tab')+' presses. Check actual focus and stop on the exact target.'
}

export function replayObjective(task,persona,{patched=false,hint=null}={}) {
  const keyboard=persona==='keyboard-only'
  const baseline=persona!=='control' && !patched
  const journeyKeys=keyboard?' Use the declared arrow keys and Escape as needed.':''
  const guidance=task.journey?
    'Complete the registered journey in order and check each requested outcome.'+journeyKeys+' Do not use a substitute destination or control.':
    task.probe?.action==='read'?
    'Find the quoted passage directly using page search or vertical scrolling. Once there, look at the start of the passage, report whether the text fits across the viewport, and stop. Do not scroll through the rest of the page.':
    task.probe && keyboard?
      'Keep focus on the page. When the exact control receives focus, activate it and check the outcome once.':
      task.probe?'Test the exact target and report the outcome once.':null
  const menu=keyboard && task.barrierClass===1?
    'Tab to the menu opener. Use Arrow Down if focus alone does not reveal the submenu. Press Enter only on the required submenu link.' : null
  const failure=keyboard && baseline?'If a required control is missing, invisible, or cannot be reached, report the task as failed.':null
  return [instructions[persona],guidance,menu,baseline?hint:null,failure,
    'Stay on this public site. Do not sign in, register, pay, send or submit anything, or interact with a CAPTCHA or access challenge. Leave fixture settings unchanged. Use visible controls only.',
    persona==='control' && task.controlTask?task.controlTask:task.task].filter(Boolean).join(' ')
}

export function judgeJourney({task,persona,events,checks,kaneStatus}) {
  const pointer=persona==='control' || persona==='low-vision'
  const verified=checks.length>0 && checks.every(Boolean)
  let position=0,matched=0,prior=null
  const missed=[]
  const scoped=events.filter(event=>event.top)
  function finds(step,index) {
    if(step.action==='observe') return null
    const selector=pointer?step.pointer?.selector??step.selector:step.selector
    const method=pointer?step.pointer?.action??'click':step.action
    const key=step.key==='Space'?' ':step.key==='Shift+Tab'?'Tab':step.key
    if(pointer && method==='hover' && task.barrierClass!==1) return null
    if(pointer && prior?.selector===selector && prior.method===method && method==='hover') return null
    const match=event=>{
      if(!event.stepTargets?.includes(selector)) return false
      if(pointer) return event.type===(method==='hover'?'pointer-hover':'pointer-click') &&
        (persona!=='low-vision' || event.stepGeometry?.[selector]===true)
      if(persona==='screen-reader-view') {
        if(step.reader && (event.role!==step.reader.role || event.name!==step.reader.name)) return false
        return method==='activate'?event.type==='reader-activate':event.type==='reader-key' && event.key===key
      }
      if(method==='focus') return event.type==='tab-focus'
      if(method==='activate') return event.type==='activate' && (task.barrierClass!==1 || event.focused===true)
      if(key==='Tab') return event.type==='tab' && Boolean(event.reverse)===(step.key==='Shift+Tab')
      if(key==='Enter' || key===' ') return event.type==='activate' && event.key===key
      return event.type==='key' && event.key===key
    }
    const next=scoped.findIndex((event,eventIndex)=>eventIndex>=position && match(event))
    if(next===-1 && task.barrierClass===1 && method==='key' && key==='ArrowDown') return null
    if(next===-1) return {index,selector,method}
    position=next+1
    matched++
    prior={selector,method}
    return null
  }
  for(const [index,step] of task.journey.entries()) {
    const miss=finds(step,index)
    if(miss) {missed.push(miss);break}
    if(step.checks) {
      const checkpoint=scoped.findIndex((event,eventIndex)=>eventIndex>=position && event.type==='journey-checkpoint' && event.index===index)
      if(checkpoint===-1) {missed.push({index,selector:step.selector,method:'checkpoint'});break}
      position=checkpoint+1
    }
  }
  if(kaneStatus==='pass' && verified && matched && !missed.length) return {status:'pass',basis:'recorded-journey-and-outcome'}
  if(persona==='keyboard-only' && !verified && scoped.some(event=>event.type==='blocked-activation' &&
    task.journey.some(step=>(step.action==='activate' || step.action==='key' && ['Enter','Space'].includes(step.key)) &&
      event.stepTargets?.includes(step.selector)))) return {status:'fail',basis:'required-keyboard-activation-invisible',missed}
  const missedCheckpoint=task.journey.some((step,index)=>step.checks && !scoped.some(event=>event.type==='journey-checkpoint' && event.index===index))
  if(kaneStatus==='fail' && (!verified || missedCheckpoint) &&
    (matched || persona==='keyboard-only' && scoped.filter(event=>event.type==='tab').length>=2 ||
      persona==='screen-reader-view' && scoped.some(event=>event.type==='reader-activate'))) {
    return {status:'fail',basis:'recorded-journey-failed',missed}
  }
  return {status:'inconclusive',basis:'complete-journey-not-witnessed',missed}
}

export function judgeProbe({task,persona,events,inspection,checks,kaneStatus}) {
  const targetEvents=events.filter(event=>event.targetMatches)
  const documentId=inspection.harness.documentId
  const correct=checks.length>0 && checks.every(Boolean)
  if(passageQuote(task)) {
    const witness=targetEvents.findLast(event=>event.type==='passage' && event.top && event.documentId===documentId)
    if(!witness) return {status:'fail',basis:'passage-not-reached',repairEvidence:false}
    if(!checks[task.outcomeChecks.findIndex(check=>check.kind==='contains' && check.selector===task.observedSelector)]) {
      return {status:'inconclusive',basis:'passage-changed'}
    }
    if(correct && persona==='low-vision' && events.some(event=>event.type==='horizontal' && event.top)) {
      return {status:'inconclusive',basis:'horizontal-scroll'}
    }
    if(witness.geometry.fits!==correct) return {status:'inconclusive',basis:'passage-layout-changed'}
    return {status:correct?'pass':'fail',basis:'recorded-passage-width',witness:witness.geometry}
  }
  if(persona==='screen-reader-view' && task.requiredName) {
    const eventType=task.probe.action==='type'?'reader-text':'reader-activate'
    const interactions=targetEvents.filter(event=>event.type===eventType)
    const named=interactions.some(event=>event.name===task.requiredName && event.role===task.probe.role)
    const row=inspection.target?.reader
    if(!named && (interactions.length || (inspection.target && (!row || row.name!==task.requiredName || row.role!==task.probe.role || !row.usable)))) {
      return {status:'fail',basis:'required-reader-control-unavailable'}
    }
    if(!named) return {status:'inconclusive',basis:'reader-control-not-used'}
    return {status:correct?'pass':'fail',basis:'named-reader-interaction'}
  }
  if(persona==='keyboard-only') {
    if(!correct && targetEvents.some(event=>event.type==='blocked-activation')) {
      return {status:'fail',basis:'required-keyboard-activation-invisible'}
    }
    const key=task.probe.action==='type'?'text':'activate'
    const actionIndex=targetEvents.findLastIndex(event=>event.type===key)
    const action=targetEvents[actionIndex]
    const reached=action && targetEvents.slice(0,actionIndex).some(event=>event.type==='tab-focus' && event.documentId===action.documentId)
    if(reached) return {status:correct?'pass':'fail',basis:'trusted-keyboard-interaction'}
    if(correct) return {status:'inconclusive',basis:'keyboard-target-action-unproven'}
    const tabs=events.filter(event=>event.type==='tab' && event.documentId===documentId)
    const focus=events.filter(event=>event.type==='tab-focus' && event.documentId===documentId)
    if(inspection.target?.visible && !inspection.target.managedKeyboard && tabs.length>=Math.max(2,task.minimumTabPresses??0) &&
      !targetEvents.some(event=>event.type==='tab-focus') &&
      (inspection.target.tabIndex<0 || focus.some(event=>event.revisited) && kaneStatus==='fail')) {
      return {status:'fail',basis:'target-skipped-by-tab',tabs:tabs.length,tabIndex:inspection.target.tabIndex}
    }
    return {status:'inconclusive',basis:'keyboard-traversal-incomplete'}
  }
  if(persona==='control' && !correct && kaneStatus==='pass') return {status:'fail',basis:'recorded-control-outcome-absent'}
  if(persona==='control' && correct && task.probe.action==='type' && events.some(event=>event.targetMatches && event.type==='pointer-text')) {
    return {status:'pass',basis:'trusted-control-text'}
  }
  if(persona==='control' && correct && task.probe.action==='click' && events.some(event=>event.targetMatches && event.type==='pointer-click')) {
    return {status:'pass',basis:'trusted-control-activation'}
  }
  return {status:'inconclusive',basis:'control-target-action-unproven'}
}

export async function runKane(task,persona,patch,directory,options={}) {
  if(task.persona==='document-language') throw new Error('Document language uses local measurement.')
  const {maxSteps,timeout,assertionMode}=kaneLimits(task,persona,options)
  if(!Number.isInteger(maxSteps) || maxSteps<1 || maxSteps>70) throw new Error('Kane max steps must be an integer from 1 to 70.')
  if(!Number.isInteger(timeout) || timeout<1 || timeout>900) throw new Error('Kane timeout must be an integer from 1 to 900 seconds.')
  await mkdir(directory,{recursive:true})
  const minimumBalance=Number(process.env.CURBCUT_KANE_MIN_CREDITS ?? 0)
  if(!Number.isFinite(minimumBalance) || minimumBalance<0) throw new Error('CURBCUT_KANE_MIN_CREDITS must be a nonnegative number.')
  if(minimumBalance>0) {
    const balance=await requireKane()
    await writeFile(path.join(directory,'balance-before.txt'),balance)
    const available=Number(balance.match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
    if(!Number.isFinite(available) || available<minimumBalance) throw new Error('Kane balance is below the run threshold of '+minimumBalance+' credits.')
  }
  let browser,access
  try {
    browser=await session(task,persona,patch,directory,{gate:true})
    access=await checkKaneAccess(browser,task,persona)
  }
  catch(error) {
    await browser?.abort()
    if(!(error instanceof BlockedPage)) throw error
    const result={status:'blocked',runner:'playwright-cdp',reason:error.message}
    await saveJSON(path.join(directory,'result.json'),result)
    return result
  }
  try {
    const outcomeLocator=task.successSelector?browser.page.locator(task.successSelector).first():null
    if(await outcomeLocator?.isVisible()) throw new Error('The expected outcome is already visible before the run.')
    const checksBefore=task.journey?[...task.journey.flatMap(step=>step.checks??[]),...task.outcomeChecks]:task.outcomeChecks
    if((task.journey || task.probe && task.probe.action!=='read') && (await outcomeChecks(browser.page,task,persona,checksBefore)).every(Boolean)) {
      const result={status:'inconclusive',runner:'playwright',reason:'The registered outcome held before Kane started.'}
      await browser.abort()
      await saveJSON(path.join(directory,'result.json'),result)
      return result
    }
    const hint=persona==='keyboard-only' && !patch?await keyboardHint(browser.page,task):null
    const objective=replayObjective(task,persona,{patched:Boolean(patch),hint})
    const args=['run','--target','desktop','--headless','--agent','--local','--global-context','/dev/null','--local-context','/dev/null','--cdp-endpoint',browser.endpoint,'--url',task.url,'--max-steps',String(maxSteps),'--timeout',String(timeout),'--final-validation',task.probe || task.journey?'off':'on','--assertion-mode',assertionMode,'--assertion-failure-mode','stop',objective]
    const processResult=await command('kane-cli',args,{timeout:(timeout+90)*1000,processGroup:true})
    await writeFile(path.join(directory,'events.ndjson'),processResult.stdout)
    await writeFile(path.join(directory,'stderr.txt'),processResult.stderr)
    const result=parseRun(processResult)
    result.preflight=access
    result.objective=objective
    result.kaneStatus=result.status
    result.limits={maxSteps,timeout,assertionMode}
    await capturePack(result,directory).catch(error=>{result.evidenceError=error.message})
    delete result.pack
    const page=await browser.activePage(result.finalUrl)
    const chain=await browser.lineage(page)
    const recordings=chain.length && chain[0]===browser.page?chain:null
    const finalPatch=page && patch && match(patch,page.url())?patch.id:null
    const frame=page && persona==='keyboard-only' && task.observedSelector?
      await focusedFrame(page,task.observedSelector):null
    const inspection=page?await inspect(page,task,patch,frame):null
    const trail=recordings?recordings.map((target,index)=>({
      index,events:browser.observations.get(target).events
    })):[]
    const events=trail.flatMap(recording=>recording.events)
    const key=task.probe?.action==='type'?'text':task.keyboardEvidence??'activate'
    const targetEvents=task.probe?events.filter(event=>event.targetMatches):events
    const record=(reason)=>{
      result.status='inconclusive'
      result.integrity=reason
    }
    const blocked=page && await pageBlock(page,browser.responses.get(page))
    if(blocked) {
      result.status='blocked'
      result.integrity='Recorded browser access failed: '+blocked
    } else if(!result.evidenceValid) {
      const reason=result.exitSignal?'Kane exited on '+result.exitSignal+' before producing validated evidence.':result.reason??result.evidenceError
      record(reason??'Kane ended without validated evidence.')
    }
    else if(!result.runId || !recordings || !taskDestination(task,new URL(page.url())) ||
      !inspection || inspection.harness?.persona!==persona || (inspection.harness.patchId??null)!==finalPatch ||
      !events.some(event=>event.type==='document' && event.top && event.documentId===inspection.harness.documentId) ||
      (persona==='screen-reader-view' && !inspection.readerVisible) ||
      (persona==='low-vision' && (inspection.width!==320 || inspection.harness.maxWidth!==320 || (!task.probe && (inspection.harness.horizontalScroll ||
        events.some(event=>event.type==='horizontal' && event.top)))))) {
      record('Could not confirm the persona and repair state on the recorded outcome page.')
    }
    if(!result.integrity && task.evaluation?.role) {
      const {role,name}=task.evaluation
      const row=inspection?.target?.reader
      const hit=events.some(event=>event.targetMatches && (persona==='control'?event.type==='coverage-pointer':
        event.type==='reader-activate' && event.role===role && event.name===name))
      if(result.status==='pass' && !hit) record('The recording does not show the requested target being identified.')
      if(result.status==='fail' && persona==='screen-reader-view' && !patch && (!inspection?.target?.visible || row?.name)) {
        record('The recording does not establish that the visible target lacked an accessible name.')
      }
    }
    if(!result.integrity && task.evaluation?.category==='low-contrast' && result.status==='pass') {
      const actual=JSON.stringify([result.summary,result.reason,result.steps]).toLowerCase()
      if(!actual.includes(task.evaluation.text.toLowerCase())) record('Kane did not report the exact registered text.')
    }
    if(task.outcomeChecks) {
      const checks=await outcomeChecks(page,task,persona)
      result.outcomeChecks=checks
      if(task.journey && !result.integrity) {
        const verdict=judgeJourney({task,persona,events,checks,kaneStatus:result.kaneStatus})
        result.browserVerdict=verdict
        if(verdict.status==='inconclusive') record(verdict.basis)
        else result.status=verdict.status
      }
      const replayable=Boolean(passageQuote(task)) || (task.probe && task.probe.action!=='read')
      if(replayable && !result.integrity &&
        (result.kaneStatus!=='inconclusive' || /^(?:stuck\.|assertion_error\.)/.test(result.reasonCode??''))) {
        const verdict=judgeProbe({task,persona,events,inspection,checks,kaneStatus:result.kaneStatus})
        result.browserVerdict=verdict
        result.inspectionTarget=inspection.target
        if(verdict.status==='inconclusive' || verdict.repairEvidence===false) record(verdict.basis)
        else result.status=verdict.status
      } else if(!replayable && result.status==='pass' && !checks.every(Boolean)) record('The declared outcome was absent from the recorded browser.')
    }
    if(!task.probe && !task.journey && result.status==='pass' && persona==='keyboard-only' && !targetEvents.some(event=>event.type===key)) {
      record(key==='text'?'The browser did not observe trusted text input on the required control.':'The browser did not observe a trusted Enter or Space keypress on the required control.')
    }
    if(result.status==='fail' && persona==='keyboard-only' && task.minimumTabPresses && !patch &&
      events.filter(event=>event.type==='tab').length<task.minimumTabPresses) {
      record('The recorded baseline did not include the required trusted Tab traversal.')
    }
    if(result.status==='pass' && patch && !events.some(event=>event.type==='rule' && event.patchId===patch.id)) {
      record('No candidate rule matched in the recorded page sequence.')
    }
    if(!task.probe && !task.journey && result.status==='pass' && task.requiredName && persona==='screen-reader-view') {
      const readerEvent=task.probe?.action==='type'?'reader-text':'reader-activate'
      const matched=targetEvents.some(event=>event.type===readerEvent && event.name===task.requiredName && (!task.probe || event.role===task.probe.role))
      if(!matched && !inspection.snapshot?.nodes.some(node=>node.selector===task.observedSelector && node.name===task.requiredName)) {
        record('The required accessible control was absent from the recorded Reading view interaction.')
      }
    }
    if(outcomeLocator) {
      result.observedOutcome={selector:task.successSelector,visible:await page?.locator(task.successSelector).first().isVisible().catch(()=>false)??false}
      if(result.status==='pass' && !result.observedOutcome.visible) {
        result.status='inconclusive'
        result.integrity='The task outcome was absent from the recorded browser.'
      }
      if(result.status==='fail' && result.observedOutcome.visible) {
        result.status='inconclusive'
        result.integrity='The expected outcome was present despite the failed checkpoint.'
      }
    }
    result.runner='kane'
    result.recordingTrail=trail
    result.inspection=inspection && {harness:inspection.harness,readerVisible:inspection.readerVisible,width:inspection.width,ruleMatches:inspection.ruleMatches}
    result.snapshot=inspection?.snapshot
    result.video=relative(path.join(directory,'recording.mp4'))
    await browser.finish(path.join(ROOT,result.video),recordings??[browser.page]).catch(error=>{
      record('Could not finalize the viewport recording: '+error.message)
      delete result.video
    })
    await saveJSON(path.join(directory,'result.json'),result)
    if(minimumBalance>0) await writeFile(path.join(directory,'balance-after.txt'),await requireKane())
    return result
  } catch(error) {await browser.abort().catch(()=>{});throw error}
}
