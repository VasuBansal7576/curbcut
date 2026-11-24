#!/usr/bin/env node
import {readJSON} from './core/io.mjs'
import {catalog,fix,recheck,withLock} from './core/loop.mjs'
import {requireKane} from './core/kane.mjs'
import {serve} from './core/server.mjs'
import {recheckLocal} from './core/recheck-local.mjs'
import {preflight} from './core/preflight.mjs'
import {visualPreflight} from './core/jev-preflight.mjs'
import {verifyQueue} from './core/jev-queue.mjs'
import {createReport} from './extension/lib/report.js'
import {runCensus} from './core/census.mjs'
const [action,file,localId]=process.argv.slice(2)
try {
  if(action==='serve') {await serve();console.log('Curb Cut · http://127.0.0.1:4317/site/')}
  else if(action==='census' && file) {
    const limitFlag=process.argv.indexOf('--limit')
    const limit=limitFlag>=0?Number(process.argv[limitFlag+1]):undefined
    if(limitFlag>=0 && !Number.isInteger(limit)) throw new Error('census --limit needs an integer')
    const result=await runCensus(file,{limit})
    console.log(JSON.stringify({observed:result.observed,blocked:result.blocked,failed:result.failed,
      tokens:result.tokens,branch:result.branch,commit:result.commit,
      recipes:result.recipes.map(recipe=>({id:recipe.id,share:recipe.jev.share,low:recipe.jev.low,high:recipe.jev.high,
        labelled:recipe.labelled.n}))},null,2))
  }
  else if(action==='verify-queue') console.log(JSON.stringify(await verifyQueue(),null,2))
  else if(action==='report' && file) {
    const patch=(await catalog()).find(patch=>patch.id===file)
    if(!patch) throw new Error('Unknown patch '+file)
    process.stdout.write(createReport(patch))
  } else if(action==='fix' && file) {
    const task=await readJSON(file)
    await requireKane()
    const result=await withLock(()=>fix(task))
    console.log(JSON.stringify(result,null,2))
    if(!['already-accessible','verified'].includes(result.status)) process.exitCode=1
  } else if(action==='visual-preflight' && file) {
    console.log(JSON.stringify(await visualPreflight(await readJSON(file)),null,2))
  } else if(action==='preflight' && file) {
    const result=await preflight(await readJSON(file))
    console.log(JSON.stringify(result,null,2))
    if(result.status!=='pass') process.exitCode=1
  } else if(action==='recheck' && file==='--local') console.log(JSON.stringify(await withLock(()=>recheckLocal(localId)),null,2))
  else if(action==='recheck') console.log(JSON.stringify(await withLock(()=>recheck(file)),null,2))
  else console.log('curbcut serve | curbcut verify-queue | curbcut report <patch-id> | curbcut fix <task.json> | curbcut preflight <task.json> | curbcut visual-preflight <task.json> | curbcut recheck [patch-id|--public|--local [patch-id]] | curbcut census <url-list-file> [--limit N]')
} catch(error) {console.error(error.message);process.exitCode=2}
