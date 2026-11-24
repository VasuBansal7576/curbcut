import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'
import {chromium} from 'playwright'
import {jevKey} from '../core/jev.mjs'
import {chooseLanguage,namePage,namingThresholds,languageThreshold} from '../core/jev-decisions.js'
import {instant,saveJSON} from '../core/io.mjs'
import {visit,collect,captureNames} from './jev-v7-browser.mjs'

const mock=await readFile(new URL('../fixtures/jev-live.html',import.meta.url),'utf8')
const key=await jevKey()
assert(key)
const folder='proof/jev/live-naming-demo'
await mkdir(folder,{recursive:true})
const browser=await chromium.launch({channel:'chromium',headless:true})
const selectors=['#catalog-search','#site-menu','#instagram']
try {
  const result=await visit(browser,'http://127.0.0.1:4317/fixtures/shop/',async page=>{
    const lines=()=>page.evaluate(selectors=>selectors.map(selector=>CurbCut.readerRow(document.querySelector(selector))?.row.textContent),selectors)
    const open=()=>page.evaluate(()=>{globalThis.__closeReading=CurbCut.reader()})
    await open()
    const before=await lines()
    await page.screenshot({path:folder+'/before.png'})
    await page.evaluate(()=>globalThis.__closeReading())
    const start=performance.now()
    const state=await collect(page)
    const targets=await captureNames(page,state)
    const answers=await namePage(key,targets,state.language)
    const decisions=targets.map(({target},index)=>({selector:target.selector,role:target.role,...answers[index]}))
    await page.evaluate(rows=>{
      for(const {selector,role,name} of rows) CurbCut.applyLiveName(document.querySelector(selector),role,name)
    },decisions)
    const elapsedMs=Math.round(performance.now()-start)
    await open()
    const after=await lines()
    await page.screenshot({path:folder+'/after.png'})
    return {runner:'playwright',source:'controlled development fixture',width:1920,height:1080,before,after,decisions,elapsedMs}
  },{width:1920,height:1080,setup:async page=>{
    await page.route('http://127.0.0.1:4317/fixtures/shop/',route=>route.fulfill({contentType:'text/html',body:mock}))
    await page.goto('http://127.0.0.1:4317/fixtures/shop/')
  }})
  assert(result.after?.length===3,JSON.stringify(result))
  const tests=[
    ['en','Libraries hold collections of books and records. Their reading rooms give local residents a quiet place to study and work.'],
    ['es','Las bibliotecas guardan colecciones de libros y documentos. Sus salas de lectura ofrecen un lugar tranquilo para estudiar.'],
    ['ja','日本の図書館には、地域の歴史を伝える資料や子ども向けの本があります。読書室では、利用者が静かに勉強したり資料を調べたりすることができます。図書館は地域の人々に長く利用されています。'],
    ['fr','Les bibliothèques conservent des collections de livres et de documents. Leurs salles de lecture offrent un endroit calme pour étudier.']
  ]
  const language=[]
  for(const [expected,text] of tests) language.push({expected,...await chooseLanguage(key,text)})
  await saveJSON(folder+'/capture.json',{checkedAt:instant(),...result,namingThresholds,languageThreshold,language})
  console.log(JSON.stringify({before:result.before,after:result.after,language,decisions:result.decisions}))
} finally {await browser.close()}
