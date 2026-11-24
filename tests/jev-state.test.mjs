import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
import {chromium} from 'playwright'
import {acceptFinder,acceptVisualState,finderThreshold,glanceThresholds,visualStateThresholds} from '../core/jev-decisions.js'
import {literalFind} from '../core/jev-state-browser.js'

const target=(over={})=>({
  selector:'#hours-tab',role:'tab',current:false,
  dom:{selected:false,expanded:false,checked:false,disabled:false,invalid:false,nativeChecked:false,nativeDisabled:false},
  nearby:[{text:'Enter a permit number.',selector:'#permit-error'}],
  ...over
})
const noul=value=>({noul:value})
const answers=(over={})=>({
  selected0:noul(0.96),expanded0:noul(0.05),checked0:noul(0.04),disabled0:noul(0.03),invalid0:noul(0.02),
  error0:{choice:'none',confidence:0.9},
  ...over
})

test('visual state applies selected only above the frozen threshold and leaves matching ARIA',()=>{
  const applied=acceptVisualState(target(),answers())
  assert.equal(applied.changes['aria-selected'],'true')
  assert.equal(acceptVisualState(target(),answers({selected0:noul(0.89)})),null)
  assert.equal(acceptVisualState(target({dom:{...target().dom,selected:true}}),answers()),null)
})

test('visual state never unsets selected and skips native checked and disabled',()=>{
  assert.equal(acceptVisualState(target({dom:{...target().dom,selected:true}}),answers({selected0:noul(0.01)})),null)
  const checked=acceptVisualState(target({dom:{...target().dom,nativeChecked:true}}),answers({checked0:noul(0.99),selected0:noul(0.01)}))
  assert.equal(checked,null)
  const disabled=acceptVisualState(target({dom:{...target().dom,nativeDisabled:true}}),answers({disabled0:noul(0.99),selected0:noul(0.01)}))
  assert.equal(disabled,null)
})

test('invalid fields take a nearby error only when both scores clear their floors',()=>{
  const miss=acceptVisualState(target(),answers({selected0:noul(0.01),invalid0:noul(0.99),error0:{choice:'t0n0',confidence:0.79}}))
  assert.equal(miss.changes['aria-invalid'],'true')
  assert.equal(miss.describedbySelector,null)
  const hit=acceptVisualState(target(),answers({selected0:noul(0.01),invalid0:noul(0.99),error0:{choice:'t0n0',confidence:0.80}}))
  assert.equal(hit.describedbySelector,'#permit-error')
})

test('finder abstains below the frozen threshold or on none',()=>{
  const links=[{id:'l0',text:'Pay a parking ticket',href:'https://example.org/parking/tickets'}]
  assert.equal(acceptFinder({choice:'l0',confidence:0.79},links),null)
  assert.equal(acceptFinder({choice:'none',confidence:0.99},links),null)
  assert.equal(acceptFinder({choice:'l0',confidence:finderThreshold},links).href,links[0].href)
})

test('literal find requires every term and ignores collapsed vs visible',()=>{
  const links=[
    {text:'Pay a parking ticket',href:'https://city.example/parking/tickets',hidden:true},
    {text:'Library hours',href:'https://city.example/library'}
  ]
  assert.equal(literalFind('parking ticket',links).length,1)
  assert.equal(literalFind('birth certificate',links).length,0)
})

test('glance thresholds stay frozen for the public run',()=>{
  assert.equal(visualStateThresholds.selected,0.9)
  assert.equal(glanceThresholds.noul,0.8)
  assert.equal(glanceThresholds.box,0.7)
})

test('glance and finder decisions parse typed Jev answers',async t=>{
  const screenshot='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  t.mock.method(globalThis,'fetch',async(_url,request)=>{
    const body=JSON.parse(request.body)
    if(body.questions.dialog) {
      assert.equal(body.questions.dialogBox,undefined)
      assert.equal(body.questions.main,undefined)
      return Response.json({model:'jev-test',answers:{
        dialog:{noul:0.96},cookie:{noul:0.1},error:{noul:0.91}
      }})
    }
    return Response.json({model:'jev-test',answers:{match:{choice:'l0',confidence:0.91}}})
  })
  const {askFinder,askGlance}=await import('../core/jev-decisions.js')
  const glance=await askGlance('test-only',screenshot)
  assert.equal(glance.items.find(item=>item.kind==='dialog').yes,true)
  assert.equal(glance.items.find(item=>item.kind==='cookie').yes,false)
  assert.equal(glance.items.find(item=>item.kind==='error').yes,true)
  assert.equal(glance.items.some(item=>item.kind==='main' || item.kind==='action' || item.box),false)
  const finder=await askFinder('test-only','pay a parking ticket',[{id:'l0',text:'Pay a parking ticket',href:'https://city.example/tickets'}])
  assert.equal(finder.chosen.id,'l0')
})

