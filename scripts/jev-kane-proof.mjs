import assert from 'node:assert/strict'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {readdir} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
import {runKane,requireKane} from '../core/kane.mjs'
import {normalizeTask} from '../core/task.mjs'
import {withLock} from '../core/loop.mjs'
import {threshold} from '../core/jev-policy.js'
import {ROOT,readJSON,saveJSON,instant,command} from '../core/io.mjs'

const root=path.join(ROOT,'proof/jev')
const selectionFile='proof/jev/kane-selection.json'
const selectionPath=path.join(ROOT,selectionFile)
const digest=value=>createHash('sha256').update(value).digest('hex')
const seed='curb-cut-jev-v5-kane-2026-11-24'
const budget=500
const floor=1400
const reserve=90
const phasePlan=[['before','fail'],['control','pass'],['after','pass']]
const limits={control:{maxSteps:14,timeout:120},before:{maxSteps:28,timeout:180},after:{maxSteps:28,timeout:180}}

async function selection() {
  const {tasks}=await readJSON(path.join(ROOT,'proof/heldout-v5/registration.json'))
  const replay=await readJSON(path.join(root,'heldout-v5-replay.json'))
  assert.equal(replay.threshold,threshold)
  assert.equal(replay.rows.length,tasks.length,'Complete the registered held-out benchmark before drawing cases.')
  const archive=await readdir(path.join(ROOT,'proof'),{recursive:true})
  const previouslyRun=new Set(archive.filter(name=>name.endsWith('/events.ndjson') && !name.startsWith('jev/'))
    .flatMap(name=>name.split(path.sep).filter(part=>/^v5-/.test(part))))
  const eligible=replay.rows.filter(row=>row.status==='instant-fixed' && !previouslyRun.has(row.id))
    .map(({id,patch})=>({id,rank:digest(seed+'\n'+id),candidateSha256:digest(JSON.stringify(patch))}))
    .sort((a,b)=>a.rank.localeCompare(b.rank))
  return {seed,budget,floor,reserve,retryOnInconclusive:1,limits,threshold,eligible:eligible.length,selection:eligible.slice(0,5)}
}

async function freeKane() {
  while(true) {
    const running=await command('pgrep',['-x','kane-cli'],{timeout:5000})
    if(running.code===1) return
    if(running.code!==0) throw new Error('Could not check for another kane-cli process.')
    await delay(15000)
  }
}
async function currentBalance() {
  await freeKane()
  const response=await requireKane()
  const value=Number(response.match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
  if(!Number.isFinite(value)) throw new Error('Could not read available Kane credits.')
  return value
}
async function reconcile(selection) {
  const summaryPath=path.join(root,'kane-summary.json')
  const initialBalance=await currentBalance()
  const progress={runner:'kane',startedAt:instant(),selection:selection.selection,initialBalance,budget,floor,cases:[]}
  const minimumStart=Math.max(floor,initialBalance-budget+reserve)
  const replay=await readJSON(path.join(root,'heldout-v5-replay.json'))
  const failures=new Map()
  if(initialBalance<minimumStart) progress.stopped='The balance is below the protected starting floor.'
  for(const {id} of selection.selection) {
    if(progress.stopped) break
    const {patch}=replay.rows.find(row=>row.id===id)
    const task=await normalizeTask(patch)
    const row={id,phases:{},verified:false}
    progress.cases.push(row)
    for(const [phase] of phasePlan) {
      row.phases[phase]=[]
      for(let attempt=1;attempt<=2;attempt++) {
        if(progress.stopped) break
        let result
        const beforeRun=async()=>{
          const available=await currentBalance()
          if(available<minimumStart) {
            progress.stopped='The balance reached the protected floor or the remaining budget fell below the phase reserve.'
            throw new Error(progress.stopped)
          }
          await freeKane()
        }
        const folder=path.join(root,'kane',id,phase+'-'+attempt)
        try {
          result=await runKane(task,phase==='control'?'control':task.persona,phase==='after'?patch:null,folder,
            {...limits[phase],beforeRun})
        } catch(error) {
          const reason=error.message.split('\n')[0]
          failures.set(reason,(failures.get(reason)??0)+1)
          if(failures.get(reason)>=2) progress.stopped='Repeated failure: '+reason
          result={status:'inconclusive',reason}
        }
        row.phases[phase].push({status:result.status,runId:result.runId??null,reason:result.integrity??result.reason,
          evidenceValid:result.evidenceValid===true,video:result.video??null,credits:result.credits??null})
        await saveJSON(summaryPath,progress)
        if(result.status!=='inconclusive') break
      }
      if(progress.stopped) break
    }
    row.verified=phasePlan.every(([phase,expected])=>{
      const result=row.phases[phase]?.at(-1)
      return result?.status===expected && result.runId && result.video && result.evidenceValid
    })
    await saveJSON(summaryPath,progress)
  }
  progress.finishedAt=instant()
  progress.finalBalance=await currentBalance()
  progress.creditsUsed=Number((initialBalance-progress.finalBalance).toFixed(4))
  progress.verified=progress.cases.filter(row=>row.verified).length
  await saveJSON(summaryPath,progress)
  return progress
}

if(process.argv[2]==='select') {
  const selected=await selection()
  assert.equal(selected.selection.length,5,'Fewer than five new cases passed the instant fix benchmark.')
  await saveJSON(selectionPath,selected)
  console.log(JSON.stringify(selected,null,2))
} else if(process.argv[2]==='run') {
  const sealed=await readJSON(selectionPath)
  assert.deepEqual(sealed,await selection())
  assert.equal(sealed.selection.length,5)
  const {code,stdout}=await command('git',['show','HEAD:'+selectionFile])
  assert.equal(code,0,'Commit the selection before running Kane.')
  assert.deepEqual(JSON.parse(stdout),sealed)
  console.log(JSON.stringify(await withLock(()=>reconcile(sealed)),null,2))
} else throw new Error('Use select or run.')
