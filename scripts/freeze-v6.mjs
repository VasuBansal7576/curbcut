import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,readJSON,saveJSON} from '../core/io.mjs'
import {git,sha256} from './scout-v4.mjs'

export const tag='curbcut-freeze-v6'
export const directory=path.join(ROOT,'proof/heldout-v6')
export const read=name=>readJSON(path.join(directory,name))
export const save=(name,value)=>saveJSON(path.join(directory,name),value)
export const paths=['core','fixtures/shop/v6','schemas','extension/runtime.js','package.json','package-lock.json',
  'scripts/calibrate-v6.mjs','scripts/freeze-v6.mjs','scripts/sample-v6.mjs','scripts/scout-v6.mjs','scripts/repair-v6.mjs','scripts/kane-v6.mjs']

export async function input(name,base=tag) {
  const file='proof/heldout-v6/'+name
  const commit=(await git(['log','--diff-filter=A','--reverse','--format=%H',base+'..HEAD','--',file])).split('\n')[0]
  assert(commit,file+' must be committed before running this stage')
  const expected=await git(['rev-parse',commit+':'+file])
  assert.equal(await git(['hash-object','--no-filters',file]),expected,file+' committed content')
  return {commit,blob:expected}
}

export async function frozen() {
  const freeze=await read('freeze-integrity.json')
  const commit=await git(['rev-parse',tag+'^{commit}'])
  await git(['merge-base','--is-ancestor',commit,'HEAD'])
  assert.equal(freeze.frozenCommit,commit)
  assert.equal(await git(['status','--porcelain','--untracked-files=all','--',...paths]),'','Working source differs from the freeze')
  for(const name of paths) {
    assert.equal(await git(['rev-parse','HEAD:'+name]),freeze.frozenObjects[name].hash,name)
  }
  return freeze
}

if(process.argv[2]==='record' && process.argv[1]?.endsWith('freeze-v6.mjs')) {
  const commit=await git(['rev-parse',tag+'^{commit}'])
  assert.equal(commit,await git(['rev-parse','HEAD']))
  assert.equal(await git(['status','--porcelain','--untracked-files=all','--',...paths]),'')
  const frozenObjects={}
  for(const name of paths) {
    frozenObjects[name]={type:await git(['cat-file','-t',commit+':'+name]),hash:await git(['rev-parse',commit+':'+name])}
  }
  const file='frozen-source.tar.gz'
  await git(['archive','--format=tar.gz','--output='+path.join(directory,file),commit,'--',...paths])
  const sampleFile='proof/heldout-v6/sample.json'
  const sampleCommit=(await git(['log','--diff-filter=A','--reverse','--format=%H',commit,'--',sampleFile])).split('\n')[0]
  assert(sampleCommit && sampleCommit!==commit)
  assert.equal(await git(['rev-parse',commit+':'+sampleFile]),await git(['rev-parse',sampleCommit+':'+sampleFile]))
  await save('freeze-integrity.json',{version:1,frozenTag:tag,frozenCommit:commit,objectFormat:await git(['rev-parse','--show-object-format']),
    archive:{file,sha256:sha256(await readFile(path.join(directory,file)))},frozenObjects,
    inputs:{'sample.json':{commit:sampleCommit,blob:await git(['rev-parse',sampleCommit+':'+sampleFile])}}})
}
