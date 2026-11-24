import {chromium} from 'playwright'
import {tmpdir} from 'node:os'
import {setTimeout as delay} from 'node:timers/promises'
import {BlockedPage,pageBlock} from './access.mjs'
import {session} from './chrome.mjs'
import {normalizeTask,taskNavigation} from './task.mjs'

export async function checkKaneAccess(browser,task,persona) {
  const client=await chromium.connectOverCDP(browser.endpoint,{timeout:8000})
  try {
    const page=client.contexts().flatMap(context=>context.pages()).find(page=>page.url()===browser.page.url())
    if(!page) throw new Error('The attached browser did not expose the task tab.')
    await delay(400)
    const response=browser.responses.get(browser.page)
    const blocked=await pageBlock(page,response)
    if(blocked) throw new BlockedPage(blocked)
    if(!taskNavigation(new URL(task.url),new URL(page.url()))) throw new BlockedPage('Public navigation left the task site.')
    const state=await page.evaluate(()=>({persona:globalThis.__curbcutState?.persona,width:innerWidth,ready:document.readyState}))
    if(state.persona!==persona || (persona==='low-vision' && state.width!==320)) throw new Error('The attached browser did not preserve the recorded persona.')
    if(state.ready==='loading') throw new BlockedPage('The attached task document did not finish loading.')
    return {persona,status:'pass',url:page.url(),httpStatus:response?.status(),width:state.width,browser:client.version()}
  } finally {await client.close()}
}

export async function preflight(data,{navigationTimeout}={}) {
  const task=await normalizeTask(data)
  const lanes=[]
  const personas=task.persona==='document-language'?['control']:[task.persona,'control']
  for(const persona of personas) {
    let browser
    try {
      browser=await session(task,persona,null,tmpdir(),{gate:true,local:Boolean(navigationTimeout),navigationTimeout})
      lanes.push(await checkKaneAccess(browser,task,persona))
    } catch(error) {
      if(!(error instanceof BlockedPage)) throw error
      lanes.push({persona,status:'blocked',reason:error.message})
      return {runner:'playwright-cdp',status:'blocked',lanes}
    } finally {await browser?.abort()}
  }
  return {runner:'playwright-cdp',status:'pass',lanes}
}
