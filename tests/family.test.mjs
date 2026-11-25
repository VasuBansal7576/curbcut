import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createFamilyReport} from '../extension/lib/report.js'
import {familyDecision} from '../core/loop.mjs'
import {templateFor} from '../core/recipes.mjs'
import {matchesFamily,resolveTargets,runFamily,selectFamilyTemplates} from '../core/family.mjs'
import {readJSON} from '../core/io.mjs'

const original=(await readJSON('extension/demo.json'))[0]
const snapshot={
  url:original.url,
  nodes:[{selector:'div.add-to-cart',tag:'div',role:'button',parent:'body',children:[]}],
  context:{nodes:[{selector:'div.add-to-cart',tag:'div',role:'button',parent:'body',children:[]}]},
  interactionContext:{nodes:[]},
  repair:{stack:[]}
}

test('family targets parse a list file or raw URLs',async()=>{
  const fromUrls=await resolveTargets(['https://doc.rust-lang.org/book/','https://example.org/'])
  assert.deepEqual(fromUrls.map(row=>row.url),['https://doc.rust-lang.org/book/','https://example.org/'])
  const fromFile=await resolveTargets(['proof/census/urls.txt'])
  assert.ok(fromFile.length>=1)
})

test('family templates match a recipe id, patch id, or template id',()=>{
  const donor={...original,id:'donor-a',status:'verified',observedSelector:'div.add-to-cart'}
  const template=templateFor(donor,snapshot)
  assert.equal(matchesFamily(template,'donor-a',donor),true)
  assert.equal(matchesFamily(template,template.id,donor),true)
  const selected=selectFamilyTemplates('donor-a',[template],[donor])
  assert.equal(selected.length,1)
  assert.equal(selectFamilyTemplates('missing',[template],[donor]).length,0)
})

test('the family report names the barrier, affected sites, source change, and evidence',()=>{
  const text=createFamilyReport({
    familyId:'mdbook',familyName:'mdBook',barrier:'Preformatted code does not wrap at 320 CSS pixels.',
    template:{id:'tmpl',persona:'low-vision',barrier:'Preformatted code does not wrap at 320 CSS pixels.'},
    sites:[
      {url:'https://doc.rust-lang.org/book/ch01-02-hello-world.html',status:'repaired'},
      {url:'https://doc.rust-lang.org/rust-by-example/hello.html',status:'no-template-matched',reason:'Selector absent'}
    ],
    rules:[{selector:'pre code',action:'injectCSS',value:{'white-space':'pre-wrap'}}],
    evidence:[['Kane after recording','proof/kane/rust-book-reflow/heldout-v2/attempt-1/after/recording.mp4']]
  })
  assert.match(text,/Accessibility repair for mdBook/)
  assert.match(text,/Preformatted code does not wrap/)
  assert.match(text,/doc\.rust-lang\.org\/book/)
  assert.match(text,/did not repair/)
  assert.match(text,/white-space/)
  assert.match(text,/Kane after recording/)
  assert.match(text,/4\.1\.10|1\.4\.10/)
})

test('family sampling records local bypass after three verified instances',async()=>{
  const patch={evidence:{templateId:'family-test-template',repairMethod:'inheritance','inherited-from':'donor-a'}}
  const policy={minimumVerified:3,oneIn:5,seed:'curbcut-family-v1'}
  const first=await familyDecision({url:'https://a.example/',id:'one'},patch,policy)
  assert.equal(first.evidence.mode,'full')
  first.state.verified.push('two','three')
  const file=first.file
  const {saveJSON}=await import('../core/io.mjs')
  await saveJSON(file,first.state)
  try {
    const next=await familyDecision({url:'https://b.example/',id:'four'},patch,policy)
    assert.ok(['sampled','local-sample-bypass'].includes(next.evidence.mode))
    assert.equal(next.evidence.verifiedInstances,3)
  } finally {
    await rm(file,{force:true})
  }
})

test('family scan applies one inherited template with a mocked replay',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'curbcut-family-'))
  const donor={...original,id:'family-donor',status:'verified',observedSelector:'div.add-to-cart',
    rules:[{selector:'div.add-to-cart',action:'makeFocusable'}],
    probe:{action:'click'},outcomeChecks:[{selector:'#cart-status',kind:'text',equals:'Field Headphones added to cart.'}]}
  const other={...donor,id:'family-other',url:'http://127.0.0.1:4317/fixtures/shop/porch.html',site:'127.0.0.1',
    match:'http://127.0.0.1:4317/fixtures/shop/porch.html'}
  const template=templateFor(other,snapshot)
  try {
    const result=await runFamily(['http://127.0.0.1:4317/fixtures/shop/'],{
      template:template.id,kane:false,directory,pauseMs:0,
      catalogPatches:[donor,other],templates:[template],
      replay:async(_task,persona,patch)=>({
        status:persona==='control'||patch?'pass':'fail',
        reason:'mocked family replay',
        snapshot
      })
    })
    assert.equal(result.scanned,1)
    assert.equal(result.repaired,1)
    assert.equal(result.sites[0].status,'repaired')
    assert.match(result.report,/Source change/)
    assert.match(result.report,/Affected sites/)
  } finally {await rm(directory,{recursive:true,force:true})}
})

test('family scan applies the donor template to the source site',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'curbcut-family-src-'))
  const donor={...original,id:'family-source',status:'verified',observedSelector:'div.add-to-cart',
    rules:[{selector:'div.add-to-cart',action:'makeFocusable'}],
    probe:{action:'click'},outcomeChecks:[{selector:'#cart-status',kind:'text',equals:'Field Headphones added to cart.'}]}
  const template=templateFor(donor,snapshot)
  try {
    const result=await runFamily([donor.url],{
      template:donor.id,kane:false,directory,pauseMs:0,
      catalogPatches:[donor],templates:[template],
      replay:async(_task,persona,patch)=>({
        status:persona==='control'||patch?'pass':'fail',
        reason:'mocked donor replay',
        snapshot
      })
    })
    assert.equal(result.repaired,1)
    assert.equal(result.sites[0].status,'repaired')
  } finally {await rm(directory,{recursive:true,force:true})}
})
