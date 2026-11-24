import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {chromium} from 'playwright'
import {readJSON} from '../core/io.mjs'
import {actionSignature,catalogDocument,drawSample,groupRecipes,parseUrlList,sha256} from '../core/census-recipes.mjs'
import {renderReadme,summarize,wilson} from '../core/census-aggregate.mjs'
import {clickListenerHits,pageSignals,recipeSignals} from '../core/census-signals.mjs'
import {askCensus,compactJevState} from '../core/census.mjs'

const patches=await readJSON('extension/bundled.json')
const catalog=catalogDocument(patches)

test('bundled patches group into recipes by unique action signature',()=>{
  const recipes=groupRecipes(patches)
  assert.equal(patches.length,105)
  assert.equal(recipes.reduce((sum,recipe)=>sum+recipe.patchCount,0),105)
  assert.equal(new Set(recipes.map(recipe=>recipe.signature)).size,recipes.length)
  const byId=Object.fromEntries(recipes.map(recipe=>[recipe.id,recipe]))
  assert.equal(byId.setContrast.patchCount,41)
  assert.equal(byId['unnamed-field'].patchCount,18)
  assert.equal(byId['clickable-div-as-button'].signature,'makeFocusable+setRole+bindEnterToClick+restoreFocusOutline')
  assert.equal(byId['hover-only-menu'].signature,'mirrorHoverToFocus')
  assert.equal(byId.reflow.signature,'injectCSS')
  assert.equal(actionSignature([{action:'injectCSS'},{action:'injectCSS'},{action:'injectCSS'}]),'injectCSS')
  assert.ok(byId.setAltText.patchCount>=1)
  assert.ok(byId.setLang.patchCount>=1)
  assert.equal(catalog.recipeCount,recipes.length)
})

test('url lists and seeded draws are deterministic',()=>{
  const fromText=parseUrlList('# skip\nexample.org\nhttps://mass.edu/\n')
  assert.deepEqual(fromText.map(row=>row.url),['https://example.org/','https://mass.edu/'])
  const fromJson=parseUrlList(JSON.stringify({seed:'x',sites:[{site:'a.com',url:'https://a.com/',rank:2},{site:'b.com',url:'https://b.com/'}]}))
  assert.equal(fromJson.length,2)
  const seed='curbcut-census-test'
  const sites=[{site:'zeta.test',url:'https://zeta.test/'},{site:'alpha.test',url:'https://alpha.test/'}]
  const sample=drawSample(sites,seed,1)
  assert.equal(sample[0].site,[...sites].sort((a,b)=>sha256(seed+'\n'+a.site).localeCompare(sha256(seed+'\n'+b.site)))[0].site)
})

test('wilson intervals and recipe aggregation stay inside [0,1]',()=>{
  const empty=wilson(0,0)
  assert.equal(empty.share,0)
  assert.equal(empty.low,0)
  assert.equal(empty.high,1)
  const none=wilson(0,200)
  assert.equal(none.share,0)
  assert.ok(none.high>0 && none.high<0.03)
  const all=wilson(50,50)
  assert.equal(all.share,1)
  assert.ok(all.low>0.9)
  const mixed=wilson(10,200)
  assert.ok(mixed.low<mixed.share && mixed.share<mixed.high)
  const recipes=[{id:'setLang',title:'Missing document language',signature:'setLang',patchCount:3}]
  const pages=[
    {url:'https://a.test/',set:'sample',status:'observed',signals:{setLang:{hit:true,count:1}},jev:{setLang:{noul:0.9}},
      usage:{input_tokens:10,output_tokens:2},labels:[]},
    {url:'https://b.test/',set:'sample',status:'observed',signals:{setLang:{hit:false,count:0}},jev:{setLang:{noul:0.1}},
      usage:{input_tokens:11,output_tokens:2},labels:[]},
    {url:'https://c.test/',set:'sample',status:'blocked',reason:'Login wall'},
    {url:'https://lang.test/',set:'calibration',status:'observed',signals:{setLang:{hit:true,count:1}},jev:{setLang:{noul:0.8}},
      labels:[{recipeId:'setLang',patchId:'p1',source:'patch-url'}],usage:{input_tokens:9,output_tokens:1}}
  ]
  const summary=summarize(pages,recipes)
  assert.equal(summary.observed,2)
  assert.equal(summary.blocked,1)
  assert.equal(summary.tokens.input,30)
  assert.equal(summary.recipes[0].jev.k,1)
  assert.equal(summary.recipes[0].labelled.n,1)
  assert.equal(summary.recipes[0].labelled.jevRecall,1)
  assert.equal(summary.recipes[0].labelled.signalRecall,1)
  const readme=renderReadme({...summary,seed:'test-seed',source:'proof/heldout-v5/sample.json',model:'jev-1.14.0',branch:'t3/x',commit:'abc'})
  assert.match(readme,/test-seed/)
  assert.match(readme,/50\.0%/)
  assert.match(readme,/positives only/)
  assert.match(readme,/abc/)
})

