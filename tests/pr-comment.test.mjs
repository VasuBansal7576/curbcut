import test from 'node:test'
import assert from 'node:assert/strict'
import {writeFile,mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {command} from '../core/io.mjs'
import {MARKER,renderComment} from '../scripts/pr-comment.mjs'
import {sourceChange} from '../extension/lib/report.js'

const preview='https://pr-12.example.com'
const artifactUrl='https://github.com/acme/app/actions/runs/99'
const keyboardDom=[{selector:'div.add-to-cart',tag:'div',role:null,name:'Add to cart',tabIndex:-1}]
const readerDom=[{selector:'#search',tag:'input',role:'searchbox',name:'',tabIndex:0}]

function finding(status,extra={}) {
  return {url:preview,task:'Search for headphones and add Field Headphones to the cart. Confirm Cart (1).',persona:'keyboard-only',id:'keyboard-add-headphones',...extra,status}
}

test('comment for an all-pass gate',()=>{
  const markdown=renderComment({ok:true,exitCode:0,url:preview,findings:[
    finding('pass',{persona:'keyboard-only'}),
    finding('pass',{persona:'screen-reader-view',task:'Find the searchbox named Search products',id:'reader-search-products'})
  ]},{artifactUrl})
  assert.match(markdown,new RegExp(MARKER))
  assert.match(markdown,/Passed\. 2 of 2 cases passed\./)
  assert.match(markdown,/## PASS · keyboard-only/)
  assert.match(markdown,/## PASS · screen-reader-view/)
  assert.doesNotMatch(markdown,/Reason:/)
  assert.doesNotMatch(markdown,/Source change/)
  assert.doesNotMatch(markdown,/DOM/)
})

test('comment for an all-fail gate includes Kane reason, DOM, WCAG, source change, and recording link',()=>{
  const failKeyboard=finding('fail',{
    reason:'Tab traversal did not reach the target.',
    dom:keyboardDom,observedSelector:'div.add-to-cart',
    recording:'.curbcut/gate/run/keyboard-add-headphones-keyboard-only/recording.mp4',
    runner:'kane',
    wcag:[{id:'2.1.1',name:'Keyboard'}],
    source:[sourceChange({selector:'div.add-to-cart',action:'makeFocusable'})]
  })
  const failReader=finding('fail',{
    persona:'screen-reader-view',
    task:'Find the searchbox named Search products, search for speaker, and confirm one result named Porch Speaker.',
    id:'reader-search-products',
    reason:'The expected usable role and name were absent from Reading view.',
    dom:readerDom,observedSelector:'#search',requiredName:'Search products',
    recording:'.curbcut/gate/run/reader-search-products-screen-reader-view/recording.mp4',
    runner:'kane',
    wcag:[{id:'4.1.2',name:'Name, Role, Value'}],
    source:[sourceChange({selector:'#search',action:'addLabel',value:'Search products'})]
  })
  const markdown=renderComment({ok:false,exitCode:1,url:preview,findings:[failKeyboard,failReader]},{artifactUrl})
  assert.match(markdown,/Failed\. 2 of 2 cases failed\./)
  assert.match(markdown,/Reason: Tab traversal did not reach the target\./)
  assert.match(markdown,/div\.add-to-cart · div · Add to cart · tabIndex=-1/)
  assert.match(markdown,/WCAG: 2\.1\.1 Keyboard/)
  assert.match(markdown,/Source change/)
  assert.match(markdown,/tabindex="0"/)
  assert.match(markdown,/WCAG: 4\.1\.2 Name, Role, Value/)
  assert.match(markdown,/aria-label="Search products"/)
  assert.match(markdown,/Kane recording: \[keyboard-add-headphones-keyboard-only\/recording\.mp4\]\(https:\/\/github.com\/acme\/app\/actions\/runs\/99\)/)
  assert.match(markdown,/Kane recordings are uploaded as workflow artifacts/)
})

test('comment for a mixed gate',()=>{
  const markdown=renderComment({ok:false,exitCode:1,url:preview,findings:[
    finding('pass'),
    finding('fail',{persona:'screen-reader-view',task:'Find the searchbox named Search products',reason:'The expected usable role and name were absent from Reading view.',dom:readerDom,source:['name the searchbox'],wcag:[{id:'4.1.2',name:'Name, Role, Value'}]})
  ]})
  assert.match(markdown,/Mixed\. 1 passed, 1 failed, 0 inconclusive\./)
  assert.match(markdown,/## PASS · keyboard-only/)
  assert.match(markdown,/## FAIL · screen-reader-view/)
  assert.match(markdown,/Reason: The expected usable role and name were absent from Reading view\./)
})

test('comment for an inconclusive Kane run',()=>{
  const markdown=renderComment({ok:false,exitCode:1,url:preview,findings:[
    finding('inconclusive',{reason:'Kane ended without validated evidence.',runner:'kane',dom:null,recording:null})
  ]},{artifactUrl})
  assert.match(markdown,/Inconclusive\. 1 of 1 cases were inconclusive\./)
  assert.match(markdown,/## INCONCLUSIVE · keyboard-only/)
  assert.match(markdown,/Reason: Kane ended without validated evidence\./)
  assert.doesNotMatch(markdown,/Source change/)
  assert.match(markdown,/Kane recordings: \[workflow artifacts\]/)
})

test('pr-comment CLI reads gate JSON',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'curbcut-pr-comment-'))
  const file=path.join(dir,'gate.json')
  await writeFile(file,JSON.stringify({ok:true,exitCode:0,url:preview,findings:[finding('pass')]}))
  try {
    const cli=await command(process.execPath,['scripts/pr-comment.mjs',file,'--artifact-url',artifactUrl])
    assert.equal(cli.code,0,cli.stderr)
    assert.match(cli.stdout,new RegExp(MARKER))
    assert.match(cli.stdout,/Passed\. 1 of 1 cases passed\./)
  } finally {await rm(dir,{recursive:true,force:true})}
})
