import assert from 'node:assert/strict'
import test from 'node:test'
import {runInNewContext} from 'node:vm'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {chromium} from 'playwright'
import {contrastRepair,measureContrast,rgb} from '../core/contrast.js'
import {detectLanguage,observeCoverage} from '../core/coverage.mjs'
import validate from '../core/validate.generated.cjs'
import {command,readJSON} from '../core/io.mjs'
import {recordedAbsence} from '../scripts/kane-evidence-v6.mjs'
import {createReport} from '../extension/lib/report.js'

const url='https://coverage.example/'
const draft={id:'v6-fixture',url,site:'coverage.example',match:url,persona:'low-contrast-simulation',
  task:'Read the reference.',barrier:'Contrast below AA.',status:'candidate',evidence:{},history:[]}
const html=`
  <main><h1>Fixture</h1>
    <button id="menu" aria-controls="nav"><svg width="32" height="24"><path d="M0 2H30M0 8H30M0 14H30" stroke="black"/></svg></button>
    <p id="contrast" style="color: rgba(100, 100, 100, 0.5) !important">Printed access reference</p>
    <a id="empty-link" href="/guide"><svg width="30" height="30"><circle cx="15" cy="15" r="12"/></svg></a>
    <img id="photo" width="40" height="40" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='10'/%3E%3C/svg%3E">
  </main>`

test('contrast repair preserves hue, composites alpha, and changes the background only when required',()=>{
  const model={foreground:rgb('rgba(100, 100, 100, 0.5)'),layers:[{fill:rgb('#ffffff'),opacity:1}],threshold:4.5}
  assert.deepEqual(measureContrast(model).foreground,[177.5,177.5,177.5])
  const rule=contrastRepair(model)
  assert.deepEqual(Object.keys(rule),['color'])
  assert(measureContrast(model,rgb(rule.color)).ratio>=4.5)
  assert(measureContrast(model,rgb('#777777')).ratio<4.5)
  const faded={foreground:rgb('#a68888'),layers:[{fill:rgb('#ffffff'),opacity:0.75}],threshold:4.5}
  const sameHue=contrastRepair(faded)
  const [red,green,blue]=rgb(sameHue.color)
  assert(red>=green && green===blue)
  const large={...model,threshold:3,foreground:rgb('#949494')}
  assert.equal(contrastRepair(large),null)
  const needsBackground={foreground:rgb('#7b6688'),layers:[{fill:rgb('#888888'),opacity:0.68}],threshold:4.5}
  const paired=contrastRepair(needsBackground)
  assert(paired?.['background-color'])
  assert(measureContrast(needsBackground,rgb(paired.color),rgb(paired['background-color'])).ratio>=4.5)
})

test('offline language detection abstains on short samples',()=>{
  assert.equal(detectLanguage('Welcome'),null)
  assert.equal(detectLanguage('The public library has a collection of books and other materials for readers who visit its branches. You can look for a specific title in the catalog, or ask one of our librarians to help you find the information you need.').tag,'en')
})

test('rendered discovery and the declarative rules run and revert in Chromium',async()=>{
  const browser=await chromium.launch({channel:'chromium',headless:true})
  try {
    const page=await browser.newPage()
    await page.route(url,route=>route.fulfill({contentType:'text/html',body:html}))
    await page.addInitScript({content:await readFile('extension/runtime.js','utf8')})
    await page.goto(url)
    const observed=await page.evaluate(()=>CurbCut.discoverCoverage())
    assert.deepEqual(observed.names.map(({role})=>role).sort(),['button','img','link'])
    assert.equal(observed.contrast.selector,'#contrast')
    assert.equal(observed.language.selector,'html')
    const cases=[
      {selector:'#menu',action:'addLabel',value:'Open navigation',evaluation:{category:'empty-button',role:'button',name:'Open navigation'}},
      {selector:'#empty-link',action:'addLabel',value:'Read the guide',evaluation:{category:'empty-link',role:'link',name:'Read the guide'}},
      {selector:'#photo',action:'setAltText',value:'Black circle',evaluation:{category:'missing-alt',role:'img',name:'Black circle'}},
      {selector:'html',action:'setLang',value:'en',evaluation:{category:'missing-language',name:'en'}},
      {selector:'#contrast',action:'setContrast',value:{color:'#767676'},evaluation:{category:'low-contrast',text:'Printed access reference'}}
    ]
    for(const {evaluation,...rule} of cases) {
      const patch={...draft,observedSelector:rule.selector,evaluation,rules:[rule]}
      assert(validate(patch))
      assert.equal((await observeCoverage(page,patch)).status,'fail')
      await page.evaluate(patch=>{window.restore=CurbCut.apply(patch)},patch)
      assert.equal((await observeCoverage(page,patch,{enabled:true})).status,'pass')
      await page.evaluate(()=>window.restore())
      assert.equal((await observeCoverage(page,patch)).status,'fail')
    }
    const decorative={...draft,rules:[{selector:'#photo',action:'setAltText',value:''}]}
    assert(validate(decorative))
    await page.evaluate(patch=>{window.restore=CurbCut.apply(patch)},decorative)
    assert.equal(await page.locator('#photo').getAttribute('alt'),'')
    await page.evaluate(()=>window.restore())
    assert.equal(await page.locator('#photo').getAttribute('alt'),null)
    const invalid={...draft,rules:[{selector:'#contrast',action:'setContrast',value:{color:'red'}}]}
    assert(!validate(invalid))
    const scoped={...draft,rules:[{selector:'p',action:'setContrast',value:{color:'#767676'}}]}
    await page.evaluate(patch=>{
      document.querySelector('main').append(document.querySelector('p').cloneNode(true))
      window.restore=CurbCut.apply(patch)
    },scoped)
    assert.equal(await page.locator('p').first().evaluate(node=>node.style.color),'rgba(100, 100, 100, 0.5)')
  } finally {await browser.close()}
})