test('census Jev requests one noul question per recipe and keep signals compact',async t=>{
  const recipes=catalog.recipes.slice(0,2)
  const signals=Object.fromEntries(recipes.map((recipe,index)=>[recipe.id,{hit:index===0,count:index===0?2:0}]))
  t.mock.method(globalThis,'fetch',async(_url,request)=>{
    const body=JSON.parse(request.body)
    assert.equal(body.model,'jev-1.14.0')
    assert.equal(Object.keys(body.questions).length,2)
    for(const question of Object.values(body.questions)) assert.equal(question.type,'noul')
    assert.equal(Object.keys(body.assets).length,1)
    assert.equal(body.state.recipes[recipes[0].id].hit,true)
    return Response.json({model:'jev-1.14.0',answers:{[recipes[0].id]:{type:'noul',noul:0.82},[recipes[1].id]:{type:'noul',noul:0.11}},
      usage:{input_tokens:40,output_tokens:6}})
  })
  const state=compactJevState({url:'https://example.org/',title:'Example',lang:null,overflow:false,unnamedCount:0,missingAltCount:0,
    hoverCount:0,contrastHit:false,missingLang:true,toggleCount:0,widgetCount:0},signals)
  const result=await askCensus('test-only',recipes,state,'data:image/jpeg;base64,Zm9v')
  assert.equal(result.answers[recipes[0].id].noul,0.82)
  assert.equal(result.usage.input_tokens,40)
})

test('page signals detect unnamed fields, missing alt, language, hover, and click listeners',async()=>{
  const html=`<!doctype html><html><head><style>
    nav .menu{display:none} nav:hover .menu{display:block}
    p.low{color:#999;background:#fff;font-size:16px}
  </style></head><body>
    <nav><a href="/">Home</a><div class="menu"><a href="/about">About</a></div></nav>
    <input id="q"><img id="pic" width="40" height="40" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='black'/%3E%3C/svg%3E">
    <p class="low">The measured contrast sample reads clearly enough to score.</p>
    <div id="buy">Buy</div>
    <script>document.getElementById('buy').addEventListener('click',function(){})</script>
  </body></html>`
  const browser=await chromium.launch({channel:'chromium',headless:true})
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}})
    await page.addInitScript({content:await readFile('extension/runtime.js','utf8')})
    await page.setContent(html,{waitUntil:'domcontentloaded'})
    const raw=await page.evaluate(pageSignals)
    assert.equal(raw.missingLang,true)
    assert.ok(raw.unnamedCount>=1)
    assert.ok(raw.missingAltCount>=1)
    assert.ok(raw.hoverCount>=1)
    const clicks=await clickListenerHits(page)
    assert.ok(clicks.length>=1)
    const signals=recipeSignals(raw,clicks)
    assert.equal(signals.setLang.hit,true)
    assert.equal(signals.setAltText.hit,true)
    assert.equal(signals['unnamed-field'].hit,true)
    assert.equal(signals['hover-only-menu'].hit,true)
    assert.equal(signals['clickable-div-as-button'].hit,true)
  } finally {await browser.close()}
})
