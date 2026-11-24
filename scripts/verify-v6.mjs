import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const folder=fileURLToPath(new URL('../proof/heldout-v6/',import.meta.url))
const read=name=>readFile(path.join(folder,name),'utf8').then(JSON.parse)
const optional=name=>read(name).catch(error=>{if(error.code!=='ENOENT') throw error})
const freeze=await read('freeze-integrity.json')
const receipt=await optional('study-integrity.json')
const files=['calibration/summary.json','scouting.json','registration.json','local-summary.json','kane-selection.json']
const registered=Object.fromEntries(await Promise.all(files.map(async name=>[name,await optional(name)])))
if(process.argv[2]==='seal') {
  const {input,save,tag}=await import('./freeze-v6.mjs')
  const inputs={}
  for(const name of files) if(registered[name]) inputs[name]=await input(name,name==='calibration/summary.json'?tag:undefined)
  await save('study-integrity.json',{frozenCommit:freeze.frozenCommit,inputs})
  console.log('Sealed '+Object.keys(inputs).length+' committed study inputs.')
  process.exit(0)
}
if(receipt) {
  assert.equal(receipt.frozenCommit,freeze.frozenCommit)
  for(const name of files) if(registered[name]) assert(receipt.inputs[name],name+' missing integrity receipt')
}
const archive=path.join(folder,freeze.archive.file)
const bytes=await readFile(archive)
assert.equal(createHash('sha256').update(bytes).digest('hex'),freeze.archive.sha256,'Frozen archive SHA-256')

const work=await mkdtemp(path.join(tmpdir(),'curbcut-v6-integrity-'))
const env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}
for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_OBJECT_DIRECTORY','GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key]
const run=(name,...args)=>execFileSync(name,args,{cwd:work,env,encoding:'utf8',maxBuffer:8*1024*1024}).trim()
const git=(...args)=>run('git','-c','core.autocrlf=false','-c','core.filemode=true',...args)
try {
  const roots=Object.keys(freeze.frozenObjects)
  for(const entry of run('tar','-tzf',archive).split('\n').map(name=>name.replace(/\/$/,''))) {
    assert(!entry.startsWith('/') && !entry.split('/').includes('..') &&
      roots.some(root=>entry===root || entry.startsWith(root+'/') || root.startsWith(entry+'/')), 'Unexpected archive path '+entry)
  }
  run('tar','-xzf',archive)
  git('init','--quiet','--template=','--object-format='+freeze.objectFormat)
  git('add','--force','--',...roots)
  const tree=git('write-tree')
  for(const [name,{type,hash}] of Object.entries(freeze.frozenObjects)) {
    const ref=tree+':'+name
    assert.equal(git('cat-file','-t',ref),type,name+' object type')
    assert.equal(git('rev-parse',ref),hash,name+' frozen content')
  }
  const inputs={...freeze.inputs,...receipt?.inputs}
  for(const [name,{blob}] of Object.entries(inputs)) {
    assert(name==='sample.json' || files.includes(name),'Unexpected input path '+name)
    assert.equal(git('hash-object','--no-filters',path.join(folder,name)),blob,name+' committed content')
  }
  const sha=value=>createHash('sha256').update(value).digest('hex')
  const sample=await read('sample.json')
  assert.equal(sample.sites.length,400)
  assert.equal(new Set(sample.sites.map(row=>row.site)).size,400)
  assert.deepEqual(sample.sites.map(row=>row.order),sample.sites.map(row=>sha(sample.seed+'\n'+row.site)).sort())
  const scout=registered['scouting.json'],registration=registered['registration.json']
  if(scout) {
    assert.equal(scout.attempted,400)
    assert.deepEqual(scout.rows.map(row=>row.site),sample.sites.map(row=>row.site))
  }
  if(registration) {
    assert(scout)
    assert.deepEqual(registration.sample,freeze.inputs['sample.json'])
    const expected=scout.rows.flatMap(row=>(row.candidates??[]).filter(candidate=>candidate.access==='pass'))
    assert.deepEqual(registration.tasks.map(row=>row.task.id),expected.map(row=>row.id))
    for(const rows of Object.values(Object.groupBy(registration.tasks,row=>new URL(row.task.url).hostname))) {
      assert(rows.length<=3)
      assert.equal(new Set(rows.map(row=>row.task.evaluation.category)).size,rows.length)
    }
    for(const [index,row] of registration.tasks.entries()) {
      assert.equal(row.access.status,'pass')
      if(row.crop) assert.equal(sha(Buffer.from(row.crop,'base64')),expected[index].cropSha256)
    }
  }
  const local=registered['local-summary.json'],selection=registered['kane-selection.json']
  if(local) {
    assert.deepEqual(local.rows.map(row=>row.id),registration.tasks.map(row=>row.task.id))
    for(const [category,counts] of Object.entries(local.byCategory)) {
      const rows=local.rows.filter(row=>row.category===category)
      const fixed=rows.filter(row=>row.status==='locally-fixed')
      assert.deepEqual(counts,{fixed:fixed.length,total:rows.length})
      assert(fixed.every(row=>row.before.status==='fail' && row.after.status==='pass' && row.restored.status==='fail'))
    }
  }
  if(selection) {
    const calibration=registered['calibration/summary.json']
    assert.equal(selection.calibrationPassed,calibration.passed)
    const categories=['missing-alt','empty-link','empty-button',...(calibration.passed?['low-contrast']:[])]
    assert.deepEqual(Object.keys(selection.targets),categories)
    for(const category of categories) {
      const eligible=local.rows.filter(row=>row.status==='locally-fixed' && row.category===category &&
        (category==='low-contrast' || row.patch.evaluation.name))
      const rank=row=>sha(selection.seed+'\n'+row.id)
      const expected=eligible.map(row=>({id:row.id,rank:rank(row),candidateSha256:sha(JSON.stringify(row.patch))}))
        .sort((a,b)=>a.rank.localeCompare(b.rank)).slice(0,5)
      assert.deepEqual(selection.targets[category],expected)
    }
  }
  console.log('Verified '+roots.length+' frozen Git objects and '+Object.keys(inputs).length+' registered inputs.')
} finally {await rm(work,{recursive:true,force:true})}
