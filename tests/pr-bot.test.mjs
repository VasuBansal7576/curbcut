import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {command} from '../core/io.mjs'
import {MARKER} from '../scripts/pr-comment.mjs'
import {fixtureServer} from './fixture-server.mjs'

const shop='http://127.0.0.1:4317/fixtures/shop/'

test('action run.mjs dry-runs curbcut gate --local against the shop fixture',async()=>{
  const server=await fixtureServer()
  const dir=await mkdtemp(path.join(tmpdir(),'curbcut-pr-bot-'))
  const jsonOut=path.join(dir,'gate.json')
  const commentOut=path.join(dir,'comment.md')
  try {
    const cli=await command(process.execPath,[
      '.github/actions/curbcut-gate/run.mjs',
      '--url',shop,
      '--config','examples/curbcut.gate.json',
      '--local',
      '--json-out',jsonOut,
      '--comment-out',commentOut,
      '--timeout','30'
    ],{timeout:600000})
    assert.equal(cli.code,1,cli.stderr)
    const result=JSON.parse(await readFile(jsonOut,'utf8'))
    assert.equal(result.ok,false)
    assert.equal(result.url,shop)
    assert.ok(result.findings.length>=2)
    const failed=result.findings.filter(row=>row.status!=='pass')
    assert.ok(failed.length>=2)
    assert.ok(failed.every(row=>row.reason))
    const keyboard=result.findings.find(row=>row.persona==='keyboard-only' && /headphones/i.test(row.task))
    const reader=result.findings.find(row=>row.persona==='screen-reader-view' && /search products/i.test(row.task))
    assert.equal(keyboard.status,'fail')
    assert.equal(reader.status,'fail')
    assert.ok(keyboard.wcag?.some(entry=>entry.id==='2.1.1'))
    assert.ok(reader.wcag?.some(entry=>entry.id==='4.1.2'))
    assert.ok(keyboard.source?.some(block=>/tabindex="0"/.test(block)))
    assert.ok(reader.source?.some(block=>/aria-label=/.test(block)))
    const comment=await readFile(commentOut,'utf8')
    assert.match(comment,new RegExp(MARKER))
    assert.match(comment,/FAIL · keyboard-only/)
    assert.match(comment,/Reason: /)
    assert.match(comment,/WCAG: /)
    assert.match(comment,/Source change/)
    assert.match(comment,/Local oracle\. No Kane recording\./)
  } finally {
    await rm(dir,{recursive:true,force:true})
    if(server) await new Promise(resolve=>server.close(resolve))
  }
})
