import assert from 'node:assert/strict'
import {mkdir,mkdtemp,rename,rm} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,command,readJSON} from '../core/io.mjs'

const {version}=await readJSON(path.join(ROOT,'extension/manifest.json'))
const releaseVersion=version.replace(/\.0$/,'')
const output=path.resolve(process.argv[2]??path.join(ROOT,'.curbcut','releases','curbcut-extension-v'+releaseVersion+'.zip'))
const extension=path.join(ROOT,'extension')
assert(output!==extension && !output.startsWith(extension+path.sep),'Place the archive outside extension/.')
const directory=path.dirname(output)
await mkdir(directory,{recursive:true})
const scratch=await mkdtemp(path.join(directory,'.curbcut-zip-'))
try {
  const archive=path.join(scratch,path.basename(output))
  const build=await command('zip',['-qr',archive,'extension','-x','*/.DS_Store'])
  assert.equal(build.code,0,build.stderr)
  const list=await command('unzip',['-Z1',archive])
  assert.equal(list.code,0,list.stderr)
  const members=list.stdout.trim().split('\n')
  assert(members.includes('extension/manifest.json') && members.every(member=>member.startsWith('extension/')))
  await rename(archive,output)
  console.log(output)
} finally {await rm(scratch,{recursive:true,force:true})}
