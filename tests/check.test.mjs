import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {command,readJSON,saveJSON} from '../core/io.mjs'
import {checkPage,deriveTask,similarTask} from '../core/check.mjs'
import {fixtureURL,localAppURL} from '../core/task.mjs'
import {fixtureServer} from './fixture-server.mjs'

const shop='http://127.0.0.1:4317/fixtures/shop/'
const original=(await readJSON('extension/demo.json'))[0]

test('similarTask matches a shortened fixture objective',()=>{
  assert.equal(similarTask(
    'Using only the keyboard, search for headphones and add Field Headphones to the cart. Confirm Cart (1).',
    'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).'
  ),true)
})

test('local app URLs are accepted on loopback HTTP',()=>{
  assert.equal(localAppURL(new URL('http://127.0.0.1:3000/app')),true)
  assert.equal(localAppURL(new URL('http://localhost:4173/')),true)
  assert.equal(localAppURL(new URL('https://example.com/')),false)
  assert.equal(fixtureURL(new URL('http://127.0.0.1:4317/fixtures/shop/')),true)
  assert.equal(fixtureURL(new URL('http://127.0.0.1:4391/fixtures/shop/')),true)
})

test('check derives a shop keyboard probe from plain English without a browser',async()=>{
  const task=await deriveTask({url:shop,task:'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).',persona:'keyboard-only'})
  const moved=await deriveTask({url:'http://127.0.0.1:4391/fixtures/shop/',task:'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).',persona:'keyboard-only'})
  assert.equal(moved.id,'keyboard-add-headphones')
  assert.equal(moved.url,'http://127.0.0.1:4391/fixtures/shop/')
  assert.equal(task.id,'keyboard-add-headphones')
  assert.equal(task.observedSelector,'.add-to-cart')
  assert.equal(task.probe.action,'click')
  assert.equal(task.outcomeChecks[0].selector,'#cart-status')
})

test('check derives the named searchbox probe for the screen-reader persona',async()=>{
  const task=await deriveTask({url:shop,task:'Find the searchbox named Search products, search for speaker, and confirm one result named Porch Speaker.',persona:'screen-reader-view'})
  assert.equal(task.observedSelector,'#search')
  assert.equal(task.requiredName,'Search products')
  assert.deepEqual(task.probe,{action:'type',value:'speaker',role:'searchbox'})
})

test('check dry-run prints the plan and a zero Kane estimate with --local',async()=>{
  const result=await checkPage({url:shop,task:'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).',persona:'keyboard-only',local:true,dryRun:true})
  assert.equal(result.ok,true)
  assert.equal(result.kane.estimatedCredits,0)
  assert.match(result.text,/0 Kane credits/)
  assert.match(result.text,/add-to-cart/)
  const billed=await checkPage({url:shop,task:'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).',dryRun:true})
  assert.ok(billed.kane.estimatedCredits>0)
  assert.match(billed.text,/estimated credits: /)
})

test('check --local repairs the shop keyboard barrier with a stubbed agent',async()=>{
  const server=await fixtureServer()
  const base=await mkdtemp(path.join(tmpdir(),'curbcut-check-'))
  try {
    const result=await checkPage({
      url:shop,
      task:'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).',
      persona:'keyboard-only',
      local:true,
      base,
      write:async task=>({...structuredClone(original),id:task.id,url:task.url,task:task.task,persona:task.persona,
        site:new URL(task.url).hostname,match:new URL(task.url).origin+new URL(task.url).pathname,status:'candidate',evidence:{},history:[]})
    })
    assert.equal(result.result.status,'locally-fixed')
    assert.equal(result.ok,true)
    assert.match(result.text,/WCAG: 2\.1\.1 Keyboard/)
    assert.match(result.text,/patch: keyboard-add-headphones/)
    assert.match(result.text,/report: /)
  } finally {
    await rm(base,{recursive:true,force:true})
    if(server) await new Promise(resolve=>server.close(resolve))
  }
})

test('the CLI dry-run path spends no Kane credits',async()=>{
  const result=await command(process.execPath,['curbcut.mjs','check',shop,'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).','--local','--dry-run'])
  assert.equal(result.code,0,result.stderr)
  assert.match(result.stdout,/0 Kane credits/)
})

test('live Check publishes only after the agent proposal and all three sealed Kane lanes',async()=>{
  const server=await fixtureServer()
  const base=await mkdtemp(path.join(tmpdir(),'curbcut-check-'))
  const lanes=[]
  let published
  try {
    const result=await checkPage({
      url:shop,
      task:'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).',
      base,
      write:async (task,failure,_previous,directory)=>{
        assert.equal(failure.status,'fail')
        const patch={...structuredClone(original),...task,status:'candidate',evidence:{},history:[]}
        await saveJSON(path.join(directory,'provenance.json'),{writer:'grok',runner:failure.runner})
        return patch
      },
      run:async (_task,persona,patch,directory)=>{
        lanes.push([persona,Boolean(patch)])
        return {runner:'kane',runId:'stub-'+lanes.length,evidenceValid:true,
          status:lanes.length===1?'fail':'pass',video:path.join(directory,'recording.mp4')}
      },
      persist:async patch=>{
        const provenance=await readJSON(path.join(base,'attempt-1/provenance.json'))
        const proposal=await readJSON(path.join(provenance.repairDirectory,'candidate.json'))
        assert.equal((await readJSON(provenance.sourceLocalRun)).status,'fail')
        assert.deepEqual(patch.rules,proposal.rules)
        published=patch
      }
    })
    assert.equal(result.result.status,'verified')
    assert.deepEqual(lanes,[['keyboard-only',false],['control',false],['keyboard-only',true]])
    assert.deepEqual(published.evidence.kaneRunIds,['stub-1','stub-2','stub-3'])
  } finally {
    await rm(base,{recursive:true,force:true})
    if(server) await new Promise(resolve=>server.close(resolve))
  }
})
