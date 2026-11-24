import {readFile,readdir} from 'node:fs/promises'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {readJSON,saveJSON,instant} from '../core/io.mjs'
import {jevKey} from '../core/jev.mjs'
import {chooseStuck,cleanTrace,stuckThreshold} from '../core/jev-stuck.js'

const ledger=await readJSON('proof/kane/ledger.json')
const sessions=ledger.filter(row=>row.phase==='before' && row.sessionId && ['pass','fail'].includes(row.status))
const distinct=[...new Map(sessions.map(row=>[row.sessionId,row])).values()]
const dataset=[]
const key=await jevKey()

function normalizedKey(remark) {
  if(!/^press[_ ]key:/i.test(remark??'')) return null
  const raw=/\b(Shift\s*(?:\+|and)\s*Tab|Arrow\s*(?:Up|Down|Left|Right)|Up Arrow|Down Arrow|Left Arrow|Right Arrow|Tab|Enter|Return|Spacebar|Space|Escape|Home|End)\b/i.exec(remark)?.[1]
  if(!raw) return null
  if(/^shift/i.test(raw)) return 'Shift+Tab'
  if(/^(spacebar|space)$/i.test(raw)) return 'Space'
  if(/^return$/i.test(raw)) return 'Enter'
  if(/arrow/i.test(raw)) return 'Arrow'+/up|down|left|right/i.exec(raw)?.[0].replace(/^./,c=>c.toUpperCase())
  return raw.replace(/^./,c=>c.toUpperCase())
}

for(const run of distinct) {
  const result=await readJSON(run.result)
  if(result.inspection?.harness?.persona!=='keyboard-only' && !/use only keyboard|keyboard-only/i.test(result.objective??'')) continue
  const events=(await readFile(path.join(path.dirname(run.result),'events.ndjson'),'utf8')).split('\n').flatMap(line=>{
    try {return [JSON.parse(line)]} catch {return []}
  })
  const trusted=(result.recordingTrail??[]).flatMap(page=>page.events??[]).filter(event=>event.top)
  const hints=trusted.filter(event=>event.type==='tab-focus')
  let index=0
  const keyboard=events.filter(event=>event.status==='done').flatMap(event=>{
    const key=normalizedKey(event.remark)
    if(!key) return []
    return [{key,...(key.endsWith('Tab')?{revisited:hints[index++]?.revisited}:{}),at:Date.parse(event.ts)}]
  })
  const raw=keyboard.map(({at,...step},index)=>({...step,gapMs:index?at-keyboard[index-1].at:null}))
  dataset.push({id:run.sessionId,source:'Kane',partition:/^proof\/heldout-v[56]\//.test(run.result)?'later':'development',
    file:run.result,blocked:run.status==='fail',trace:cleanTrace(raw)})
}

for(const cohort of ['hard-v4','heldout-v5']) {
  const root='proof/'+cohort+'/local'
  const tasks=await readJSON('proof/'+cohort+'/registration.json')
  const keyboard=new Set(tasks.tasks.filter(row=>(row.task??row).persona==='keyboard-only').map(row=>(row.task??row).id))
  const files=(await readdir(root,{recursive:true})).filter(file=>/(?:^|\/)before\.json$/.test(file)).sort()
  for(const file of files) {
    const id=file.split('/')[0]
    if(!keyboard.has(id)) continue
    const result=await readJSON(path.join(root,file))
    if(!['pass','fail'].includes(result.status)) continue
    const nodes=new Map((result.snapshot?.nodes??[]).map(node=>[node.selector,node]))
    const identities=new Map()
    const focus=selector=>{
      if(!selector) return {}
      if(!identities.has(selector)) identities.set(selector,identities.size)
      const target=nodes.get(selector)
      return {focus:identities.get(selector),role:target?.role,named:target?Boolean(target.name):null,
        visible:target?Boolean(target.width>0 && !target.hidden):null}
    }
    const raw=(result.steps??[]).flatMap(step=>{
      if(step.traversal?.tabs>0) {
        const amount=Math.min(16,step.traversal.tabs)
        return Array.from({length:amount},(_,i)=>({key:'Tab',...(i===amount-1 && step.traversal.reached?focus(step.selector):{})}))
      }
      if(step.action==='key' || step.action==='activate') return [{key:step.key??'Enter',...focus(step.selector)}]
      return []
    })
    dataset.push({id,source:'local oracle',partition:cohort==='hard-v4'?'development':'later',
      file:path.join(root,file),blocked:result.status==='fail',trace:cleanTrace(raw)})
  }
}

const resultFile='proof/jev/stuck-backtest.json'
const journal=await readJSON(resultFile).catch(error=>{if(error.code!=='ENOENT')throw error;return {rows:[]}})
const results=new Map(journal.rows.map(row=>[row.file,row]))
const failures=new Map()
for(const row of dataset) {
  if(results.has(row.file)) continue
  let decision
  const start=Date.now()
  try {decision=await chooseStuck(key,row.trace)}
  catch(error) {
    failures.set(error.message,(failures.get(error.message)??0)+1)
    decision={p:null,reason:error.message}
  }
  results.set(row.file,{...row,...decision})
  if(results.size%20===0) {
    await saveJSON(resultFile,{rows:[...results.values()]})
    console.log('Keyboard traces',results.size,'/',dataset.length)
  }
  if([...failures.values()].some(n=>n>=2)) break
  if(row.trace.length>=6) await delay(Math.max(0,620-(Date.now()-start)))
}
function report(rows,threshold) {
  const scored=rows.filter(row=>Number.isFinite(row.p))
  const positives=rows.filter(row=>row.blocked).length
  const alerted=scored.filter(row=>row.p>=threshold)
  const truePositive=alerted.filter(row=>row.blocked).length
  return {total:rows.length,scored:scored.length,positives,alerts:alerted.length,truePositive,
    precision:alerted.length?truePositive/alerted.length:null,recall:positives?truePositive/positives:null,
    recallScored:scored.some(row=>row.blocked)?truePositive/scored.filter(row=>row.blocked).length:null}
}
const rows=dataset.map(row=>results.get(row.file)??{...row,p:null,reason:'not-run'})
const dev=rows.filter(row=>row.partition==='development')
const calibration=[.7,.8,.85,.9,.95,.98].map(threshold=>({threshold,...report(dev,threshold)}))
const threshold=stuckThreshold
const groups=Object.entries(Object.groupBy(rows,row=>row.source+' · '+row.partition))
const metrics=Object.fromEntries(groups.map(([group,parts])=>[group,report(parts,threshold)]))
const summary={checkedAt:instant(),threshold,calibration,metrics,rows}
await saveJSON(resultFile,summary)
console.log(JSON.stringify({threshold,metrics}))
