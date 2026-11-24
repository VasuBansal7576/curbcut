import assert from 'node:assert/strict'
import {mkdir,readdir,readFile,rename,rm,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {crc32,deflateRawSync,inflateRawSync} from 'node:zlib'
import {ROOT,command,readJSON} from '../core/io.mjs'

const source=path.join(ROOT,'extension')
const excluded=/(^|\/)(\.DS_Store|\.curbcut|proof|tests|fixtures)(\/|$)|\.map$|\.test\.|\.(key|pem|p12)$/
const dosDate=0x0021

function record(signature,fields) {
  const parts=[Buffer.alloc(4)]
  parts[0].writeUInt32LE(signature)
  for(const [bytes,value] of fields) {
    const part=Buffer.alloc(bytes)
    if(bytes===2) part.writeUInt16LE(value)
    else part.writeUInt32LE(value)
    parts.push(part)
  }
  return Buffer.concat(parts)
}

export function writeZip(entries) {
  const chunks=[],central=[]
  let offset=0
  for(const {name,data} of entries) {
    const body=deflateRawSync(data,{level:9}),nameBytes=Buffer.from(name),crc=crc32(data)
    const local=record(0x04034b50,[[2,20],[2,0x800],[2,8],[2,0],[2,dosDate],[4,crc],[4,body.length],[4,data.length],[2,nameBytes.length],[2,0]])
    chunks.push(local,nameBytes,body)
    central.push(record(0x02014b50,[[2,20],[2,20],[2,0x800],[2,8],[2,0],[2,dosDate],[4,crc],[4,body.length],[4,data.length],[2,nameBytes.length],[2,0],[2,0],[2,0],[2,0],[4,0o100644*65536],[4,offset]]),nameBytes)
    offset+=local.length+nameBytes.length+body.length
  }
  const directory=Buffer.concat(central)
  const end=record(0x06054b50,[[2,0],[2,0],[2,entries.length],[2,entries.length],[4,directory.length],[4,offset],[2,0]])
  return Buffer.concat([...chunks,directory,end])
}

export function readZip(buffer) {
  const end=buffer.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]))
  assert(end>=0,'The archive has no end-of-central-directory record.')
  const count=buffer.readUInt16LE(end+10)
  let position=buffer.readUInt32LE(end+16)
  const entries=[]
  for(let index=0;index<count;index++) {
    assert.equal(buffer.readUInt32LE(position),0x02014b50)
    const size=buffer.readUInt32LE(position+20),nameLength=buffer.readUInt16LE(position+28),extraLength=buffer.readUInt16LE(position+30),commentLength=buffer.readUInt16LE(position+32),local=buffer.readUInt32LE(position+42)
    const name=buffer.toString('utf8',position+46,position+46+nameLength)
    const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28)
    entries.push({name,data:inflateRawSync(buffer.subarray(start,start+size))})
    position+=46+nameLength+extraLength+commentLength
  }
  return entries
}

async function files(relative='') {
  const found=[]
  for(const entry of await readdir(path.join(source,relative),{withFileTypes:true}).then(list=>list.sort((a,b)=>a.name.localeCompare(b.name)))) {
    const name=relative?relative+'/'+entry.name:entry.name
    if(entry.isDirectory()) found.push(...await files(name))
    else if(entry.isFile()) found.push(name)
  }
  return found
}

function referenced(manifest) {
  return [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    manifest.options_ui?.page,
    ...Object.values(manifest.icons??{}),
    ...Object.values(manifest.action?.default_icon??{}),
    ...(manifest.content_scripts??[]).flatMap(script=>script.js??[]),
    ...(manifest.web_accessible_resources??[]).flatMap(entry=>entry.resources??[])
  ].filter(Boolean)
}

export async function packageExtension({output}={}) {
  const built=await command('npm',['run','build'],{timeout:600000})
  assert.equal(built.code,0,built.stderr.slice(-4000))
  const manifest=await readJSON(path.join(source,'manifest.json'))
  const file=output??path.join(ROOT,'dist','curbcut-extension-'+manifest.version+'.zip')
  const names=(await files()).filter(name=>!excluded.test(name))
  for(const reference of referenced(manifest)) assert(names.includes(reference),'The manifest references a missing file: '+reference)
  assert(names.includes('manifest.json'))
  const entries=await Promise.all(names.map(async name=>({name,data:await readFile(path.join(source,name))})))
  const archive=writeZip(entries)
  await mkdir(path.dirname(file),{recursive:true})
  const temp=file+'.'+process.pid+'.tmp'
  try {
    await writeFile(temp,archive)
    await rename(temp,file)
  } finally {await rm(temp,{force:true})}
  return {file,entries:entries.length,bytes:archive.length}
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const {file,entries,bytes}=await packageExtension()
  console.log(file+' ('+entries+' entries, '+bytes+' bytes)')
}
