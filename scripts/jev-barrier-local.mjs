import {setTimeout as delay} from 'node:timers/promises'
import {tmpdir} from 'node:os'
import {session} from '../core/chrome.mjs'
import {journeyLane} from '../core/probe.mjs'
import {normalizeTask} from '../core/task.mjs'
import {jevKey} from '../core/jev.mjs'
import {askJev,imageAsset,noul} from '../core/jev-policy.js'
import {readJSON,saveJSON,instant} from '../core/io.mjs'

const archive=await readJSON('proof/jev/barrier-backtest.json')
const key=await jevKey()
const registry=new Map()
for(const cohort of ['hard-v4','heldout-v5']) {
  const registration=await readJSON('proof/'+cohort+'/registration.json')
  for(const {task} of registration.tasks) if(task?.journey?.length) registry.set(task.id,task)
}
const known=archive.rows.filter(row=>registry.has(row.taskId))
const results=[]
const done=new Set()
const failures=new Map()
for(const row of known) {
  if(done.has(row.taskId)) continue
  done.add(row.taskId)
  let browser
  const record={id:row.taskId,source:row.file,before:row.status,verified:row.verified,credits:row.credits}
  try {
    const task=await normalizeTask(registry.get(row.taskId))
    browser=await session(task,task.persona,null,tmpdir(),{gate:true,local:true,navigationTimeout:8000})
    const assets={},frames=[]
    const capture=async page=>{
      if(frames.length>=3) return false
      const bytes=await page.screenshot({type:'jpeg',quality:60,timeout:2500}).catch(()=>null)
      if(!bytes) return false
      const {id,asset}=imageAsset('data:image/jpeg;base64,'+bytes.toString('base64'))
      frames.push(id)
      assets[id]=asset
      return false
    }
    await capture(browser.page)
    const local=await journeyLane(browser,task,task.persona,{onDOM:capture})
    if(frames.length<3) await capture(browser.page)
    record.localStatus=local.status
    record.frames=frames.length
    if(frames.length && !['blocked','inconclusive'].includes(local.status)) {
      const answer=await askJev(key,{model:'jev-1.14.0',state:{task:task.task,persona:task.persona,frames},assets,
        questions:{blocked:noul('Would the stated persona actually be blocked from completing this task on the original site, judging only the visible unpatched browser states?',
          'The control or information is persistently unavailable to the persona or visibly inoperable for the required steps.',
          'A feasible route is visible, the required outcome is already available, or the snapshots give no concrete evidence of a barrier.')}})
      record.p=answer.answers?.blocked?.noul??null
    }
  } catch(error) {
    record.reason=error.message.split('\n')[0]
    if(/HTTP|fetch failed|aborted/.test(record.reason)) failures.set(record.reason,(failures.get(record.reason)??0)+1)
  } finally {await browser?.abort()}
  results.push(record)
  console.log(record.id,record.before,record.localStatus??'unavailable',record.p??'unscored')
  if([...failures.values()].some(value=>value>=2)) break
  await delay(950)
}
const scored=results.filter(row=>Number.isFinite(row.p))
const skipped=scored.filter(row=>row.p<archive.threshold)
await saveJSON('proof/jev/barrier-local.json',{runner:'playwright',checkedAt:instant(),eligible:done.size,totalKnownArchived:archive.eligible,
  scored:scored.length,threshold:archive.threshold,verifiedLost:skipped.filter(row=>row.verified && row.before==='fail').length,
  passedSkipped:skipped.filter(row=>row.before==='pass').length,failedSkipped:skipped.filter(row=>row.before==='fail').length,rows:results})
