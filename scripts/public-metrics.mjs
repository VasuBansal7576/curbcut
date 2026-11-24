import path from 'node:path'
import {ROOT,readJSON,saveJSON} from '../core/io.mjs'

async function read(file,fallback) {
  try {return await readJSON(path.join(ROOT,file))}
  catch(error) {if(error.code==='ENOENT') return fallback;throw error}
}

export async function publicMetrics({patches,kaneTasks,archive}) {
  const [site,keyboard,followup,famous,local,heldout]=await Promise.all([
    read('proof/scouting.json',{sites:[]}),
    read('proof/scouting-keyboard.json',{candidates:[]}),
    read('proof/scouting-keyboard-followup.json',{candidates:[]}),
    read('proof/famous/scouting.json',{tested:[]}),
    read('proof/public.json',{runs:[]}),
    read('proof/heldout/summary.json',{results:[]})
  ])
  const observations=new Map()
  const byId=new Map()
  function note({id,url,persona,task},source,observed) {
    if(!url || !persona || !task || !['http:','https:'].includes(new URL(url).protocol)) return
    const page=new URL(url)
    page.hostname=page.hostname.replace(/^www\./,'')
    page.hash=''
    const identity=[page.href,persona,task.trim().replace(/\s+/g,' ').replace(/\.$/,'').toLowerCase()].join('\n')
    const known=byId.get(id)
    const key=known??identity
    if(id) byId.set(id,key)
    const row=observations.get(key)??{id,url,persona,task,observations:[]}
    row.id??=id
    if(!row.observations.some(item=>item.source===source && item.status===observed)) row.observations.push({source,status:observed})
    observations.set(key,row)
  }
  for(const [file,rows] of [
    ['proof/scouting.json',site.sites],
    ['proof/scouting-keyboard.json',keyboard.candidates],
    ['proof/scouting-keyboard-followup.json',followup.candidates],
    ['proof/famous/scouting.json',famous.tested]
  ]) {
    for(const row of rows) {
      const status=row.verification??row.status
      const block=['confirmed','verified'].includes(status) && row.access!=='inaccessible'
      note(row,file,block?'blocked':status)
    }
  }
  for(const row of local.runs) if(row.status==='locally-reproduced') note(row,'proof/public.json','blocked')
  const heldTasks=heldout.results.filter(row=>!['pending','running'].includes(row.outcome))
  for(const row of heldTasks) note(row,'proof/heldout/summary.json',row.outcome)
  for(const row of [...kaneTasks,...heldTasks,...patches]) {
    const runs=archive.filter(run=>run.taskId===row.id)
    if(!runs.length) continue
    const passed=runs.some(run=>run.phase==='before' && run.status==='pass')
    const blocked=runs.some(run=>run.phase==='before' && run.status==='fail') && runs.some(run=>run.phase==='control' && run.status==='pass')
    note(row,'proof/kane/ledger.json',blocked?'blocked':passed?'baseline-pass':'inconclusive')
  }
  for(const patch of patches) {
    const status=patch.status==='broken'?'blocked':patch.status==='retired'?'historical-fix':'fixed'
    note(patch,'patches/'+patch.id+'.json',status)
  }
  const tasks=[...observations.values()]
  const blocked=tasks.filter(row=>row.observations.some(item=>['blocked','fixed','historical-fix'].includes(item.status)))
  const fixed=tasks.filter(row=>row.observations.some(item=>['fixed','historical-fix'].includes(item.status)))
  const open=blocked.filter(row=>!fixed.includes(row))
  const blockedByPersona=Object.fromEntries([...new Set(tasks.map(row=>row.persona))].sort().map(persona=>[persona,blocked.filter(row=>row.persona===persona).length]))
  const summary={tested:tasks.length,blocked:blocked.length,blockedByPersona,fixed:fixed.length,open:open.length,publicTasks:tasks}
  await saveJSON(path.join(ROOT,'proof/public-metrics.json'),summary)
  return summary
}
