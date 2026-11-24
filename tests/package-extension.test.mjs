import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,stat} from 'node:fs/promises'
import path from 'node:path'
import {packageExtension,readZip} from '../scripts/package-extension.mjs'

test('npm run package writes a root-level Chrome extension zip without private or test files',async()=>{
  const manifest=JSON.parse(await readFile('extension/manifest.json','utf8'))
  const {file,entries,bytes}=await packageExtension()
  assert.equal(path.basename(file),'curbcut-extension-'+manifest.version+'.zip')
  const archive=await readFile(file)
  assert.equal(archive.length,bytes)
  assert.ok(archive.length<10*1024*1024)
  assert.equal((await stat(file)).size,bytes)
  const members=readZip(archive)
  const names=members.map(member=>member.name)
  assert.equal(members.length,entries)
  assert.ok(names.includes('manifest.json'))
  assert.equal(new Set(names).size,names.length)
  for(const name of names) {
    assert.ok(!name.includes('.curbcut'),name)
    assert.ok(!name.includes('proof/'),name)
    assert.ok(!name.includes('tests/'),name)
    assert.ok(!name.includes('key'),name)
    assert.ok(!name.endsWith('.map'),name)
  }
  const packaged=members.find(member=>member.name==='manifest.json')
  assert.equal(JSON.parse(packaged.data.toString('utf8')).version,manifest.version)
  for(const member of members) {
    const source=await readFile(path.join('extension',member.name))
    assert.ok(source.equals(member.data),member.name)
  }
})
