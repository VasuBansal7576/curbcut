import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {ROOT,saveJSON} from '../core/io.mjs'
import {jevKey} from '../core/jev.mjs'
import {stuckThreshold} from '../core/jev-stuck.js'
import {contentWorld} from './jev-live-extension-e2e.mjs'

const url='https://www.mass.edu/'
const about='#mainnav > nav > ul > li:nth-of-type(1) > a'
const destination='#mainnav > nav > ul > li:nth-of-type(1) > ul a[href$="/about/aboutdhe.asp"]'
const extension=path.join(ROOT,'extension')
const key=await jevKey()
assert(key,'Set CURBCUT_JEV_KEY_FILE to a file containing a Jev key')
const profile=await mkdtemp(path.join(tmpdir(),'curbcut-jev-keyboard-live-'))
let context
try {
  context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,
    viewport:{width:1366,height:900},args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']})
  const worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension:'))??
    await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension:')})
  await worker.evaluate(async key=>{
    await ensureSeeded()
    await CurbCutJevConfig.set(key)
    await chrome.storage.local.set({
      enabled:true,stuckEnabled:true,liveNamesEnabled:false,readerEnabled:false,
      patches:[],demoPatches:[],lastFeedAt:new Date().toISOString()
    })
    globalThis.keyboardRun=[]
    const evaluate=evaluateStuck
    evaluateStuck=async(sender,trace)=>{
      const row={trace:CurbCutStuck.cleanTrace(trace)}
      keyboardRun.push(row)
      row.result=await evaluate(sender,trace)
      return row.result
    }
    const fetchOriginal=fetch
    globalThis.fetch=async(url,options)=>{
      const response=await fetchOriginal(url,options)
      if(url==='https://api.typesafe.ai/v1/systemone' &&
        JSON.parse(options?.body??'{}').questions?.stuck) {
        const row=keyboardRun.at(-1)
        if(row) {
          const data=await response.clone().json().catch(()=>null)
          row.provider={httpStatus:response.status,probability:data?.answers?.stuck?.noul??null}
        }
      }
      return response
    }
  },key)
  const page=context.pages()[0]
  const inspect=await contentWorld(context,page)
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:28000})
  assert(response?.ok())
  await page.bringToFront()
  await page.locator(about).waitFor()
  const offer=page.locator('[data-curbcut-offer]')
  let activeRepairs
  for(let attempt=0;attempt<16;attempt+=1) {
    activeRepairs=await worker.evaluate(async()=>{
      const [tab]=await chrome.tabs.query({active:true,currentWindow:true})
      return (await chrome.tabs.sendMessage(tab.id,{type:'GET_ACTIVE'}).catch(()=>null))?.active.length
    })
    if(activeRepairs!==undefined) break
    await page.waitForTimeout(250)
  }
  assert.equal(activeRepairs,0)
  const privacy=await inspect(()=>({
    capture:CurbCutExt.canCapturePage(location.href,document),
    instantPrivacy:CurbCut.instantPrivacy(),
    populatedVisibleFields:[...document.querySelectorAll('input,textarea,[contenteditable=true]')].flatMap(node=>{
      if(!node.getClientRects().length ||
        node.matches('input[type=checkbox],input[type=radio],input[type=range],input[type=button],input[type=submit],input[type=reset],input[type=hidden]')) return []
      return (node.isContentEditable?node.textContent.trim():node.value)?[node.type||node.localName]:[]
    })
  }))
  const steps=[]
  async function press(key) {
    await page.keyboard.press(key)
    await page.waitForTimeout(165)
    const step=await page.evaluate(({key,about,destination})=>{
      const focus=document.activeElement
      const link=document.querySelector(destination)
      const visible=node=>{
        const box=node?.getBoundingClientRect()
        return Boolean(box && node.checkVisibility({visibilityProperty:true,opacityProperty:true}) &&
          box.x+box.width>0 && box.x<innerWidth && box.y+box.height>0 && box.y<innerHeight &&
          box.width>0 && box.height>0)
      }
      return {key,focus:focus?.textContent?.trim().slice(0,80),aboutFocused:focus?.matches(about),
        destinationFocused:focus===link,destinationVisible:visible(link)}
    },{key,about,destination})
    steps.push(step)
    return step
  }
  for(let index=0;index<24;index+=1) if((await press('Tab')).aboutFocused) break
  assert(steps.at(-1).aboutFocused,'Tab navigation did not reach About')
  const afterArrowDown=await press('ArrowDown')
  for(let cycle=0;cycle<4;cycle+=1) {
    for(const key of ['Tab','Tab','Shift+Tab','Shift+Tab']) await press(key)
  }
  await offer.waitFor({timeout:4200}).catch(()=>{})
  const offerText=await offer.locator('[role=status]').textContent({timeout:300}).catch(()=>null)
  const verdicts=await worker.evaluate(()=>keyboardRun)
  await page.locator(about).hover()
  const pointerVisible=await page.locator(destination).evaluate(node=>{
    const box=node.getBoundingClientRect()
    return node.checkVisibility({visibilityProperty:true,opacityProperty:true}) &&
      box.x+box.width>0 && box.x<innerWidth && box.y+box.height>0 && box.y<innerHeight &&
      box.width>0 && box.height>0
  })
  const result={checkedAt:new Date().toISOString(),url,runner:'Playwright headless Chromium with installed Curb Cut extension',
    activeRepairs,privacy,threshold:stuckThreshold,steps,afterArrowDown,pointerVisible,verdicts,offerText}
  await saveJSON(path.resolve(process.env.CURBCUT_JEV_PROOF_DIR??path.join(ROOT,'proof/jev'),'stuck-live-mass-edu.json'),result)
  console.log(JSON.stringify({privacy,pointerVisible,afterArrowDown,offerText,verdicts:verdicts.map(row=>row.provider)}))
} finally {
  await context?.close()
  await rm(profile,{recursive:true,force:true})
}
