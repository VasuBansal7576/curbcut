import {botPreflight} from './jev-preflight.mjs'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,instant,readJSON} from './io.mjs'
import {confirmBarrier} from './probe.mjs'
import {estimateKanePlan,runKane} from './kane.mjs'
import {compactDOM,deriveTask} from './check.mjs'
import {recommendRepair,wcagCriteria} from '../extension/lib/report.js'

function taskText(item) {
  if(typeof item==='string') return item
  if(item && typeof item.task==='string') return item.task
  throw new Error('Each gate task must be a string or an object with a task string.')
}

function gateStatus(status) {
  if(status==='pass' || status==='no barrier') return 'pass'
  if(status==='fail' || status==='confirmed') return 'fail'
  if(status==='inconclusive' || status==='blocked') return 'inconclusive'
  return 'error'
}

function statusLabel(status) {
  return {pass:'PASS',fail:'FAIL',inconclusive:'INCONCLUSIVE',blocked:'INCONCLUSIVE',error:'ERROR'}[status]??'FAIL'
}

function formatFinding(row) {
  const head=statusLabel(row.status)+'  '+row.persona+'  '+row.task
  if(row.status==='pass') return head
  const nodes=(row.dom??[]).map(node=>'  '+[node.selector,node.tag,node.role,node.name,node.tabIndex==null?null:'tabIndex='+node.tabIndex]
    .filter(value=>value!==undefined && value!==null && value!=='').join(' · '))
  return [head,'reason: '+row.reason,row.control?'control: '+row.control:null,nodes.length?'dom:':null,...nodes].filter(Boolean).join('\n')
}

function annotate(row) {
  const repair=row.status==='fail'?recommendRepair(row):{wcag:wcagCriteria({persona:row.persona}),source:[],rules:[]}
  return {...row,wcag:repair.wcag,source:repair.source,rules:repair.rules}
}

export function serializeGate(result) {
  if(result.dryRun) return {ok:result.ok,dryRun:true,url:result.url,plans:result.plans,exitCode:result.exitCode}
  return {ok:result.ok,url:result.url,dir:result.dir??null,findings:result.findings,exitCode:result.exitCode}
}

export async function loadGateConfig(file) {
  const spec=await readJSON(file)
  if(!spec?.url || !Array.isArray(spec.tasks) || !spec.tasks.length) throw new Error('Gate config needs a url and a non-empty tasks array.')
  const personas=spec.personas??['keyboard-only','screen-reader-view']
  if(!personas.length || personas.some(persona=>!['keyboard-only','screen-reader-view','low-vision'].includes(persona))) {
    throw new Error('Gate personas must be keyboard-only, screen-reader-view, or low-vision.')
  }
  return {url:spec.url,tasks:spec.tasks.map(taskText),personas}
}

export async function runGate({config,local=false,dryRun=false,url}={}) {
  const file=config||path.join(process.cwd(),'curbcut.gate.json')
  const spec=await loadGateConfig(file)
  if(url) spec.url=url
  const rows=spec.tasks.flatMap(task=>spec.personas.map(persona=>({url:spec.url,task,persona})))
  if(dryRun) {
    const plans=[]
    for(const row of rows) {
      const task=await deriveTask(row)
      const plan=estimateKanePlan(task,{attempts:0,repair:false})
      plans.push({...row,id:task.id,observedSelector:task.observedSelector,probe:task.probe,kane:local?{runs:0,estimatedCredits:0}:plan})
    }
    const credits=plans.reduce((sum,row)=>sum+(row.kane.estimatedCredits??0),0)
    const text=['gate dry-run','url: '+spec.url,'cases: '+plans.length,
      local?'0 Kane credits. Local oracle only.':'Kane runs: '+plans.length+' (one per persona and task). Max steps / estimated credits: '+credits+'.',
      ...plans.map(row=>'  '+row.persona+'  '+row.id+'  '+row.task)].join('\n')+'\n'
    return {ok:true,dryRun:true,url:spec.url,plans,exitCode:0,text}
  }
  const findings=[]
  const dir=path.join(ROOT,'.curbcut','gate',instant().replaceAll(':','-'))
  if(!local) await mkdir(dir,{recursive:true})
  for(const row of rows) {
    try {
      const task=await deriveTask(row)
      const meta={...row,id:task.id,observedSelector:task.observedSelector,requiredName:task.requiredName??null}
      if(!local) {
        const directory=path.join(dir,task.id+'-'+row.persona)
        const measured=await botPreflight(task,directory)??await runKane(task,row.persona,null,directory)
        findings.push(annotate({...meta,status:gateStatus(measured.status),reason:measured.reason??measured.integrity??measured.status,
          control:null,dom:compactDOM(measured.snapshot,task.observedSelector),recording:measured.video??null,runner:measured.runner??'kane'}))
        continue
      }
      const measured=await confirmBarrier(task)
      if(measured.status==='no barrier') {
        findings.push(annotate({...meta,status:'pass',reason:measured.persona?.reason,control:measured.control?.status,dom:null,recording:null,runner:'playwright'}))
        continue
      }
      const reason=measured.persona?.reason??measured.reason??(measured.control?measured.control.status+': '+measured.control.reason:measured.status)
      findings.push(annotate({
        ...meta,
        status:gateStatus(measured.status),
        reason,
        control:measured.control?.status,
        dom:compactDOM(measured.persona?.snapshot??measured.control?.snapshot,task.observedSelector),
        recording:null,runner:'playwright'
      }))
    } catch(error) {
      findings.push(annotate({...row,status:'error',reason:error.message.split('\n')[0],dom:null,recording:null,runner:local?'playwright':'kane'}))
    }
  }
  const failed=findings.filter(row=>row.status!=='pass')
  const text=['gate '+(failed.length?'failed':'passed')+'  '+findings.length+' cases, '+failed.length+' failed',
    ...findings.map(formatFinding)].join('\n\n')+'\n'
  return {ok:!failed.length,url:spec.url,dir:local?null:dir,findings,exitCode:failed.length?1:0,text}
}
