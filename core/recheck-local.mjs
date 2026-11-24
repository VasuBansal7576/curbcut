import path from 'node:path'
import {ROOT,command,instant,readJSON,saveJSON} from './io.mjs'
import {catalog} from './loop.mjs'
import {normalizeTask} from './task.mjs'
import {replayLane} from './probe.mjs'
import {hasLegacyReplay,replayLegacy} from './recheck-legacy.mjs'

const colorPicker={
  observedSelector:'div.sp-replacer.sp-light',
  successSelector:'.sp-picker-container'
}
const objectives={
  'report-605ca95e172608f662':colorPicker,
  'report-cb10e18073d48f295a':colorPicker,
  'report-d6870c43f8831c2d3b':colorPicker
}

function replayable(patch,supplements) {
  const data={...patch,...supplements[patch.id],...objectives[patch.id],url:patch.url??patch.match.replace(/\*$/,'')}
  if(data.probe || data.journey || data.evaluation) return data
  if(!data.observedSelector || !data.successSelector || data.persona!=='keyboard-only') return null
  return {...data,probe:{action:'click'},outcomeChecks:data.outcomeChecks??[{selector:data.successSelector,kind:'visible'}]}
}

const compact=result=>{
  if(!result) return null
  const {snapshot,...evidence}=result
  return evidence
}

export async function recheckLocal(id) {
  const patches=await catalog()
  if(id && !patches.some(patch=>patch.id===id)) throw new Error('Unknown patch '+id)
  const active=patches.filter(patch=>['verified','locally-verified'].includes(patch.status) && (!id || id===patch.id))
  const supplements=await readJSON(path.join(ROOT,'tasks/recheck-keyboard.json'))
  const results=[]
  for(const patch of active) {
    const legacy=hasLegacyReplay(patch.id)
    const replay=legacy?replayLegacy:(task,persona,patch)=>replayLane(task,persona,patch,{targetWait:3600})
    const data=legacy?{...patch,url:patch.url??patch.match.replace(/\*$/,'')}:replayable(patch,supplements)
    const base={id:patch.id,persona:patch.persona,url:patch.url,runner:'playwright',at:instant()}
    if(!data) {
      results.push({...base,status:'inconclusive',reason:'The published task needs an input or outcome sequence that the local oracle cannot replay.'})
      continue
    }
    try {
      const task=await normalizeTask(data)
      const control=await replay(task,'control')
      if(control.status!=='pass') {
        results.push({...base,status:'inconclusive',control:compact(control),reason:'Pointer control: '+control.reason})
        continue
      }
      const before=await replay(task,task.persona)
      const after=before.status==='fail'?await replay(task,task.persona,patch):null
      const afterControl=after?.status==='pass'?await replay(task,'control',patch):null
      const status=before.status==='pass'?'retired':after?.status==='fail'?'broken':
        after?.status==='pass' && afterControl?.status==='pass'?'still-verified':'inconclusive'
      const row={...base,status,control:compact(control),before:compact(before),after:compact(after),afterControl:compact(afterControl),
        reason:afterControl?.reason??after?.reason??before.reason}
      results.push(row)
      if(status==='retired' || status==='broken') {
        patch.status=status
        patch.history.push({at:row.at,event:'local-'+status,runner:'playwright',without:before.status,with:after?.status})
        await saveJSON(path.join(ROOT,'patches',patch.id+'.json'),patch)
      }
    } catch(error) {
      results.push({...base,status:'inconclusive',reason:error.message.split('\n')[0]})
    }
  }
  const groups=Object.groupBy(results,row=>row.status)
  if(groups.retired?.length || groups.broken?.length) {
    const built=await command(process.execPath,['scripts/build-site.mjs'])
    if(built.code!==0) throw new Error(built.stderr.trim()||'Could not rebuild the catalog after local recheck.')
  }
  return {runner:'playwright',total:results.length,counts:Object.fromEntries(Object.entries(groups).map(([status,rows])=>[status,rows.length])),results}
}
