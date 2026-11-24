import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
import {jevKey} from '../core/jev.mjs'
import {chooseLanguage,namePage,namingThresholds,languageThreshold} from '../core/jev-decisions.js'
import {instant,saveJSON} from '../core/io.mjs'
import {visit,collect,captureNames} from './jev-v7-browser.mjs'

const mock='<!doctype html><html lang="en"><title>City library</title><style>body{font:24px system-ui;background:#edf3ed;padding:60px}nav{display:flex;gap:20px}nav>*{background:#fff;border:2px solid #234;border-radius:5px;padding:14px;color:#234}svg{width:40px;height:40px;display:block;fill:none;stroke:currentColor;stroke-width:2}</style><body><h1>City library</h1><p>Browse the public collections and services.</p><nav><button id="catalog-search"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6"/></svg></button><button id="site-menu"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button><a id="instagram" href="https://www.instagram.com/citylibrary/"><svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h1"/></svg></a></nav></body></html>'
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
