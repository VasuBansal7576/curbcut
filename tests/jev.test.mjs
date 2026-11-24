import test from 'node:test'
import assert from 'node:assert/strict'
import {chooseInstant,instantPatch} from '../core/jev-policy.js'
import {match} from '../core/engine.js'

const state={url:'https://example.org/page',width:800,candidates:[
  {id:'c0',selector:'#search',tag:'input',actions:{addLabel:true},names:[{text:'Search',source:'placeholder'}]},
  {id:'c1',selector:'#image',tag:'img',actions:{setAltText:true},names:[{text:'Field guide',source:'image filename'}]}
]}
const screenshot='data:image/png;base64,c2NyZWVuc2hvdA=='
const answer=(answer={})=>({
  model:'jev-test',answers:{
    family:{choice:'addLabel',confidence:.96},target:{choice:'c0',confidence:.91},safe:{noul:.8},name:{choice:'n0',confidence:.98},...answer
  }
})
const stub=(t,payload)=>t.mock.method(globalThis,'fetch',async(_url,request)=>{
  const body=JSON.parse(request.body)
  assert.equal(Object.keys(body.assets).length,1)
  assert.equal(body.questions.safe.type,'noul')
  assert.equal(body.state.candidates[0].selector,undefined)
  return Response.json(payload)
})

test('instant decisions select an existing candidate and exact local name',async t=>{
  stub(t,answer())
  const decision=await chooseInstant('test-only',state,screenshot)
  assert.equal(decision.confidence,.8)
  assert.deepEqual(decision.rules,[{action:'addLabel',selector:'#search',value:'Search'}])
  const patch=instantPatch(state.url,decision)
  assert.equal(match(patch,state.url),true)
  assert.equal(match(patch,'https://example.org/other'),false)
})

test('instant decisions reject a name belonging to a different target',async t=>{
  stub(t,answer({name:{choice:'n1',confidence:1}}))
  const decision=await chooseInstant('test-only',state,screenshot)
  assert.equal(decision.reason,'unsupported-decision')
  assert.equal(decision.rules,undefined)
})
