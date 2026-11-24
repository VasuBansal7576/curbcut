import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {mkdtemp,rm,mkdir} from 'node:fs/promises'
import {ROOT,command,saveJSON,instant} from '../core/io.mjs'
import {serve} from '../core/server.mjs'
const verified=process.argv.includes('--verified')
let server
try {server=await serve()}catch(e){if(e.code!=='EADDRINUSE')throw e}
const profile=await mkdtemp(path.join(tmpdir(),'curbcut-extension-'))
const ext=path.join(ROOT,'extension')
let ctx
try {
 ctx=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:960,height:800},recordVideo:{dir:profile,size:{width:960,height:800}},args:['--disable-extensions-except='+ext,'--load-extension='+ext]})
 const worker=ctx.serviceWorkers()[0]??await ctx.waitForEvent('serviceworker')
 const fixture=ctx.pages()[0]
 await fixture.goto('http://127.0.0.1:4317/fixtures/shop/')
 const popup=await ctx.newPage()
 const popupUrl=new URL('popup.html',worker.url()).href
 await popup.goto(popupUrl)
 await fixture.bringToFront()
 await popup.reload()
 await popup.waitForFunction(()=>!document.querySelector('#fixture-preview-row').hidden)
 if(!verified) await popup.locator('#fixture-preview-toggle').evaluate(el=>el.click())
 await fixture.waitForFunction(()=>document.querySelector('.add-to-cart').tabIndex===0)
 const initial=await fixture.locator('.add-to-cart').getAttribute('role')
 assert.equal(initial,'button')
 const rows=[]
 for(const enabled of [false,true]) {
  await popup.locator('#global-toggle').evaluate(el=>el.click())
  await fixture.waitForFunction(on=>document.querySelector('.add-to-cart').tabIndex===(on?0:-1),enabled)
  const current=await fixture.locator('.add-to-cart').getAttribute('role')
  rows.push({enabled,role:current,at:instant()})
  await fixture.locator('.add-to-cart').scrollIntoViewIfNeeded()
  if(enabled){await fixture.locator('.add-to-cart').focus();await fixture.keyboard.press('Enter')}
  await fixture.waitForTimeout(1600)
 }
 assert.equal(await fixture.locator('#cart').innerText(),'Cart (1)')
 await popup.locator('#active-count').waitFor()
 const popupVid=popup.video(),shopVid=fixture.video()
 await ctx.close()
 const folder=verified?'proof/kane/extension-toggle':'proof/local'
 const prefix=path.join(ROOT,folder)
 await mkdir(prefix,{recursive:true})
 const output=await command('ffmpeg',['-loglevel','error','-y','-i',await shopVid.path(),'-i',await popupVid.path(),'-filter_complex','[0:v]scale=960:800[left];[1:v]crop=380:800:0:0[right];[left][right]hstack=inputs=2:shortest=1','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(prefix,'toggle.mp4')])
 if(output.code!==0)throw new Error(output.stderr)
 await saveJSON(path.join(prefix,'toggle.json'),{runner:'local-chromium-extension',fixturePreview:!verified,states:rows,finalCart:'Cart (1)',video:folder+'/toggle.mp4'})
 console.log('Recorded actual popup toggles and fixture cart confirmation.')
}finally{await ctx?.close().catch(()=>{});await rm(profile,{recursive:true,force:true});if(server)server.close()}
