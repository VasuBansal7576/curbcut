import path from 'node:path'
import {readdir,readFile} from 'node:fs/promises'
import {ROOT,readJSON,saveJSON} from '../core/io.mjs'
import {parseRun} from '../core/kane.mjs'

export async function archiveKane() {
  const roots=['proof/kane','proof/heldout-v3/runs','proof/hard-v4/kane','proof/hard-v4/kane-objective-pilot',
    'proof/heldout-v5/kane','proof/heldout-v5/kane-rerun-50','proof/heldout-v5/kane-sample-20','proof/heldout-v6/kane','proof/heldout-v6/calibration']
  const entries=(await Promise.all(roots.map(async root=>{
    const files=await readdir(path.join(ROOT,root),{recursive:true}).catch(error=>{
      if(error.code==='ENOENT') return []
      throw error
    })
    return files.filter(file=>file.endsWith('/result.json')).sort().map(file=>({root,file}))
  }))).flat()
  const runs=await Promise.all(entries.map(async({root,file})=>{
    const resultFile=path.join(root,file)
    const directory=path.dirname(resultFile)
    const result=await readJSON(path.join(ROOT,resultFile))
    if(result.runner!=='kane') return null
    const stdout=await readFile(path.join(ROOT,directory,'events.ndjson'),'utf8')
    const parsed=parseRun({stdout,code:result.exitCode})
    const agrees=parsed.runId===result.runId && parsed.status===(result.kaneStatus??result.status) && result.evidenceValid===true &&
      (parsed.status===result.status || result.browserVerdict?.status===result.status)
    const status=agrees?result.status:'inconclusive'
    return {
      taskId:file.split(path.sep)[0], phase:path.basename(directory).replace(/^(before|control|after)-[12]$/,'$1'), sessionId:result.runId??null, status,
      ...(status!==result.status?{recordedStatus:result.status}:{}),
      reason:result.integrity??result.reason??null, credits:result.credits??null,
      result:resultFile, recording:result.video??null, evidencePack:result.evidencePack??null
    }
  }))
  const ledger=runs.filter(Boolean)
  await saveJSON(path.join(ROOT,'proof/kane/ledger.json'),ledger)
  return ledger
}
