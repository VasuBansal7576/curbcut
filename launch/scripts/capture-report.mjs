import {chromium} from 'playwright'
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {createReport} from '../../extension/lib/report.js'

const plates=new URL('../film/plates/',import.meta.url)
const patch=JSON.parse(await readFile(new URL('../../extension/bundled.json',import.meta.url))).find(p=>p.id==='v4-86f207deeb57-7bc09a21')
const report=createReport(patch)
const browser=await chromium.launch({headless:true,args:['--mute-audio']})
try{
  const page=await browser.newPage({viewport:{width:1280,height:920},deviceScaleFactor:2,offline:true})
  await page.setContent('<style>*{box-sizing:border-box}body{margin:0;color:#202324;background:#f4f1ea;font:19px/1.43 system-ui;padding:64px 80px}article{max-width:1050px}h1{font:600 43px/1.1 Georgia;margin:0 0 28px}h2{font:600 25px/1.15 Georgia;margin:24px 0 5px}p,pre{margin:5px 0}pre{padding:14px 20px;border-left:4px solid #bf9800;background:#e5e3dc;color:#202324;font:17px/1.45 monospace}a{color:#28525a}</style><article></article>')
  await page.evaluate(report=>{
    const article=document.querySelector('article')
    let code
    for(const line of report.split('\n')){
      if(line.startsWith('```')){
        if(code){code=null;continue}
        code=document.createElement('pre');article.append(code);continue
      }
      if(code){code.textContent+=line+'\n';continue}
      if(!line)continue
      const tag=line.startsWith('## ')?'h2':line.startsWith('# ')?'h1':'p'
      const el=document.createElement(tag)
      const link=line.match(/^- \[(.+?)\]\((.+?)\)$/)
      if(link){
        const a=document.createElement('a');a.href=link[2];a.textContent=link[1];el.append(a)
      }else el.textContent=line.replace(/^#{1,2} |^- /,'').replaceAll('**','')
      article.append(el)
    }
  },report)
  const file='owner-report.png'
  await page.screenshot({path:new URL(file,plates).pathname,fullPage:true})
  const box=await page.locator('pre').boundingBox()
  const height=await page.locator('html').evaluate(e=>e.scrollHeight)
  const index=JSON.parse(await readFile(new URL('index.json',plates)))
  index['owner-report']={file,source:'extension/lib/report.js',patch:patch.id,reportSha256:createHash('sha256').update(report).digest('hex'),size:[2560,height*2],rect:[box.x,box.y,box.width,box.height].map(v=>v*2)}
  await writeFile(new URL('index.json',plates),JSON.stringify(index,null,2)+'\n')
}finally{await browser.close()}