test('visual state collection, apply, and undo run on the development fixture',async()=>{
  const html=await readFile(new URL('../fixtures/shop/jev-state.html',import.meta.url),'utf8')
  const browser=await chromium.launch({channel:'chromium',headless:true,args:['--mute-audio']})
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}})
    await page.setContent(html,{waitUntil:'load'})
    await page.addScriptTag({path:new URL('../extension/runtime.js',import.meta.url).pathname})
    const collected=await page.evaluate(()=>CurbCut.collectVisualState())
    assert.ok(collected.targets.some(target=>target.selector.includes('hours-tab') || target.name==='Hours'))
    const hours=await page.evaluate(()=>{
      const node=document.querySelector('#hours-tab')
      const accepted={changes:{'aria-selected':'true'}}
      window.restoreState=CurbCut.applyVisualState(node,accepted)
      return node.getAttribute('aria-selected')
    })
    assert.equal(hours,'true')
    const restored=await page.evaluate(()=>{
      window.restoreState()
      return document.querySelector('#hours-tab').hasAttribute('aria-selected')
    })
    assert.equal(restored,false)
  } finally {await browser.close()}
},{timeout:20000})

test('glance jump targets use the main landmark and skip a primary action',async()=>{
  const html=await readFile(new URL('../fixtures/shop/jev-glance.html',import.meta.url),'utf8')
  const browser=await chromium.launch({channel:'chromium',headless:true,args:['--mute-audio']})
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800}})
    await page.setContent(html,{waitUntil:'load'})
    await page.addScriptTag({path:new URL('../extension/runtime.js',import.meta.url).pathname})
    const regions=await page.evaluate(()=>{
      const found=CurbCut.glanceRegions()
      return {
        main:found.main?.id||found.main?.localName,
        dialog:found.dialog?.id,
        cookie:found.cookie?.id,
        error:found.error?.id,
        focused:CurbCut.focusGlanceNode(found.main)?.localName
      }
    })
    assert.equal(regions.main,'main')
    assert.equal(regions.dialog,'hours-dialog')
    assert.equal(regions.cookie,'cookie')
    assert.equal(regions.error,'renew-error')
    assert.equal(regions.focused,'main')
  } finally {await browser.close()}
},{timeout:20000})

test('finder includes collapsed menu links',async()=>{
  const html=await readFile(new URL('../fixtures/shop/jev-finder.html',import.meta.url),'utf8')
  const browser=await chromium.launch({channel:'chromium',headless:true,args:['--mute-audio']})
  try {
    const page=await browser.newPage()
    await page.setContent(html,{waitUntil:'load'})
    await page.addScriptTag({path:new URL('../extension/runtime.js',import.meta.url).pathname})
    const found=await page.evaluate(()=>{
      const links=CurbCut.collectPageLinks()
      return CurbCut.literalFind('parking ticket',links)
    })
    assert.equal(found.length,1)
    assert.match(found[0].href,/parking\/tickets/)
    assert.equal(found[0].hidden,true)
  } finally {await browser.close()}
},{timeout:20000})

test('state content script keeps a single debounce timer across mutations',async()=>{
  const source=await readFile(new URL('../extension/state-content.js',import.meta.url),'utf8')
  const node={isConnected:true}
  const location={href:'https://public.example.org/',protocol:'https:'}
  const timers=new Map()
  let notify,sent
  let timer=0
  const observed=new Promise(resolve=>{sent=resolve})
  runInNewContext(source,{
    location,
    document:{documentElement:{},hidden:false,querySelector:selector=>String(selector).includes('data-curbcut-reader')?null:node,addEventListener(){}},
    window:{addEventListener(){}},
    MutationObserver:class {
      constructor(callback){notify=callback}
      observe(){}
    },
    CurbCutExt:{isPagePaused:()=>false,canCapturePage:()=>({ok:true})},
    CurbCut:{
      instantPrivacy:()=>true,
      collectVisualState:()=>({language:'en',viewport:{width:100,height:100},targets:[
        {selector:'#hours-tab',role:'tab',box:[0,0,40,16],dom:{selected:false},current:false}
      ]})
    },
    chrome:{
      storage:{local:{get:async()=>({visualStateEnabled:true})},onChanged:{addListener(){}}},
      runtime:{onMessage:{addListener(){}},sendMessage:async message=>{
        sent(message)
        return {ok:false}
      }}
    },
    crypto:{randomUUID:()=>'request'},
    Date,
    clearTimeout:id=>timers.delete(id),
    setTimeout:callback=>{timers.set(++timer,callback);return timer}
  })
  await Promise.resolve()
  await Promise.resolve()
  const scheduled=[...timers.keys()][0]
  assert.ok(scheduled)
  for(let index=0;index<6;index+=1) notify([{type:'childList'}])
  assert.deepEqual([...timers.keys()],[scheduled])
  timers.get(scheduled)()
  const message=await observed
  assert.equal(message.type,'VISUAL_STATE_REQUEST')
})
