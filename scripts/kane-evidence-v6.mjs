import path from 'node:path'
import {runKane} from '../core/kane.mjs'
import {saveJSON} from '../core/io.mjs'

export function nameObjective(task) {
  const {name,role}=task.evaluation
  return {
    ...task,
    task:'Check Reading view for the '+role+' named “'+name+'”. If found, click that exact named row and report that you found it. If absent, report “target absent” and finish the check. Do not guess from unnamed rows.'
  }
}

export function recordedAbsence(task,result) {
  const target=result.snapshot?.nodes.find(node=>node.selector===task.observedSelector)
  const evidence=JSON.stringify([result.summary,result.steps]).toLowerCase()
  return result.kaneStatus==='pass' && result.status==='inconclusive' && result.evidenceValid && result.video &&
    result.integrity==='The recording does not show the requested target being identified.' &&
    result.inspection?.harness?.persona==='screen-reader-view' && result.inspection.readerVisible &&
    target?.role===task.evaluation.role && !target.name && target.width>0 && target.display!=='none' &&
    evidence.includes('target absent')
}

export async function runCoverageEvidence(task,persona,patch,directory,options) {
  const disclosure=task.evaluation?.role
  const objective=disclosure?nameObjective(task):task
  const result=await runKane(objective,persona,patch,directory,options)
  if(disclosure && persona==='screen-reader-view' && !patch && recordedAbsence(task,result)) {
    delete result.integrity
    result.status='fail'
    result.browserVerdict={status:'fail',basis:'Kane reports the exact row absent and the recorded visible target is unnamed.'}
    await saveJSON(path.join(directory,'result.json'),result)
  }
  return result
}
