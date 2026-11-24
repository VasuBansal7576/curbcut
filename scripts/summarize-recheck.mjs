import path from 'node:path'
import {readdir,writeFile} from 'node:fs/promises'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {archiveKane} from './kane-archive.mjs'

const folder=path.join(ROOT,'proof/recheck')
const initial=await readJSON(path.join(folder,'results.json'))
const cohort=await readJSON(path.join(folder,'cohort.json'))
const files=await readdir(folder)
const newer=await Promise.all(files.filter(file=>file.endsWith('-new-publication.json')).sort().map(file=>readJSON(path.join(folder,file))))
const unitFollowup=files.includes('unitconverters-followup.json')?await readJSON(path.join(folder,'unitconverters-followup.json')):null
const rows=[...initial.map(row=>row.id===unitFollowup?.task.id && unitFollowup.result.status==='verified'?
  {...row,outcome:'re-patched',status:'verified',patch:unitFollowup.result.patch}:row),...newer]
const ledger=await archiveKane()
const counts={}
const results=rows.map(row=>{
  counts[row.outcome]=(counts[row.outcome]??0)+1
  const {record}=row
  const ids=[record?.runId,record?.after,...row.patch?.evidence.kaneRunIds??[]].filter(Boolean)
  const start=record?.video?.split('/')[3]??cohort.startedAt.replaceAll(':','-')
  const sessions=ledger.filter(run=>ids.includes(run.sessionId) ||
    (run.taskId===row.id && run.result.split('/')[3]>=start && /^\d{4}-/.test(run.result.split('/')[3]) &&
      (run.phase.startsWith('recheck-') || ['re-patched','broken'].includes(row.outcome))))
  return {id:row.id,outcome:row.outcome,record,sessions,...(row.error?{error:row.error}:{})}
})
await saveJSON(path.join(folder,'summary.json'),{at:instant(),startedAt:cohort.startedAt,tested:results.length,initial:initial.length,newPublications:newer.length,counts,results})
const label=outcome=>outcome.replaceAll('-',' ')
const cell=value=>String(value??'').replaceAll('|','\\|').replace(/\s+/g,' ').trim()
const table=results.map(row=>{
  const sessions=row.sessions.map(run=>`[${run.phase} ${run.status} · ${run.sessionId}](../../${run.result})`).join('<br>')
  return `| ${row.id} | ${label(row.outcome)} | ${sessions||'—'} | ${row.record?.replacedBaseline?'Replaced zero-Tab baseline '+row.record.replacedBaseline:cell(row.error)||'—'} |`
})
await writeFile(path.join(folder,'README.md'),[
  '# Public patch recheck','',`Kane checked ${initial.length} active public tasks using \`curbcut recheck --public\`.`,
  ...(newer.length?[`${newer.length} newly published repairs received the same recheck once they entered the feed.`]:[]),
  Object.entries(counts).map(([name,count])=>count+' '+label(name)).join(' · '),'',
  'A passing unpatched replay retires a repair. A failing unpatched replay and a passing repaired replay keep it verified. A failed repaired replay triggers a new proposal loop. Inconclusive evidence preserves the last verified state.','',
  '| Patch | Outcome | Kane sessions | Baseline evidence or error |','| --- | --- | --- | --- |',...table,
  ...(unitFollowup?['','[UnitConverters repair follow-up](unitconverters-followup.json)']:[]),
  ...(files.includes('geeksforgeeks-baseline-followup.json')?['','[Separate GeeksforGeeks baseline follow-up](geeksforgeeks-baseline-followup.json)']:[]),''
].join('\n'))