test('CLI uses the same Markdown formatter as the popup and links archived Kane recordings',async()=>{
  const id='v5-c22b9bdca86b-71a63d77'
  const patch=await readJSON('patches/'+id+'.json')
  const result=await command(process.execPath,['curbcut.mjs','report',id])
  assert.equal(result.code,0)
  assert.equal(result.stdout,createReport(patch))
  assert.match(result.stdout,/\[Kane before recording\]\(https:\/\/github\.com\/VasuBansal7576\/curbcut\/raw\/main\//)
  assert.match(result.stdout,/\[Kane after recording\]/)
  const local={...draft,status:'locally-verified',observedSelector:'#contrast',evaluation:{category:'low-contrast',text:'Printed access reference'},
    rules:[{selector:'#contrast',action:'setContrast',value:{color:'#767676'}}],
    evidence:{verifiedAt:'2026-11-24',localMeasurement:'proof/heldout-v6/task.json'}}
  assert(validate(local))
  const extension={}
  for(const file of ['constants','validate']) runInNewContext(await readFile('extension/lib/'+file+'.js','utf8'),extension)
  assert(validate(extension.CurbCutExt.toEnginePatch(local)))
  const report=createReport(local)
  assert.match(report,/1\.4\.3 Contrast/)
  assert.match(report,/color: #767676;/)
  assert.match(report,/Local proof/)
  assert(!report.includes('Kane'))
})

test('installed popup copies and downloads the CLI report without submitting it',async()=>{
  const profile=await mkdtemp(path.join(tmpdir(),'curbcut-report-test-'))
  const extension=path.resolve('extension')
  const id='v4-86f207deeb57-7bc09a21'
  const patch=await readJSON('patches/'+id+'.json')
  let context
  try {
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,acceptDownloads:true,
      args:['--disable-extensions-except='+extension,'--load-extension='+extension]})
    await context.route('**/*',route=>{
      const target=route.request().url()
      if(target.startsWith('chrome-extension:')) return route.continue()
      if(target!==patch.match) return route.abort()
      return route.fulfill({contentType:'text/html',body:'<style>#menu ul {display:none} #menu:hover ul {display:block}</style><div id="mainnav"><nav><ul><li id="menu"><a href="/about">About</a><ul><li><a href="/dhe">The DHE</a></li></ul></li></ul></nav></div>'})
    })
    const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
    const page=context.pages()[0]??await context.newPage()
    await page.goto(patch.match)
    const ready=await worker.evaluate(async url=>{
      const tabs=await chrome.tabs.query({})
      const tab=tabs.find(tab=>tab.url===url)
      if(!tab) return false
      const deadline=Date.now()+5000
      while(Date.now()<deadline) {
        const result=await chrome.tabs.sendMessage(tab.id,{type:'GET_ACTIVE',includeMatches:true}).catch(()=>null)
        if(result?.active?.some(item=>item.matchedRules?.length && item.selectorMatches?.every(({count})=>count>0))) {
          await chrome.storage.local.set({pendingStuck:true,capturedTabId:tab.id})
          return true
        }
        await new Promise(resolve=>setTimeout(resolve,100))
      }
      return false
    },patch.match)
    assert(ready,'The installed patch matched the page')
    const popup=await context.newPage()
    await popup.goto(new URL('popup.html',worker.url()).href)
    const panel=popup.locator('[data-patch-id="'+id+'"]')
    await panel.getByText('Send fix to site owner').click()
    await panel.getByRole('button',{name:'Copy Markdown'}).click()
    await panel.getByText('Copied.',{exact:true}).waitFor()
    const [download]=await Promise.all([popup.waitForEvent('download'),
      panel.getByRole('button',{name:'Download .md'}).click()])
    assert.equal(download.suggestedFilename(),id+'.md')
    assert.equal(await readFile(await download.path(),'utf8'),createReport(patch))
  } finally {
    await context?.close()
    await rm(profile,{recursive:true,force:true})
  }
})


test('a sealed Reading view absence needs both the replay report and an unnamed target',()=>{
  const task={observedSelector:'#menu',evaluation:{role:'button',name:'Site navigation'}}
  const recorded={kaneStatus:'pass',status:'inconclusive',evidenceValid:true,video:'recording.mp4',
    integrity:'The recording does not show the requested target being identified.',
    inspection:{harness:{persona:'screen-reader-view'},readerVisible:true},
    snapshot:{nodes:[{selector:'#menu',width:28,display:'block',role:'button',name:''}]},
    summary:'Target absent',steps:[]}
  assert(recordedAbsence(task,recorded))
  assert(!recordedAbsence(task,{...recorded,kaneStatus:'inconclusive'}))
  assert(!recordedAbsence(task,{...recorded,summary:'Found Site navigation'}))
  recorded.snapshot.nodes[0].name='Site navigation'
  assert(!recordedAbsence(task,recorded))
})
