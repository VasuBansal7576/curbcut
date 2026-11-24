import path from 'node:path'
import {mkdir,readFile} from 'node:fs/promises'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {git,sha256} from './scout-v4.mjs'

export const folder='proof/heldout-v5'
export const tag='curbcut-freeze-v5'
export const sampleSeed='curbcut-v5-visible-keyboard-tranco-2026-11-23-restart'
export const kaneSeed='curbcut-v5-verified-subset-2026-11-23'
export const count=2050,concurrency=3,minimumRank=1000,maximumRank=50000
export const attempts=5,model='gpt-6.2-sol'
export const frozenPaths=['core','extension','schemas','schemas/patch.json','scripts','fixtures','tests','curbcut.mjs','package.json','package-lock.json','site/style.css']
export const relative=name=>folder+'/'+name
export const given=name=>path.join(ROOT,relative(name))
export const read=name=>readJSON(given(name))
export const save=(name,value)=>saveJSON(given(name),value)
export const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right)
export const blob=file=>git(['hash-object','--no-filters',file])

export async function optional(name) {
  try {return await read(name)}
  catch(error) {if(error.code==='ENOENT') return null;throw error}
}

export async function firstInput(name) {
  const file=relative(name)
  const added=await git(['log','--diff-filter=A','--format=%H','--reverse',tag+'..HEAD','--',file])
  const commit=added.split('\n')[0]
  if(!commit) throw new Error(file+' must be committed first.')
  const [expected,actual]=await Promise.all([git(['rev-parse',commit+':'+file]),blob(file)])
  if(actual!==expected) throw new Error(file+' differs from its first committed bytes.')
  return {commit,blob:expected}
}

export async function recordFreeze() {
  if(await optional('freeze-integrity.json')) throw new Error('The freeze receipt already exists.')
  const commit=await git(['rev-parse',tag+'^{commit}'])
  if(commit!==await git(['rev-parse','HEAD']) || await git(['status','--porcelain','--untracked-files=all','--',...frozenPaths])) {
    throw new Error('Tag the clean workflow commit before recording the freeze.')
  }
  const frozenObjects={}
  for(const name of frozenPaths) {
    const ref=commit+':'+name
    frozenObjects[name]={type:await git(['cat-file','-t',ref]),hash:await git(['rev-parse',ref])}
  }
  await mkdir(given(''),{recursive:true})
  const file='frozen-source.tar.gz'
  await git(['archive','--format=tar.gz','--output='+given(file),commit,'--',...frozenPaths])
  const objectFormat=await git(['rev-parse','--show-object-format'])
  await save('freeze-integrity.json',{version:1,recordedAt:instant(),frozenTag:tag,frozenCommit:commit,objectFormat,
    archive:{file,sha256:sha256(await readFile(given(file)))},frozenObjects})
  console.log('Recorded the '+tag+' source archive at '+commit+'.')
}

export async function frozen() {
  const receipt=await read('freeze-integrity.json')
  const commit=await git(['rev-parse',tag+'^{commit}'])
  await git(['merge-base','--is-ancestor',commit,'HEAD'])
  const [work,history]=await Promise.all([
    git(['status','--porcelain','--untracked-files=all','--',...frozenPaths]),
    git(['log','--format=%H',commit+'..HEAD','--',...frozenPaths])
  ])
  if(work || history || receipt.frozenTag!==tag || receipt.frozenCommit!==commit) throw new Error('The live workflow differs from the v5 freeze.')
  for(const [name,entry] of Object.entries(receipt.frozenObjects)) {
    if(entry.hash!==await git(['rev-parse',commit+':'+name])) throw new Error('Frozen tree receipt mismatch for '+name+'.')
  }
  return receipt
}

export function breakdown(rows,success) {
  function score(group) {
    const statuses=Object.groupBy(group,row=>row.status)
    return {fixed:statuses[success]?.length??0,total:group.length,counts:Object.fromEntries(Object.entries(statuses).map(([status,items])=>[status,items.length]))}
  }
  const group=field=>Object.fromEntries(Object.entries(Object.groupBy(rows,row=>row.task[field]??'single-control')).map(([key,items])=>[key,score(items)]))
  return {...score(rows),byClass:group('barrierClass'),byPersona:group('persona')}
}
