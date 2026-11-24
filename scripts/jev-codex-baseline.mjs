import path from 'node:path'
import {createHash} from 'node:crypto'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {propose} from '../core/agent.mjs'
import {ROOT,readJSON,saveJSON} from '../core/io.mjs'

delete process.env.CURBCUT_JEV_FIRST
const seed='curb-cut-jev-codex-timing-v4'
const source=await readJSON(path.join(ROOT,'proof/hard-v4/local-summary.json'))
const sample=source.results.filter(result=>result.status==='locally-fixed' && result.phases.some(phase=>phase.name==='before'))
  .map(result=>({result,rank:createHash('sha256').update(seed+result.task.id).digest('hex')}))
  .sort((a,b)=>a.rank.localeCompare(b.rank)).slice(0,5)
const work=await mkdtemp(path.join(tmpdir(),'curbcut-jev-codex-'))
const rows=[]
const failures=new Map()
try {
  for(const {result:{task,phases}} of sample) {
    const archived=await readJSON(path.join(ROOT,phases.find(phase=>phase.name==='before').file))
    const start=performance.now()
    const row={id:task.id,url:task.url}
    try {
      const patch=await propose(task,archived,null,path.join(work,task.id),{retryInvalid:false})
      row.status='proposal'
      row.rules=patch.rules.length
    } catch(error) {
      row.status='failed'
      row.reason=error.message.split('\n')[0].slice(0,240)
      const reason=row.reason.split(':')[0]
      failures.set(reason,(failures.get(reason)??0)+1)
    }
    row.ms=Math.round(performance.now()-start)
    rows.push(row)
    console.log(row.id,row.status,row.ms,row.reason??'')
    await saveJSON(path.join(ROOT,'proof/jev/codex-timing.json'),{seed,sample:sample.map(({result})=>result.task.id),
      scope:'Archived development before state to one Codex proposal and live selector validation',rows})
    if([...failures.values()].some(count=>count>=2)) break
  }
} finally {await rm(work,{recursive:true,force:true})}
