import {readFile,writeFile} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
import {trial} from './mirror-dom-fresh.mjs'

const mode = process.argv[2]
if (!['baseline','recipes'].includes(mode)) throw Error('Use baseline or recipes')
const {rows} = JSON.parse(await readFile('proof/mirror-dom/fresh-results.json'))
const cases = rows.filter(row => row.scout.eligible && (mode==='recipes' || row.trial.status==='no-match'))
const results = []
const file = 'proof/mirror-dom/development-'+mode+'.json'
for (let index=0;index<cases.length;index+=3) {
  const batch = await Promise.all(cases.slice(index,index+3).map(async (row,slot) => {
    await delay(slot*650)
    let replay
    for (let attempt=1;attempt<=2;attempt++) {
      try { replay=await trial(row.scout,{diagnose:true,verify:mode==='recipes'});break }
      catch (error) { replay={status:'unavailable',reason:error.message.slice(0,400),attempt} }
    }
    return {site:row.site,heldOut:row.trial.status,replay}
  }))
  results.push(...batch)
  await writeFile(file,JSON.stringify({mode,heldOutCommit:'25e19c4',results},null,2)+'\n')
  for (const result of batch) console.log(mode,result.site,result.replay.status,result.replay.diagnostics?.stage)
  await delay(650)
}
