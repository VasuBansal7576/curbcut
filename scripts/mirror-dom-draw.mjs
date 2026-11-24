import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {siteKey,acceptableURL,forbiddenJourneyAction} from '../core/task.mjs'

const read = file => JSON.parse(readFileSync(file))
const seed = 'curbcut-mirror-dom-v1'
const rank = value => createHash('sha256').update(seed+'\n'+value).digest('hex')
const bundled = new Set(read('extension/bundled.json').flatMap(row => [row.site,row.url,row.match].flatMap(value => {
  try { return [siteKey(new URL(value.includes('://') ? value : 'https://'+value).hostname)] }
  catch { return [] }
})))
const pool = new Map()
const sources = ['proof/hard-v4/scouting.json','proof/heldout-v5/scouting.json']
for (const source of sources) {
  for (const row of read(source).rows) {
    for (const {task,result} of row.checks ?? []) {
      if (task?.barrierClass !== 1 || result?.control?.status !== 'pass' ||
          result?.persona?.status !== 'fail' || !task.observedSelector ||
          forbiddenJourneyAction(task.task+' '+task.controlTask)) continue
      const url = new URL(task.url)
      const site = siteKey(url.hostname)
      if (!acceptableURL(url) || bundled.has(site)) continue
      const entry = {site,source,task}
      if (!pool.has(site) || rank(task.id) < rank(pool.get(site).task.id)) pool.set(site,entry)
    }
  }
}
const entries = [...pool.values()].sort((a,b) => rank(a.site).localeCompare(rank(b.site))).slice(0,30)
writeFileSync('proof/mirror-dom/draw.json',JSON.stringify({seed,eligible:pool.size,requested:30,entries},null,2)+'\n')
console.log(entries.length)
