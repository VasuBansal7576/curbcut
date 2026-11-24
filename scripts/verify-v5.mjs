import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const folder=fileURLToPath(new URL('../proof/heldout-v5/',import.meta.url))
const read=name=>readFile(path.join(folder,name),'utf8').then(JSON.parse)
const optional=name=>read(name).catch(error=>{if(error.code!=='ENOENT') throw error})
const freeze=await read('freeze-integrity.json')
const registration=await optional('registration-integrity.json')
const selection=await optional('kane-selection-integrity.json')
if(registration) {
  assert.equal(registration.objectFormat,freeze.objectFormat)
  assert.deepEqual(registration.frozenObjects,freeze.frozenObjects)
}
const archive=path.join(folder,freeze.archive.file)
const bytes=await readFile(archive)
assert.equal(createHash('sha256').update(bytes).digest('hex'),freeze.archive.sha256,'Frozen archive SHA-256')

const work=await mkdtemp(path.join(tmpdir(),'curbcut-v5-integrity-'))
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
  const inputs={...registration?.inputs,...selection?.inputs}
  for(const [name,{blob}] of Object.entries(inputs)) {
    assert(name===path.basename(name),'Unexpected input path '+name)
    assert.equal(git('hash-object','--no-filters',path.join(folder,name)),blob,name+' committed content')
  }
  console.log('Verified '+roots.length+' frozen Git objects and '+Object.keys(inputs).length+' registered inputs.')
} finally {await rm(work,{recursive:true,force:true})}
