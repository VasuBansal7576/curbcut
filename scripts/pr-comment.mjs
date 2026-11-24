import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

export const MARKER='<!-- curbcut-gate -->'

function nodeLine(node) {
  return [node.selector,node.tag,node.role,node.name,node.tabIndex==null?null:'tabIndex='+node.tabIndex]
    .filter(value=>value!==undefined && value!==null && value!=='').join(' · ')
}

function statusLabel(status) {
  return {pass:'PASS',fail:'FAIL',inconclusive:'INCONCLUSIVE',blocked:'INCONCLUSIVE',error:'ERROR'}[status]??'FAIL'
}

function summary(findings) {
  const total=findings.length
  const passed=findings.filter(row=>row.status==='pass').length
  const failed=findings.filter(row=>row.status==='fail').length
  const inconclusive=findings.filter(row=>row.status==='inconclusive' || row.status==='blocked').length
  const errors=findings.filter(row=>row.status==='error').length
  if(!failed && !inconclusive && !errors) return 'Passed. '+passed+' of '+total+' cases passed.'
  if(passed && (failed || inconclusive || errors)) {
    return 'Mixed. '+passed+' passed, '+failed+' failed, '+inconclusive+' inconclusive.'
  }
  if(inconclusive && !failed && !errors) return 'Inconclusive. '+inconclusive+' of '+total+' cases were inconclusive.'
  if(errors && !failed) return 'Error. '+errors+' of '+total+' cases could not run.'
  return 'Failed. '+failed+' of '+total+' cases failed.'
}

function wcagLine(row) {
  const entries=row.wcag??[]
  if(!entries.length) return null
  return 'WCAG: '+entries.map(entry=>entry.id+' '+entry.name).join(', ')
}

function recordingLine(row,artifactUrl) {
  if(row.recording) {
    const name=row.recording.split(/[/\\]/).filter(Boolean).slice(-2).join('/')
    if(artifactUrl) return 'Kane recording: ['+name+']('+artifactUrl+')'
    return 'Kane recording: '+name
  }
  if(row.runner==='playwright' || !row.recording && row.runner!=='kane') return 'Local oracle. No Kane recording.'
  if(artifactUrl) return 'Kane recordings: [workflow artifacts]('+artifactUrl+')'
  return null
}

function formatCase(row,artifactUrl) {
  const lines=['## '+statusLabel(row.status)+' · '+row.persona+' · '+row.task]
  if(row.status==='pass') return lines.join('\n')
  if(row.reason) lines.push('','Reason: '+row.reason)
  const nodes=(row.dom??[]).map(nodeLine).filter(Boolean)
  if(nodes.length) lines.push('','DOM','```',nodes.join('\n'),'```')
  const wcag=wcagLine(row)
  if(wcag) lines.push('',wcag)
  if(row.status==='fail' && row.source?.length) lines.push('','Source change','',...row.source)
  const recording=recordingLine(row,artifactUrl)
  if(recording) lines.push('',recording)
  return lines.join('\n')
}

export function renderComment(result,options={}) {
  const findings=result.findings??[]
  if(!findings.length && !result.dryRun) throw new Error('Gate JSON needs a findings array.')
  if(result.dryRun) {
    return [MARKER,'# Curb Cut gate','', 'Dry-run only. No Kane run.','','Preview: '+(options.previewUrl||result.url||'')].join('\n')+'\n'
  }
  const preview=options.previewUrl||result.url
  const artifactUrl=options.artifactUrl||options.runUrl||null
  const lines=[MARKER,'# Curb Cut gate','',summary(findings)]
  if(preview) lines.push('','Preview: '+preview)
  if(artifactUrl) lines.push('','Kane recordings are uploaded as workflow artifacts on [this run]('+artifactUrl+').')
  for(const row of findings) lines.push('',formatCase(row,artifactUrl))
  lines.push('','Change the source for each FAIL. Do not write a Curb Cut patch.')
  return lines.join('\n')+'\n'
}

function parseArgs(argv) {
  const flags={}
  const rest=[]
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i]
    if(arg==='--artifact-url' || arg==='--run-url' || arg==='--preview-url') flags[arg.slice(2)]=argv[++i]
    else if(arg.startsWith('--artifact-url=')) flags['artifact-url']=arg.slice(15)
    else if(arg.startsWith('--run-url=')) flags['run-url']=arg.slice(10)
    else if(arg.startsWith('--preview-url=')) flags['preview-url']=arg.slice(14)
    else rest.push(arg)
  }
  return {flags,file:rest[0]}
}

async function readStdin() {
  const chunks=[]
  for await(const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const isCli=process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1])

if(isCli) {
  const {flags,file}=parseArgs(process.argv.slice(2))
  const raw=file?await readFile(file,'utf8'):await readStdin()
  const result=JSON.parse(raw)
  process.stdout.write(renderComment(result,{artifactUrl:flags['artifact-url'],runUrl:flags['run-url'],previewUrl:flags['preview-url']}))
}
