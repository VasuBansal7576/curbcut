import {chromium} from 'playwright'
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {createReport} from '../../extension/lib/report.js'
import brand from '../../core/brand-palette.json' with {type:'json'}

const plates=new URL('../film/plates/',import.meta.url)
const patch=JSON.parse(await readFile(new URL('../../extension/bundled.json',import.meta.url))).find(p=>p.id==='v4-86f207deeb57-7bc09a21')
const report=createReport(patch)
const section=report.split('## Source change\n\n')[1].split('\n\n')[0]
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--mute-audio']})
try{
  const page=await browser.newPage({viewport:{width:800,height:380},deviceScaleFactor:2,offline:true})
  const font=(await readFile(new URL('../../extension/fonts/InterTight.ttf',import.meta.url))).toString('base64')
  await page.setContent(`<style>@font-face{font-family:Overpass;src:url(data:font/ttf;base64,${font});font-weight:100 900}*{box-sizing:border-box}body{margin:0;background:${brand.text};color:${brand.ink};font-family:Overpass;padding:32px 44px}small{font-size:22px}h1{font-size:48px;letter-spacing:-2px;margin:26px 0 8px}p{font-size:32px;line-height:1.3;margin:0}</style><small></small><h1>Source change</h1><p></p>`)
  await page.locator('small').evaluate((el,t)=>el.textContent=t,report.split('\n')[0].slice(2))
  await page.locator('p').evaluate((el,t)=>el.textContent=t,section)
  await page.evaluate(()=>document.fonts.ready)
  await page.screenshot({path:new URL('owner-report.png',plates).pathname})
  const index=JSON.parse(await readFile(new URL('index.json',plates)))
  index['owner-report']={file:'owner-report.png',source:'extension/lib/report.js',patch:patch.id,section:'Source change',reportSha256:createHash('sha256').update(report).digest('hex'),size:[1600,760]}
  await writeFile(new URL('index.json',plates),JSON.stringify(index,null,2)+'\n')
}finally{await browser.close()}
