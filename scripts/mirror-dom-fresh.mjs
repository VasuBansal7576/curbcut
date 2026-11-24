import {chromium} from 'playwright'
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {guardRequests,session} from '../core/chrome.mjs'
import {journeyLane} from '../core/probe.mjs'
import {pageBlock} from '../core/access.mjs'
import {acceptableURL,allowedHost,siteKey} from '../core/task.mjs'

const report = 'proof/mirror-dom/fresh-results.json'
const draw = JSON.parse(await readFile('proof/mirror-dom/fresh-draw.json'))
const extension = path.resolve('extension')
const bundled = new Set(JSON.parse(await readFile('extension/bundled.json')).map(row => siteKey(new URL(row.url))))
const runtime = await readFile('extension/runtime.js','utf8')
const rows = []
const snapshot = page => page.evaluate(() => [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[role=menuitem],[role=button],[tabindex]')]
  .filter(node => node.checkVisibility({visibilityProperty:true,opacityProperty:true}) && !node.closest('[inert],[aria-hidden=true]') &&
    !node.matches(':disabled,[aria-disabled=true]') && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0)
  .map(node => ({selector:CurbCut.exactSelector(node),href:node.matches('a[href]') ? node.href : '',focused:node === document.activeElement})))
const id = node => JSON.stringify([node.selector,node.href])
const keys = nodes => nodes.map(id).sort()
const same = (a,b) => JSON.stringify(keys(a)) === JSON.stringify(keys(b))
const diff = (before,after) => {
  const prior = new Set(keys(before))
  return after.filter(node => !prior.has(id(node)))
}

async function profile(url, installed, work) {
  const dir = await mkdtemp(path.join(tmpdir(),'mirror-dom-'))
  let context
  try {
    context = await chromium.launchPersistentContext(dir,{channel:'chromium',headless:true,viewport:{width:1280,height:900},
      args:installed ? ['--disable-extensions-except='+extension,'--load-extension='+extension] : []})
    await guardRequests(context,{url},{extension:installed})
    await context.addInitScript({content:runtime})
    const page = context.pages()[0]
    const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:11000})
    await delay(300)
    if (!response?.ok()) throw Error('HTTP '+response?.status())
    const landed = new URL(page.url())
    if (!acceptableURL(landed) || bundled.has(siteKey(landed))) throw Error('redirect out of scope')
    const block = await pageBlock(page,response)
    if (block) throw Error(String(block.reason ?? block))
    await page.evaluate(() => {
      for (const type of ['click','submit']) addEventListener(type,event => {
        event.preventDefault()
        event.stopImmediatePropagation()
      },true)
      navigation.addEventListener('navigate',event => { if(event.cancelable) event.preventDefault() })
    })
    return await work(page,context)
  } finally {
    await context?.close()
    await rm(dir,{recursive:true,force:true})
  }
}

async function neutral(page) {
  await page.mouse.move(-1,-1)
  await page.evaluate(() => {
    document.activeElement.blur()
    scrollTo({top:0,left:0,behavior:'instant'})
  })
  await delay(180)
  return snapshot(page)
}

async function mouse(page,selector) {
  const baseline = await neutral(page)
  await page.locator(selector).hover({timeout:900})
  await delay(220)
  return diff(baseline,await snapshot(page))
}

async function keyboard(page, selector, count, seeded = false) {
  const baseline = await neutral(page)
  const target = page.locator(selector)
  if (seeded) await target.focus({timeout:1000})
  else {
    let found = false
    for (let index=0; index<65; index++) {
      await page.keyboard.press('Tab')
      if (await target.evaluate(node => node === document.activeElement)) {found=true;break}
    }
    if (!found) return null
  }
  const reached = new Map()
  const observe = async () => {
    for (const node of diff(baseline,await snapshot(page))) if (node.focused) reached.set(id(node),node)
  }
  await delay(180)
  await observe()
  for(let index=0;index<count;index++) {
    await page.keyboard.press(index===0?'ArrowDown':'Tab')
    await delay(65)
    await observe()
  }
  return [...reached.values()]
}

