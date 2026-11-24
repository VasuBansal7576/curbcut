import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'

const fixture=`<!doctype html><html lang="en"><title>Public shortcut page</title><body>
<h1>Public catalog</h1>
<button id="continue" type="button">Continue</button>
</body></html>`

test('installed shortcut works within 50ms of DOMContentLoaded on 20 loads',async()=>{
  const server=http.createServer((req,res)=>{
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'})
    res.end(fixture)
  })
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',error=>error?reject(error):resolve()))
  const url=`http://127.0.0.1:${server.address().port}/`
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-shortcut-'))
  const extension=path.resolve('extension')
  let context
  try {
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,acceptDownloads:false,
      args:['--disable-extensions-except='+extension,'--load-extension='+extension,'--disable-background-networking']})
    async function liveWorker() {
      const existing=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension:'))
      if(existing) {
        try {await existing.evaluate(()=>true);return existing} catch {}
      }
      return context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension:'),timeout:8000})
    }
    const page=context.pages()[0]??await context.newPage()
    const runs=[]
    for(let index=0;index<20;index++) {
      const dcl=page.waitForEvent('domcontentloaded')
      const navigation=index===0?page.goto(url,{timeout:15000}):page.reload({timeout:15000})
      await dcl
      const worker=await liveWorker()
      const started=Date.now()
      const tabId=await worker.evaluate(async href=>{
        const tabs=await chrome.tabs.query({})
        const tab=tabs.find(item=>item.url===href || item.pendingUrl===href)
        return tab?.id??null
      },url)
      assert.ok(tabId,'The fixture tab was missing after DOMContentLoaded.')
      const pending=worker.evaluate(async tabId=>handleCommand('im-stuck',await chrome.tabs.get(tabId)),tabId)
      const pressDelay=Date.now()-started
      assert.ok(pressDelay<50,'Shortcut was dispatched '+pressDelay+'ms after DOMContentLoaded on load '+(index+1)+'.')
      const result=await pending
      await navigation
      assert.equal(result?.ok,true,'Capture failed on load '+(index+1)+': '+(result?.reason||'unknown'))
      assert.equal(result.report?.url,url)
      assert.equal(result.report?.title,'Public shortcut page')
      runs.push({index:index+1,pressDelay,ok:result.ok})
      for(const extra of context.pages().filter(item=>item!==page)) await extra.close()
    }
    assert.equal(runs.length,20)
    assert.equal(runs.filter(run=>run.ok).length,20)
  } finally {
    try {await context?.close()}
    finally {
      await rm(profile,{recursive:true,force:true})
      await new Promise(resolve=>server.close(resolve))
    }
  }
},{timeout:120000})
