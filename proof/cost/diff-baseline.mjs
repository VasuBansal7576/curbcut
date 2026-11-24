import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {readJSON,saveJSON} from '../../core/io.mjs'
import {proposalInstructions,ProposalRejected,propose} from '../../core/agent.mjs'
import {tokens} from '../../core/cost.mjs'
import {archivedV5} from './archive-v5.mjs'

const file='proof/cost/diff-results.json'
const result=await readJSON(file)
if(!result.completedAt) throw new Error('Wait for the diff run to complete.')
const schema=await readJSON('schemas/patch.json')
const bundled=new Map((await readJSON('extension/bundled.json')).map(patch=>[patch.id,patch]))
const taskFields=({site,match,barrier,rules,status,evidence,history,...task})=>task
const v5=new Map((await readJSON('proof/heldout-v5/local-summary.json')).results.map(row=>[row.task.id,row.task]))
for(const row of result.rows) {
  if(row.agentExit?.code===0 && !row.diffRules && row.reply) {
    const base=await mkdtemp(path.join(tmpdir(),'curbcut-diff-diagnostic-'))
    try {
      const nearMiss={patch:{rules:row.rules},reason:row.reason}
      await propose(taskFields(bundled.get(row.id)),{runner:'playwright',reason:row.reason,nearMiss},row.rules,base,{
        retryInvalid:false,
        run:async(_,args)=>{
          if(args.includes('-o')) throw new Error('Run diagnostics with CURBCUT_AGENT=grok.')
          return {code:0,stdout:row.reply,stderr:''}
        },
        validateSelectors:async()=>({ok:true,matches:[]})
      })
      row.offlineValidation='Passed schema and repeat checks. No live selector result was retained.'
    } catch(error) {
      if(!(error instanceof ProposalRejected)) throw error
      row.offlineValidation=error.message.split(':')[0]
      row.error=row.offlineValidation
    } finally {await rm(base,{recursive:true,force:true})}
  }
  if(v5.has(row.id)) {
    const {baselineTokens,attempts}=await archivedV5(v5.get(row.id),schema)
    row.archive={cohort:'v5',fullAgentTokensEstimate:baselineTokens,attempts:attempts.filter(attempt=>attempt.reply).length}
    continue
  }
  const v2=row.id==='sanantonio-library-reader'
  const dir=v2?'proof/kane/sanantonio-library-reader/heldout-v2':'proof/heldout-v3/runs/'+row.id
  const [candidate,failure,reply]=await Promise.all([
    readJSON(dir+'/attempt-1/candidate.json'),readJSON(dir+'/before/result.json'),readFile(dir+'/attempt-1/agent-answer.txt','utf8')
  ])
  const prompt=proposalInstructions(taskFields(candidate),{...failure,previousAttempts:[]},null,schema,{compact:false})
  row.archive={cohort:v2?'v2':'v3',fullAgentTokensEstimate:tokens(prompt)+tokens(reply),attempts:1}
}
await saveJSON(file,result)
