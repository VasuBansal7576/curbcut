const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {execFileSync} = require('node:child_process')
const {chromium} = require('playwright')

async function capture(){
  const work = fs.mkdtempSync(path.join(os.tmpdir(),'curb-input-'))
  const extension = path.resolve(__dirname,'../../../../extension')
  const context = await chromium.launchPersistentContext(path.join(work,'profile'),{
    channel:'chromium',headless:true,viewport:{width:1440,height:900},deviceScaleFactor:2,
    args:['--mute-audio','--disable-extensions-except='+extension,'--load-extension='+extension]
  })
  try{
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker')
    await worker.evaluate(()=>ensureSeeded())
    const page=context.pages()[0]
    await page.goto('https://www.mass.edu/',{waitUntil:'domcontentloaded'})
    await page.bringToFront()
    const waiting=context.waitForEvent('page')
    await worker.evaluate(()=>chrome.tabs.create({url:chrome.runtime.getURL('popup.html'),active:false}))
    const popup=await waiting
    await popup.setViewportSize({width:390,height:680})
    const cdp=await context.newCDPSession(popup)
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:680,deviceScaleFactor:4,mobile:false})
    for(const state of ['off','on']){
      await popup.waitForFunction(()=>!document.querySelector('#global-toggle').disabled)
      await popup.locator('#global-toggle').setChecked(state==='on')
      await popup.waitForFunction(wanted=>document.querySelector('#global-toggle-status').textContent.trim().toLowerCase()===wanted,state)
      await popup.evaluate(()=>document.fonts.ready)
      await popup.screenshot({path:path.join(__dirname,'switch-'+state+'.png'),clip:{x:0,y:0,width:390,height:178}})
    }
    await popup.close()
    await page.bringToFront()
    const log={}
    for(const enabled of [false,true]){
      await worker.evaluate(enabled=>chrome.storage.local.set({enabled}),enabled)
      await page.reload({waitUntil:'domcontentloaded'})
      await page.evaluate(()=>document.fonts.ready)
      const trigger=page.locator('#mainnav > nav > ul > li:first-child > a').first()
      await trigger.waitFor()
      await page.waitForTimeout(1300)
      for(let i=0;i<55 && !await trigger.evaluate(el=>el===document.activeElement);i++)await page.keyboard.press('Tab')
      if(!await trigger.evaluate(el=>el===document.activeElement))throw Error('About missing from tab order')
      await page.keyboard.press('Shift+Tab')
      await page.waitForTimeout(280)
      const state=()=>trigger.evaluate(el=>({focus:document.activeElement.textContent.trim().slice(0,65),open:el.parentElement.querySelector('ul').getBoundingClientRect().height>0}))
      const before=await state(),folder=path.join(work,String(enabled));fs.mkdirSync(folder)
      const start=performance.now(),shots=[]
      let keyMs
      for(let i=0;i<18;i++){
        if(i===5){keyMs=performance.now()-start;await page.keyboard.press('Tab')}
        const t=performance.now()-start
        const file=String(i).padStart(3,'0')+'.jpg'
        await page.screenshot({path:path.join(folder,file),type:'jpeg',quality:96,clip:{x:0,y:67.5,width:925,height:472.5},scale:'device'})
        shots.push({file,t})
      }
      const after=await state()
      if(after.open!==enabled || !after.focus.includes('About'))throw Error('Unexpected About state '+JSON.stringify(after))
      const name=enabled?'repaired':'closed'
      const duration=shots.at(-1).t+80
      const list=shots.map((f,i)=>"file '"+f.file+"'\nduration "+(((shots[i+1]?.t??duration)-f.t)/1000).toFixed(5)).join('\n')+"\nfile '"+shots.at(-1).file+"'\n"
      fs.writeFileSync(path.join(folder,'frames.txt'),list)
      execFileSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',path.join(folder,'frames.txt'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2,fps=30','-c:v','libx264','-crf','14','-preset','slow','-pix_fmt','yuv420p',path.join(__dirname,name+'.mp4')])
      log[name]={site:page.url(),key:'Tab',before,after,keyMs:Math.round(keyMs-shots[0].t),frames:shots.length,durationMs:Math.round(duration-shots[0].t),clipCssPixels:[0,67.5,925,472.5],deviceScaleFactor:2}
      console.log(name,log[name])
    }
    fs.writeFileSync(path.join(__dirname,'capture.json'),JSON.stringify(log,null,2)+'\n')
  }finally{await context.close();fs.rmSync(work,{recursive:true,force:true})}
}
capture().catch(e=>{console.error(e.message);process.exitCode=1})
