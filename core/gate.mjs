import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,instant,readJSON} from './io.mjs'
import {confirmBarrier} from './probe.mjs'
import {estimateKanePlan,runKane} from './kane.mjs'
import {compactDOM,deriveTask} from './check.mjs'

function taskText(item) {
  if(typeof item==='string') return item
  if(item && typeof item.task==='string') return item.task
  throw new Error('Each gate task must be a string or an object with a task string.')
}

function formatFinding(row) {
  const head=(row.status==='pass'?'PASS':'FAIL')+'  '+row.persona+'  '+row.task
  if(row.status==='pass') return head
  const nodes=(row.dom??[]).map(node=>'  '+[node.selector,node.tag,node.role,node.name,node.tabIndex==null?null:'tabIndex='+node.tabIndex]
    .filter(value=>value!==undefined && value!==null && value!=='').join(' · '))
  return [head,'reason: '+row.reason,row.control?'control: '+row.control:null,nodes.length?'dom:':null,...nodes].filter(Boolean).join('\n')
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

export async function runGate({config,local=false,dryRun=false}={}) {
  const file=config||path.join(process.cwd(),'curbcut.gate.json')
  const spec=await loadGateConfig(file)
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
    return {ok:true,dryRun:true,plans,exitCode:0,text}
  }
  const findings=[]
  const dir=path.join(ROOT,'.curbcut','gate',instant().replaceAll(':','-'))
  if(!local) await mkdir(dir,{recursive:true})
  for(const row of rows) {
    try {
      const task=await deriveTask(row)
      if(!local) {
        const measured=await runKane(task,row.persona,null,path.join(dir,task.id+'-'+row.persona))
        findings.push({...row,id:task.id,status:measured.status==='pass'?'pass':'fail',reason:measured.reason??measured.integrity??measured.status,
          control:null,dom:compactDOM(measured.snapshot,task.observedSelector)})
        continue
      }
      const measured=await confirmBarrier(task)
      if(measured.status==='no barrier') {
        findings.push({...row,id:task.id,status:'pass',reason:measured.persona?.reason,control:measured.control?.status,dom:null})
        continue
      }
      const reason=measured.persona?.reason??measured.reason??(measured.control?measured.control.status+': '+measured.control.reason:measured.status)
      findings.push({
        ...row,id:task.id,
        status:measured.status==='confirmed'?'fail':measured.status,
        reason,
        control:measured.control?.status,
        dom:compactDOM(measured.persona?.snapshot??measured.control?.snapshot,task.observedSelector)
      })
    } catch(error) {
      findings.push({...row,status:'error',reason:error.message.split('\n')[0],dom:null})
    }
  }
  const failed=findings.filter(row=>row.status!=='pass')
  const text=['gate '+(failed.length?'failed':'passed')+'  '+findings.length+' cases, '+failed.length+' failed',
    ...findings.map(formatFinding)].join('\n\n')+'\n'
  return {ok:!failed.length,findings,exitCode:failed.length?1:0,text}
}
