import {createHash} from 'node:crypto'
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {requireKane,runKane} from '../core/kane.mjs'
import {normalizeTask} from '../core/task.mjs'

const draw = JSON.parse(await readFile('proof/mirror-dom/fresh-draw.json'))
const trial = JSON.parse(await readFile('proof/mirror-dom/fresh-results.json'))
const protocol = draw.protocol.kane
const rank = site => createHash('sha256').update(protocol.seed+'\n'+site).digest('hex')
const eligible = trial.rows.filter(row => row.scout.eligible).length
if (eligible !== draw.target && trial.rows.length !== draw.limit) throw Error('Trial is still running')
const selected = trial.rows.filter(row => row.trial?.status === 'match')
  .sort((a,b) => rank(a.site).localeCompare(rank(b.site))).slice(0,protocol.sample)
const balance = async () => {
  const value = Number((await requireKane()).match(/Available credits:\s*([\d,.]+)/)?.[1].replaceAll(',',''))
  if (!Number.isFinite(value)) throw Error('Kane balance unavailable')
  return value
}
const result = {seed:protocol.seed,selected:selected.map(row => row.site),verified:0,creditsSpent:0,cases:[]}
const output = 'proof/mirror-dom/kane-results.json'
const save = () => writeFile(output,JSON.stringify(result,null,2)+'\n')
if (!selected.length) {
  await save()
  process.exit(0)
}

const reserve = 100
const start = await balance()
const floor = Math.max(protocol.balanceFloor,start-protocol.maxCredits)
result.initialBalance = result.finalBalance = start
result.minimumToStart = floor+reserve
await save()
process.env.CURBCUT_KANE_MIN_CREDITS = String(result.minimumToStart)
const directory = await mkdtemp(path.join(tmpdir(),'mirror-dom-kane-'))
try {
  sample: for (const row of selected) {
    const {patch} = row.trial.detected
    const task = await normalizeTask(patch)
    const entry = {site:row.site,runs:[],verified:false}
    result.cases.push(entry)
    for (const [phase,persona,repair,expected] of [
      ['before','keyboard-only',null,'fail'],
      ['control','control',null,'pass'],
      ['after','keyboard-only',patch,'pass'],
    ]) {
      for (let attempt=1;attempt<=protocol.inconclusiveRetries+1;attempt++) {
        const before = await balance()
        if (before < result.minimumToStart) {
          result.stopped = 'Per-lane reserve would breach the credit cap or balance floor.'
          break sample
        }
        const folder = path.join(directory,row.site,phase+'-'+attempt)
        const run = {phase,attempt,expected,before}
        entry.runs.push(run)
        await save()
        const observed = await runKane(task,persona,repair,folder,{maxSteps:8,timeout:50}).catch(async error => {
          return readFile(path.join(folder,'result.json'),'utf8').then(JSON.parse,() => ({
            status:'inconclusive',reason:error.message.split('\n')[0],
          }))
        })
        const decisive = observed.runner === 'kane' && observed.evidenceValid && observed.runId &&
          ['pass','fail'].includes(observed.status)
        run.status = decisive ? observed.status : 'inconclusive'
        run.reason = observed.reason
        run.runId = observed.runId
        run.evidenceValid = observed.evidenceValid
        run.reportedCredits = observed.credits
        run.after = await balance()
        result.finalBalance = run.after
        result.creditsSpent = Number((start-run.after).toFixed(4))
        console.log(row.site,phase,attempt,run.status,run.reportedCredits ?? '')
        await save()
        if (run.status !== 'inconclusive') break
      }
    }
    entry.verified = ['before','control','after'].every(phase => entry.runs.some(run => run.phase===phase && run.expected===run.status))
    if (entry.verified) result.verified++
    await save()
  }
} finally {
  await save()
  await rm(directory,{recursive:true,force:true})
}
