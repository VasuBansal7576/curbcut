import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {jevKey} from '../core/jev.mjs'
import {ROOT} from '../core/io.mjs'

const extension=path.join(ROOT,'extension')
const skipPrefixes=['INSTANT_','LIVE_NAMES_','VISUAL_STATE_','GLANCE_','FINDER_']
const fixture=`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Civic services</title></head>
<body>
  <header><p>City desk</p></header>
  <main>
    <h1>Find a government service</h1>
    <p class="alert" id="renew-error" role="alert">The permit expired last month.</p>
    <nav>
      <button type="button">Services</button>
      <ul>
        <li><a href="https://travel.state.gov/passports">Travel · Passports</a></li>
        <li><a href="https://www.ssa.gov/">Social Security</a></li>
        <li><a href="https://www.usa.gov/unemployment">Unemployment help</a></li>
        <li><a href="https://city.example/parking/tickets">Pay a parking ticket</a></li>
      </ul>
    </nav>
    <button class="go" type="button">Renew permit</button>
  </main>
  <div class="banner" id="cookie">This site uses cookies to remember your city. <button type="button">OK</button></div>
  <dialog id="hours-dialog" open>
    <p>The counter is open until 4 p.m.</p>
    <button type="button" id="dismiss">Close</button>
  </dialog>
</body>
</html>`

async function extensionScripts() {
  const files=[]
  async function walk(relative='') {
    for (const entry of await readdir(path.join(extension,relative),{withFileTypes:true})) {
      const name=relative?relative+'/'+entry.name:entry.name
      if (entry.isDirectory()) {
        if (entry.name==='fonts' || entry.name==='icons') continue
        await walk(name)
      } else if (entry.isFile() && name.endsWith('.js') && !name.endsWith('-runtime.js') && name!=='runtime.js') {
        files.push(name)
      }
    }
  }
  await walk()
  return files.sort()
}

