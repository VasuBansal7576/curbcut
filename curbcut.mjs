#!/usr/bin/env node
import {readJSON} from './core/io.mjs'
import {catalog,fix,fixBatch,recheck,withLock} from './core/loop.mjs'
import {requireKane} from './core/kane.mjs'
import {serve} from './core/server.mjs'
import {recheckLocal} from './core/recheck-local.mjs'
import {preflight} from './core/preflight.mjs'
import {visualPreflight} from './core/jev-preflight.mjs'
import {verifyQueue} from './core/jev-queue.mjs'
import {checkPage} from './core/check.mjs'
import {runGate,serializeGate} from './core/gate.mjs'
import {meter,summarizeCost} from './core/cost.mjs'
import {runCensus} from './core/census.mjs'
import {createReport} from './extension/lib/report.js'
import {runFamily} from './core/family.mjs'

const usage='curbcut serve | curbcut verify-queue | curbcut report <patch-id> | curbcut family <listfile-or-urls...> --template <family-id> [--kane] [--json] | curbcut fix <task.json> | curbcut check <url> "<task>" [--persona keyboard-only|screen-reader-view|low-vision] [--local] [--dry-run] | curbcut gate [--config curbcut.gate.json] [--url <preview>] [--local] [--dry-run] [--json] | curbcut census <url-list-file> [--limit N] | curbcut cost [--json] | curbcut preflight <task.json> | curbcut visual-preflight <task.json> | curbcut recheck [patch-id|--public|--local [patch-id]]'

function parseArgv(argv) {
  const flags={}
  const rest=[]
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i]
    if(arg==='--local' || arg==='--dry-run' || arg==='--public' || arg==='--json' || arg==='--kane') flags[arg.slice(2)]=true
    else if(arg==='--persona' || arg==='--config' || arg==='--url' || arg==='--limit' || arg==='--template') flags[arg.slice(2)]=argv[++i]
    else if(arg.startsWith('--persona=')) flags.persona=arg.slice(10)
    else if(arg.startsWith('--config=')) flags.config=arg.slice(9)
    else if(arg.startsWith('--url=')) flags.url=arg.slice(6)
    else if(arg.startsWith('--template=')) flags.template=arg.slice(11)
    else rest.push(arg)
  }
  return {action:rest[0],rest:rest.slice(1),flags}
}

const {action,rest,flags}=parseArgv(process.argv.slice(2))
async function main() {
  if(action==='family' && rest[0]) {
    const result=await runFamily(rest,{template:flags.template,kane:Boolean(flags.kane)})
    process.stdout.write(flags.json?JSON.stringify({template:result.template,familyName:result.familyName,scanned:result.scanned,
      repaired:result.repaired,kane:result.kane,directory:result.directory,sites:result.sites.map(site=>({url:site.url,status:site.status,reason:site.reason}))},null,2)+'\n':result.report)
  } else if(action==='census' && rest[0]) {
    const limit=flags.limit===undefined?undefined:Number(flags.limit)
    if(Object.hasOwn(flags,'limit') && (!Number.isInteger(limit) || limit<0)) throw new Error('census --limit needs a non-negative integer')
    const result=await runCensus(rest[0],{limit})
    console.log(JSON.stringify({observed:result.observed,blocked:result.blocked,failed:result.failed,
      tokens:result.tokens,branch:result.branch,commit:result.commit,
      recipes:result.recipes.map(recipe=>({id:recipe.id,share:recipe.jev.share,low:recipe.jev.low,high:recipe.jev.high,
        labelled:recipe.labelled.n}))},null,2))
  } else if(action==='cost') console.log(JSON.stringify(await summarizeCost(),null,2))
  else if(action==='serve') {await serve();console.log('Curb Cut · http://127.0.0.1:4317/site/')}
  else if(action==='verify-queue') console.log(JSON.stringify(await verifyQueue(),null,2))
  else if(action==='report' && rest[0]) {
    const patch=(await catalog()).find(patch=>patch.id===rest[0])
    if(!patch) throw new Error('Unknown patch '+rest[0])
    process.stdout.write(createReport(patch))
  } else if(action==='fix' && rest[0]) {
    const task=await readJSON(rest[0])
    await requireKane()
    const result=await withLock(()=>Array.isArray(task)?fixBatch(task):fix(task))
    console.log(JSON.stringify(result,null,2))
    if([result].flat().some(row=>!['already-accessible','verified','locally-fixed'].includes(row.status))) process.exitCode=1
  } else if(action==='check' && rest[0] && rest[1]) {
    if(!flags.local && !flags['dry-run']) await requireKane()
    const result=flags['dry-run']?await checkPage({url:rest[0],task:rest[1],persona:flags.persona,local:flags.local,dryRun:true}):
      await withLock(()=>checkPage({url:rest[0],task:rest[1],persona:flags.persona,local:flags.local}))
    process.stdout.write(result.text)
    if(!result.ok) process.exitCode=1
  } else if(action==='gate') {
    if(!flags.local && !flags['dry-run']) await requireKane()
    const result=await runGate({config:flags.config,local:flags.local,dryRun:flags['dry-run'],url:flags.url})
    process.stdout.write(flags.json?JSON.stringify(serializeGate(result),null,2)+'\n':result.text)
    process.exitCode=result.exitCode
  } else if(action==='visual-preflight' && rest[0]) {
    console.log(JSON.stringify(await visualPreflight(await readJSON(rest[0])),null,2))
  } else if(action==='preflight' && rest[0]) {
    const result=await preflight(await readJSON(rest[0]))
    console.log(JSON.stringify(result,null,2))
    if(result.status!=='pass') process.exitCode=1
  } else if(action==='recheck' && flags.local) console.log(JSON.stringify(await withLock(()=>recheckLocal(rest[0])),null,2))
  else if(action==='recheck') console.log(JSON.stringify(await withLock(()=>recheck(flags.public?'--public':rest[0])),null,2))
  else console.log(usage)
}
try {
  if(['check','fix','gate','family'].includes(action)) await meter(action,{
    balance:action==='family'?flags.kane?requireKane:null:action!=='fix' && (flags.local || flags['dry-run'])?null:requireKane
  },main)
  else await main()
} catch(error) {console.error(error.message);process.exitCode=2}
