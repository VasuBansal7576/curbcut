import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,readJSON,saveJSON} from '../core/io.mjs'
import {git,sha256} from './scout-v4.mjs'

export const tag='curbcut-freeze-v7'
export const directory=path.join(ROOT,'proof/heldout-v7')
export const read=name=>readJSON(path.join(directory,name))
export const save=(name,value)=>saveJSON(path.join(directory,name),value)
export const paths=['core/access.mjs','core/agent.mjs','core/browser.js','core/chrome.mjs','core/coverage-browser.js','core/coverage.mjs',
  'core/engine.js','core/contrast.js','core/geometry.js','core/hover.js','core/io.mjs','core/jev-browser.js','core/jev.mjs','core/kane.mjs','core/preflight.mjs','core/probe.mjs','core/selectors.js','core/validate.generated.cjs','core/viewport.mjs','core/widgets.js','core/jev-decisions.js','core/jev-naming-browser.js','core/jev-policy.js','core/task.mjs','extension/runtime.js',
  'extension/jev-decisions-runtime.js','extension/naming-content.js','extension/naming-background.js','scripts/build-runtime.mjs','schemas','package-lock.json','scripts/scout-v4.mjs','scripts/scout-v5.mjs',
  ...['freeze','verify','sample','scout','measure','jev-v7-browser','kane'].map(name=>'scripts/'+(name==='jev-v7-browser'?name:name+'-v7')+'.mjs'),
  'scripts/kane-evidence-v6.mjs']

export async function input(name,ref='HEAD') {
  const file='proof/heldout-v7/'+name
  const commit=(await git(['log','--diff-filter=A','--reverse','--format=%H',ref,'--',file])).split('\n')[0]
  assert(commit,file+' must be committed before running this stage')
  const blob=await git(['rev-parse',commit+':'+file])
  assert.equal(await git(['hash-object','--no-filters',file]),blob,file+' committed content')
  return {commit,blob}
}

export async function frozen() {
  const freeze=await read('freeze-integrity.json')
  const commit=await git(['rev-parse',tag+'^{commit}'])
  assert.equal(freeze.frozenCommit,commit)
  await git(['merge-base','--is-ancestor',commit,'HEAD'])
  assert.equal(await git(['status','--porcelain','--untracked-files=all','--',...paths]),'','Working source differs from freeze')
  for(const name of paths) assert.equal(await git(['rev-parse','HEAD:'+name]),freeze.frozenObjects[name].hash,name)
  return freeze
}

if(process.argv[2]==='record' && process.argv[1]?.endsWith('freeze-v7.mjs')) {
  const commit=await git(['rev-parse',tag+'^{commit}'])
  assert.equal(commit,await git(['rev-parse','HEAD']))
  assert.equal(await git(['status','--porcelain','--untracked-files=all','--',...paths]),'')
  const frozenObjects={}
  for(const name of paths) frozenObjects[name]={type:await git(['cat-file','-t',commit+':'+name]),hash:await git(['rev-parse',commit+':'+name])}
  const file='frozen-source.tar.gz'
  await git(['archive','--format=tar.gz','--output='+path.join(directory,file),commit,'--',...paths])
  const sample=await input('sample.json',commit)
  assert.notEqual(sample.commit,commit)
  await save('freeze-integrity.json',{version:1,frozenTag:tag,frozenCommit:commit,objectFormat:await git(['rev-parse','--show-object-format']),
    archive:{file,sha256:sha256(await readFile(path.join(directory,file)))},frozenObjects,inputs:{'sample.json':sample}})
}
