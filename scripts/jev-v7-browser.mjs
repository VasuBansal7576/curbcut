import {readFile} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
import {guardRequests} from '../core/chrome.mjs'
import {pageBlock} from '../core/access.mjs'
import {taskNavigation} from '../core/task.mjs'
import {hostExclusion} from './scout-v4.mjs'

const runtime=await readFile(new URL('../extension/runtime.js',import.meta.url),'utf8')
const decisions=await readFile(new URL('../extension/jev-decisions-runtime.js',import.meta.url),'utf8')

export async function visit(browser,url,work,{width=1280,height=800,setup}={}) {
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block',acceptDownloads:false})
  try {
    await guardRequests(context,{url})
    await context.addInitScript({content:runtime})
    await context.addInitScript({content:decisions+"\n;globalThis.CurbCutDecisions=CurbCutDecisions"})
    const page=await context.newPage()
    if(setup) await setup(page)
    else {
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:8500})
      if(!taskNavigation(new URL(url),new URL(page.url())) || hostExclusion.test(new URL(page.url()).hostname)) return {status:'out-of-scope'}
      const blocked=await pageBlock(page,response)
      if(blocked) return {status:'blocked',reason:blocked}
      await delay(350)
    }
    return await work(page)
  } catch(error) {return {status:'unavailable',reason:error.message.split('\n')[0]}}
  finally {await context.close()}
}

export async function captureNames(page,collection) {
  const {targets,viewport}=collection
  if(!targets.length) return []
  const bytes=(await page.screenshot({type:'png',timeout:3500})).toString('base64')
  return page.evaluate(async({bytes,targets,viewport})=>{
    const blob=new Blob([Uint8Array.from(atob(bytes),char=>char.charCodeAt(0))],{type:'image/png'})
    return CurbCutDecisions.cropNames(blob,targets,viewport)
  },{bytes,targets,viewport})
}

export async function collect(page) {
  return page.evaluate(()=>{
    if(!CurbCut.instantPrivacy()) return null
    return {...CurbCut.collectNames(),sample:CurbCut.visibleLanguageSample()}
  })
}
