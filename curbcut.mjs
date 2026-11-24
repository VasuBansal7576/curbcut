#!/usr/bin/env node
import {readJSON} from './core/io.mjs'
import {fix,recheck,withLock} from './core/loop.mjs'
import {requireKane} from './core/kane.mjs'
import {serve} from './core/server.mjs'
import {recheckLocal} from './core/recheck-local.mjs'
import {preflight} from './core/preflight.mjs'
const [action,file,localId]=process.argv.slice(2)
try {
  if(action==='serve') {await serve();console.log('Curb Cut · http://127.0.0.1:4317/site/')}
  else if(action==='fix' && file) {
    const task=await readJSON(file)
    await requireKane()
    const result=await withLock(()=>fix(task))
    console.log(JSON.stringify(result,null,2))
    if(!['already-accessible','verified'].includes(result.status)) process.exitCode=1
  } else if(action==='preflight' && file) {
    const result=await preflight(await readJSON(file))
    console.log(JSON.stringify(result,null,2))
    if(result.status!=='pass') process.exitCode=1
  } else if(action==='recheck' && file==='--local') console.log(JSON.stringify(await withLock(()=>recheckLocal(localId)),null,2))
  else if(action==='recheck') console.log(JSON.stringify(await withLock(()=>recheck(file)),null,2))
  else console.log('curbcut serve | curbcut fix <task.json> | curbcut preflight <task.json> | curbcut recheck [patch-id|--public|--local [patch-id]]')
} catch(error) {console.error(error.message);process.exitCode=2}
