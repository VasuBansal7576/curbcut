import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'

const root=new URL('../../',import.meta.url)
const folder=new URL('launch/film/plates/',root)
const source='proof/jev/live-naming-demo/capture.json'
const capture=JSON.parse(await readFile(new URL(source,root)))
const buttons=capture.names.filter(row=>row.role==='button' && row.visibleInBefore && row.visibleInAfter)
assert.deepEqual(buttons.map(row=>row.selector),['#open-sidebar','a.btn-buscar'])
const index=JSON.parse(await readFile(new URL('index.json',folder)))
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--mute-audio']})
try{
  const page=await browser.newPage({offline:true,viewport:{width:960,height:440},deviceScaleFactor:3})
  await page.setContent(`<style>
    *{box-sizing:border-box}body{margin:0;padding:13px 38px 12px;background:#142324;color:#f6f6e8;font-family:system-ui}
    h1{margin:0;height:45px;font-size:24px;line-height:40px;font-weight:650;color:#d5f99e}
    .row{height:52px;display:flex;align-items:center;border-bottom:1px solid #445853;font-size:19px;color:#c2ceca}
    .target{font-size:31px;font-weight:550;color:#f6f6e8;white-space:pre}
    .name{color:#ffce1f;font-weight:700}.state{font-size:21px;color:#d0dbd7}
  </style><h1>Reading view</h1><main></main>`)
  for(const phase of ['before','after']){
    const targets=await page.evaluate(({phase,buttons})=>{
      const main=document.querySelector('main')
      main.replaceChildren()
      const context=text=>{
        const row=document.createElement('div')
        row.className='row'
        row.textContent=text
        main.append(row)
      }
      context('listitem · Félix Hernández')
      context('listitem · NBA')
      const targets=buttons.map(button=>{
        const row=document.createElement('div')
        row.className='row target'
        const [role,name,state]=button[phase].split(' · ')
        row.append(role+' · ')
        const span=document.createElement('span')
        if(phase==='after')span.className='name'
        span.textContent=name
        row.append(span)
        if(state){
          const tail=document.createElement('span')
          tail.className='state'
          tail.textContent=' · '+state
          row.append(tail)
        }
        main.append(row)
        const bounds=row.getBoundingClientRect()
        return {text:button[phase],confidence:button.confidence,rect:[bounds.x,bounds.y,bounds.width,bounds.height].map(v=>v*devicePixelRatio)}
      })
      context('button · Imagen portada')
      context('img · Imagen portada')
      context('link · Boton radio en vivo')
      return targets
    },{phase,buttons})
    const key='jev-'+(phase==='before'?'off':'on'),file=key+'.png'
    await page.screenshot({path:fileURLToPath(new URL(file,folder))})
    index[key]={file,source,screenshot:capture.screenshots[phase],method:'Retypeset seven recorded Reading view rows; the two target strings and model confidence values come from capture.json.',url:capture.finalUrl,size:[2880,1320],deviceScaleFactor:3,targets,study:'proof/jev/live-naming-real-sites.json'}
  }
  await writeFile(new URL('index.json',folder),JSON.stringify(index,null,2)+'\n')
}finally{await browser.close()}