async function scout(page) {
  const triggers = await page.evaluate(() => [...document.querySelectorAll(
    'nav a[href],nav button,[role=navigation] a[href],[role=navigation] button,header a[aria-haspopup],header button[aria-controls]')]
    .filter(node => node.tabIndex >= 0 && node.checkVisibility({visibilityProperty:true}) &&
      (node.hasAttribute('aria-controls') || node.hasAttribute('aria-haspopup') ||
        node.closest('li')?.querySelector('ul, [role=menu], li li, .dropdown-menu')))
    .map(node => CurbCut.exactSelector(node)).slice(0,8))
  let hovered = 0
  for (const selector of triggers) {
    if (await page.locator(selector).count() !== 1) continue
    const pointer = await mouse(page,selector).catch(() => [])
    if (!pointer.some(node => node.href) || pointer.length > 12) continue
    hovered++
    const url = page.url()
    const reached = await keyboard(page,selector,pointer.length+3)
    if (reached && page.url()===url && pointer.some(node => node.href && !keys(reached).includes(id(node)))) {
      return {eligible:true,url,selector,pointer,baselineKeyboard:reached}
    }
  }
  return {eligible:false,reason:!triggers.length?'no navigation trigger':'no bounded keyboard gap',triggers:triggers.length,hovered}
}

async function trial(entry) {
  const result = await profile(entry.url,true,async (page,context) => {
    await page.locator(entry.selector).focus({timeout:1500})
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker',{timeout:5000})
    const started = performance.now()
    const detected = await worker.evaluate(async () => {
      await chrome.storage.local.set({matchMouseEnabled:true})
      return matchMouse((await chrome.tabs.query({active:true,currentWindow:true}))[0])
    })
    return {detected,elapsedMs:Math.round(performance.now()-started)}
  })
  if (!result.detected.matched) return {...result,status:'no-match'}
  const {patch} = result.detected
  const oracleDir = await mkdtemp(path.join(tmpdir(),'mirror-oracle-'))
  try {
    const replay = {}
    for (const persona of ['control','keyboard-only']) {
      const browser = await session(patch,persona,patch,oracleDir,{local:true,navigationTimeout:11000})
      try { replay[persona] = await journeyLane(browser,patch,persona) }
      finally { await browser.abort() }
    }
    const pointer = await profile(entry.url,false,async page => {
      await page.evaluate(patch=>{ CurbCut.apply(patch) },patch)
      return mouse(page,entry.selector)
    })
    const reached = await profile(entry.url,false,async page => {
      await page.evaluate(patch=>{ CurbCut.apply(patch) },patch)
      return keyboard(page,entry.selector,entry.pointer.length+3)
    })
    const pointerRegression = !same(entry.pointer,pointer)
    const reachable = reached && same(entry.pointer,reached)
    return {...result,status:reachable?'match':'wrong-match',pointerRegression,pointer,reached,
      oracle:Object.fromEntries(Object.entries(replay).map(([lane,value])=>[lane,{status:value.status,reason:value.reason}]))}
  } catch (error) {
    return {...result,status:'oracle-inconclusive',reason:error.message}
  } finally { await rm(oracleDir,{recursive:true,force:true}) }
}

const save = () => writeFile(report,JSON.stringify({draw:'d764df9',rows},null,2)+'\n')
for (const candidate of draw.candidates) {
  if (rows.filter(row=>row.scout.eligible).length >= draw.target) break
  let scouting
  const errors = []
  try {
    if (!await allowedHost(new URL(candidate.url).hostname)) throw Error('non-public DNS')
    for (let attempt=0;attempt<2;attempt++) {
      try { scouting=await profile(candidate.url,false,scout);break }
      catch (error) { errors.push(error.message.slice(0,400));await delay(650) }
    }
  } catch (error) { errors.push(error.message.slice(0,400)) }
  scouting ??= {eligible:false,reason:'page unavailable',errors}
  const row = {...candidate,scout:scouting}
  if (scouting.eligible) {
    try { row.trial=await trial(scouting) }
    catch (error) { row.trial={status:'trial-error',reason:error.message.slice(0,400)} }
  }
  rows.push(row)
  await save()
  console.log(rows.length,candidate.site,scouting.eligible ? row.trial.status : scouting.reason)
  await delay(650)
}
