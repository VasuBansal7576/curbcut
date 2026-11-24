import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {command} from '../core/io.mjs'
import {runGate} from '../core/gate.mjs'
import {fixtureServer} from './fixture-server.mjs'

const shop='http://127.0.0.1:4317/fixtures/shop/'

test('gate --dry-run --local lists keyboard and screen-reader cases with zero Kane credits',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'curbcut-gate-'))
  const config=path.join(dir,'curbcut.gate.json')
  await writeFile(config,JSON.stringify({url:shop,tasks:['Search for headphones and add Field Headphones to the cart. Confirm Cart (1).']}))
  try {
    const result=await runGate({config,local:true,dryRun:true})
    assert.equal(result.ok,true)
    assert.equal(result.plans.length,2)
    assert.deepEqual(result.plans.map(row=>row.persona),['keyboard-only','screen-reader-view'])
    assert.match(result.text,/0 Kane credits/)
  } finally {await rm(dir,{recursive:true,force:true})}
})

test('gate --local against the shop fixture fails with a compact DOM snippet',async()=>{
  const server=await fixtureServer()
  const dir=await mkdtemp(path.join(tmpdir(),'curbcut-gate-'))
  const config=path.join(dir,'curbcut.gate.json')
  await writeFile(config,JSON.stringify({
    url:shop,
    tasks:[
      'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).',
      'Find the searchbox named Search products, search for speaker, and confirm one result named Porch Speaker.'
    ]
  }))
  try {
    const result=await runGate({config,local:true})
    assert.equal(result.ok,false)
    assert.equal(result.exitCode,1)
    assert.equal(result.findings.length,4)
    const failed=result.findings.filter(row=>row.status!=='pass')
    assert.ok(failed.length>=2)
    assert.ok(failed.every(row=>row.reason))
    const keyboard=result.findings.find(row=>row.persona==='keyboard-only' && /headphones/i.test(row.task))
    const reader=result.findings.find(row=>row.persona==='screen-reader-view' && /search products/i.test(row.task))
    assert.equal(keyboard.status,'fail')
    assert.equal(reader.status,'fail')
    assert.ok(keyboard.dom?.some(node=>node.selector==='div.add-to-cart' || node.tabIndex===-1) || /Tab traversal|not visible|role and name/i.test(keyboard.reason))
    assert.match(result.text,/FAIL {2}keyboard-only/)
    assert.match(result.text,/reason: /)
    const cli=await command(process.execPath,['curbcut.mjs','gate','--local','--dry-run','--config',config])
    assert.equal(cli.code,0,cli.stderr)
    assert.match(cli.stdout,/0 Kane credits/)
    const json=await command(process.execPath,['curbcut.mjs','gate','--local','--dry-run','--json','--config',config,'--url',shop])
    assert.equal(json.code,0,json.stderr)
    const payload=JSON.parse(json.stdout)
    assert.equal(payload.ok,true)
    assert.equal(payload.dryRun,true)
    assert.equal(payload.url,shop)
    assert.equal(payload.plans.length,4)
    assert.ok(payload.plans.every(row=>row.kane.estimatedCredits===0))
  } finally {
    await rm(dir,{recursive:true,force:true})
    if(server) await new Promise(resolve=>server.close(resolve))
  }
})
