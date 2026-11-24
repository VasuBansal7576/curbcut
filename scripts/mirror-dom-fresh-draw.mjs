import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync} from 'node:fs'
import {siteKey,acceptableURL} from '../core/task.mjs'

const seed = 'curbcut-mirror-dom-fresh-v1'
const read = file => JSON.parse(readFileSync(file))
const ref = execFileSync('git',['rev-parse','astra/ambitious'],{encoding:'utf8'}).trim()
const finder = path => JSON.parse(execFileSync('git',['show',ref+':'+path],{encoding:'utf8'}))
const order = site => createHash('sha256').update(seed+'\n'+site).digest('hex')
const prior = 'proof/heldout-finder/sample.json'
const release = 'proof/heldout-finder-release/sample.json'
const fallback = 'proof/heldout-v5/sample.json'
const sources = [[prior,finder(prior).sites],[release,finder(release).sites],
  [fallback,read(fallback).sites.map(row => row.site)]]
const excluded = new Set(read('extension/bundled.json').map(row => siteKey(new URL(row.url).hostname)))
const candidates = []
for (const [source,sites] of sources) {
  for (const site of [...sites].sort((a,b) => order(a).localeCompare(order(b)))) {
    const url = new URL('https://'+site+'/')
    const domain = siteKey(url.hostname)
    if (excluded.has(domain) || !acceptableURL(url)) continue
    candidates.push({site,source,url:url.href})
    excluded.add(domain)
  }
}
writeFileSync('proof/mirror-dom/fresh-draw.json',JSON.stringify({
  seed, finderCommit:ref, target:30, limit:200, candidates:candidates.slice(0,200),
  protocol:{
    selection:'First eligible trigger per site. Require actual Tab access to the trigger, pointer hover reveals at least one link, and ArrowDown plus bounded Tab misses at least one pointer link.',
    replay:'New profile. Record extension result and elapsed time. Check patched keyboard and pointer sets with independent Playwright replay and local journey oracle.',
    kane:{seed:seed+'-kane', sample:5, maxCredits:200, balanceFloor:1300, inconclusiveRetries:1},
  },
},null,2)+'\n')