function sentTypes(source) {
  const types=new Set()
  const patterns=[
    /(?:chrome\.(?:runtime|tabs)\.sendMessage|sendToActiveTab)\(\s*(?:[\w.?[\]]+,\s*)?\{[\s\S]{0,500}?type:\s*["']([A-Z][A-Z0-9_]+)["']/g,
    /(?<![.\w])send\(\s*\{[\s\S]{0,240}?type:\s*["']([A-Z][A-Z0-9_]+)["']/g,
    /broadcast\(\s*["']([A-Z][A-Z0-9_]+)["']/g
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) types.add(match[1])
  }
  return types
}

function handledTypes(source) {
  const types=new Set()
  const prefixes=new Set()
  for (const match of source.matchAll(/case\s+["']([A-Z][A-Z0-9_]+)["']\s*:/g)) types.add(match[1])
  for (const match of source.matchAll(/message\??\.type\s*===\s*["']([A-Z][A-Z0-9_]+)["']/g)) types.add(match[1])
  for (const match of source.matchAll(/startsWith\(\s*["']([A-Z][A-Z0-9_]+)["']\s*\)/g)) prefixes.add(match[1])
  return {types,prefixes}
}

function commandsHandled(source) {
  return new Set([...source.matchAll(/command === ["']([a-z0-9-]+)["']/g)].map(match=>match[1]))
}

async function withExtension(run) {
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-glance-finder-'))
  let context
  try {
    context=await chromium.launchPersistentContext(profile,{
      channel:'chromium',
      headless:true,
      viewport:{width:1280,height:800},
      acceptDownloads:false,
      args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']
    })
    const worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension:'))??
      await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension:'),timeout:8000})
    await run({context,worker,page:context.pages()[0]??await context.newPage()})
  } finally {
    try {await context?.close()}
    finally {await rm(profile,{recursive:true,force:true})}
  }
}

async function tabIdFor(worker,href) {
  const tabId=await worker.evaluate(async href=>{
    const tabs=await chrome.tabs.query({})
    return tabs.find(tab=>tab.url===href || tab.pendingUrl===href)?.id??null
  },href)
  assert.ok(tabId,'The fixture tab was missing.')
  return tabId
}

function refuteUnknown(label,result) {
  assert.notEqual(result?.reason,'unknown-type',label+' returned unknown-type: '+JSON.stringify(result))
  assert.notEqual(result?.reason,'unknown-command',label+' returned unknown-command: '+JSON.stringify(result))
}

test('every sent extension message type has a handler',async()=>{
  const files=await extensionScripts()
  const sent=new Set()
  const handled=new Set()
  const prefixes=new Set()
  const contentSkip=new Set()
  let commandSource=''
  for (const name of files) {
    const source=await readFile(path.join(extension,name),'utf8')
    for (const type of sentTypes(source)) sent.add(type)
    const found=handledTypes(source)
    if (name==='content.js') {
      for (const prefix of found.prefixes) contentSkip.add(prefix)
      for (const type of found.types) handled.add(type)
      continue
    }
    for (const type of found.types) handled.add(type)
    for (const prefix of found.prefixes) prefixes.add(prefix)
    if (name==='background.js') commandSource=source
  }
  assert.deepEqual([...contentSkip].sort(),[...skipPrefixes].sort())
  const missing=[...sent].filter(type=>!handled.has(type) && ![...prefixes,...contentSkip].some(prefix=>type.startsWith(prefix)))
  assert.deepEqual(missing,[],'Unhandled message types: '+missing.join(', '))
  const stolen=[...sent].filter(type=>{
    if (handled.has(type) && !skipPrefixes.some(prefix=>type.startsWith(prefix))) return false
    return skipPrefixes.some(prefix=>type.startsWith(prefix)) && ![...contentSkip].some(prefix=>type.startsWith(prefix))
  })
  assert.deepEqual(stolen,[],'Content script would swallow: '+stolen.join(', '))
  const manifest=JSON.parse(await readFile(path.join(extension,'manifest.json'),'utf8'))
  const commands=Object.keys(manifest.commands||{})
  const handledCommands=commandsHandled(commandSource)
  assert.deepEqual([...commands].sort(),[...handledCommands].sort())
  assert.ok(Object.values(manifest.commands).filter(command=>command.suggested_key).length<=4)
  assert.ok(sent.has('RUN_GLANCE'))
  assert.ok(sent.has('RUN_FINDER'))
  assert.ok(sent.has('FINDER_OPEN'))
  assert.ok(sent.has('GLANCE_PREPARE'))
  assert.ok(handled.has('RUN_GLANCE'))
  assert.ok(handled.has('RUN_FINDER'))
  assert.ok(handled.has('FINDER_OPEN'))
  assert.ok(handled.has('GLANCE_PREPARE'))
})

test('installed Glance and Find a service work on a stubbed public fixture',async()=>{
  await withExtension(async ({context,worker,page})=>{
    await worker.evaluate(async()=>{
      await ensureSeeded()
      await CurbCutJevConfig.set('stub-key')
      const request=fetch
      globalThis.fetch=(url,options)=>{
        if (url==='https://api.typesafe.ai/v1/systemone' && options?.body) {
          const data=JSON.parse(options.body)
          if (data.questions?.dialog) {
            return Promise.resolve(new Response(JSON.stringify({
              model:'jev-test',
              answers:{dialog:{noul:0.96},cookie:{noul:0.91},error:{noul:0.91}}
            }),{status:200}))
          }
          if (data.questions?.match) {
            const choice=Object.keys(data.questions.match.criteria||{}).find(id=>id!=='none')||'none'
            return Promise.resolve(new Response(JSON.stringify({
              model:'jev-test',
              answers:{match:{choice,confidence:0.91}}
            }),{status:200}))
          }
        }
        return request(url,options)
      }
      await chrome.storage.local.set({
        enabled:true,
        glanceEnabled:true,
        finderEnabled:true,
        instantEnabled:true,
        matchMouseEnabled:true,
        liveNamesEnabled:false,
        visualStateEnabled:true,
        stuckEnabled:false,
        patches:[],
        demoPatches:[],
        lastFeedAt:new Date().toISOString()
      })
    })
    const url='https://www.iana.org/'
    await page.route(url,route=>route.fulfill({contentType:'text/html; charset=utf-8',body:fixture}))
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000})
    await page.bringToFront()
    const tabId=await tabIdFor(worker,url)
    const command=async name=>{
      await page.bringToFront()
      return worker.evaluate(async ([name,tabId])=>handleCommand(name,await chrome.tabs.get(tabId)),[name,tabId])
    }
    const glance=await command('glance')
    refuteUnknown('glance',glance)
    assert.equal(glance.ok,true,JSON.stringify(glance))
    const glancePanel=page.locator('[data-curbcut-glance]')
    await glancePanel.waitFor({timeout:5000})
    assert.match(await glancePanel.getByRole('status').innerText(),/Dialog open/)
    const finder=await command('find-service')
    refuteUnknown('find-service',finder)
    assert.equal(finder.ok,true,JSON.stringify(finder))
    const dialog=page.locator('[data-curbcut-finder]')
    await dialog.waitFor({timeout:5000})
    await dialog.locator('input[type=search]').fill('passports')
    await dialog.getByRole('button',{name:'Search'}).click()
    await dialog.getByRole('option').first().waitFor({timeout:5000})
    assert.match(await dialog.getByRole('option').first().innerText(),/Travel|Passport/i)
    await dialog.locator('input[type=search]').fill('renew a visa appointment')
    await dialog.getByRole('button',{name:'Search'}).click()
    await dialog.getByText('Jev chose a destination.').waitFor({timeout:5000})
    const stuck=await command('im-stuck')
    refuteUnknown('im-stuck',stuck)
    assert.equal(stuck.ok,true)
    assert.equal(stuck.report?.title,'Civic services')
    for (const extra of context.pages().filter(item=>item!==page)) await extra.close()
    await page.bringToFront()
    const instant=await command('instant-fix')
    refuteUnknown('instant-fix',instant)
    const mouse=await command('match-mouse')
    refuteUnknown('match-mouse',mouse)
    const sync=await worker.evaluate(async tabId=>{
      const names=await sendToActiveTab({type:'LIVE_NAMES_STATUS'},tabId)
      const states=await sendToActiveTab({type:'VISUAL_STATE_STATUS'},tabId)
      const active=await sendToActiveTab({type:'GET_ACTIVE'},tabId)
      return {names,states,active}
    },tabId)
    refuteUnknown('LIVE_NAMES_STATUS',sync.names)
    refuteUnknown('VISUAL_STATE_STATUS',sync.states)
    refuteUnknown('GET_ACTIVE',sync.active)
    assert.ok(Array.isArray(sync.names?.names))
    assert.ok(Array.isArray(sync.states?.states))
    assert.equal(sync.active?.ok,true)
    await worker.evaluate(async tabId=>{
      await chrome.storage.local.set({pendingStuck:true,capturedTabId:tabId})
    },tabId)
    const popup=await context.newPage()
    await popup.goto(new URL('popup.html',worker.url()).href)
    await popup.locator('#glance-panel').waitFor({state:'visible',timeout:8000})
    const popupMessages=await popup.evaluate(async tabId=>{
      const send=async type=>{
        await chrome.tabs.update(tabId,{active:true})
        return chrome.runtime.sendMessage({type,capturedTabId:tabId,includeMatches:true})
      }
      const types=['QUERY_ACTIVE','GET_STATE','GET_LIVE_NAMES','GET_VISUAL_STATE','CAPTURE_BARRIER','RUN_INSTANT','RUN_GLANCE','RUN_FINDER']
      const out={}
      for (const type of types) out[type]=await send(type)
      return out
    },tabId)
    for (const [type,result] of Object.entries(popupMessages)) refuteUnknown(type,result)
    assert.equal(popupMessages.RUN_GLANCE.ok,true,JSON.stringify(popupMessages.RUN_GLANCE))
    assert.equal(popupMessages.RUN_FINDER.ok,true,JSON.stringify(popupMessages.RUN_FINDER))
    assert.equal(popupMessages.GET_STATE.ok,true)
    assert.equal(popupMessages.QUERY_ACTIVE.ok,true)
    assert.equal(popupMessages.CAPTURE_BARRIER.ok,true)
    await popup.close()
    await page.bringToFront()
    await page.locator('[data-curbcut-glance]').getByRole('heading',{name:'Glance'}).waitFor({timeout:5000})
    await page.locator('[data-curbcut-finder]').getByRole('heading',{name:'Find a service'}).waitFor({timeout:5000})
  })
},{timeout:90000})

test('installed Glance and Find a service run live on usa.gov',async()=>{
  const key=await jevKey()
  assert.ok(key)
  await withExtension(async ({context,worker,page})=>{
    await worker.evaluate(async key=>{
      await ensureSeeded()
      await CurbCutJevConfig.set(key)
      await chrome.storage.local.set({
        enabled:true,
        glanceEnabled:true,
        finderEnabled:true,
        instantEnabled:false,
        matchMouseEnabled:false,
        liveNamesEnabled:false,
        visualStateEnabled:false,
        stuckEnabled:false,
        patches:[],
        demoPatches:[],
        lastFeedAt:new Date().toISOString()
      })
    },key)
    const url='https://www.usa.gov/'
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000})
    assert.ok(response?.ok(),'usa.gov returned HTTP '+response?.status())
    await page.bringToFront()
    const tabId=await tabIdFor(worker,page.url())
    const glance=await worker.evaluate(async tabId=>handleCommand('glance',await chrome.tabs.get(tabId)),tabId)
    refuteUnknown('live glance',glance)
    assert.equal(glance.ok,true,JSON.stringify({ok:glance.ok,reason:glance.reason,count:glance.items?.length}))
    assert.ok(Array.isArray(glance.items))
    await page.locator('[data-curbcut-glance]').getByRole('heading',{name:'Glance'}).waitFor({timeout:8000})
    const finder=await worker.evaluate(async tabId=>handleCommand('find-service',await chrome.tabs.get(tabId)),tabId)
    refuteUnknown('live finder',finder)
    assert.equal(finder.ok,true,JSON.stringify({ok:finder.ok,reason:finder.reason}))
    const dialog=page.locator('[data-curbcut-finder]')
    await dialog.waitFor({timeout:5000})
    await dialog.locator('input[type=search]').fill('passports')
    await dialog.getByRole('button',{name:'Search'}).click()
    await dialog.getByRole('option').first().waitFor({timeout:8000})
    assert.match(await dialog.getByRole('option').first().innerText(),/Travel|Passport/i)
  })
},{timeout:180000})
