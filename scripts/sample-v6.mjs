import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,instant,readJSON,saveJSON} from '../core/io.mjs'
import {siteKey} from '../core/task.mjs'
import {git,hostExclusion,sha256} from './scout-v4.mjs'
import {historicalDomains,safetyScreen} from './scout-v5.mjs'

const [csv,safetyDirectory]=process.argv.slice(2)
assert(csv && safetyDirectory,'Usage: sample-v6.mjs <tranco.csv> <safety-list-directory>')
const out=path.join(ROOT,'proof/heldout-v6/sample.json')
await readFile(out).then(()=>{throw new Error('Sample already exists.')},error=>{if(error.code!=='ENOENT') throw error})
const pinned=await readJSON(path.join(ROOT,'proof/hard-v4/sample.json'))
const bytes=await readFile(csv)
assert.equal(sha256(bytes),pinned.csvSha256)
const priorSources=await Promise.all(['HEAD',pinned.priorCommit].map(ref=>git(['rev-parse',ref+'^{commit}'])))
const prior=await historicalDomains(priorSources)
const candidates=new Map()
const seed='curbcut-v6-webaim-six-2026-11-24'
const minimum=1000,maximum=50000,count=400
const ranks=new Set()
let excludedPrior=0,excludedHost=0
for(const line of bytes.toString().split(/\r?\n/)) {
  const [rawRank,domain]=line.split(',')
  const rank=Number(rawRank)
  if(!Number.isInteger(rank) || rank<minimum || rank>maximum) continue
  ranks.add(rank)
  if(!/^[a-z\d-]+(?:\.[a-z\d-]+)+$/.test(domain) || hostExclusion.test(domain)) {excludedHost++;continue}
  const site=siteKey(new URL('https://'+domain))
  if(prior.has(site)) {excludedPrior++;continue}
  if(site!==domain || candidates.has(site)) {excludedHost++;continue}
  candidates.set(site,{rank,site,url:'https://'+site+'/',order:sha256(seed+'\n'+site)})
}
assert.equal(ranks.size,maximum-minimum+1)
const safety=await safetyScreen(safetyDirectory,candidates)
for(const {site} of safety.excluded) candidates.delete(site)
assert(candidates.size>=count)
const sites=[...candidates.values()].sort((a,b)=>a.order.localeCompare(b.order)).slice(0,count)
await saveJSON(out,{version:6,source:pinned.source,listId:pinned.listId,csvSha256:pinned.csvSha256,registeredAt:instant(),
  seed,rankRange:[minimum,maximum],priorSources,priorSiteDigest:sha256([...prior].sort().join('\n')),excludedPrior,excludedHost,
  safetySources:safety.sources,excludedSafety:safety.excluded.length,count,concurrency:2,pauseMillis:900,
  selection:'Sort eligible registrable domains by SHA-256 of the seed, a newline, and the domain. Select the first 400 without replacement.',
  registration:'Up to three unique categories per site. Prioritize one discovered name, one contrast sample and missing page language, then other names. Preflight every registered task before repair.',sites})
console.log('Registered',sites.length,'domains from',pinned.listId,'with',excludedPrior,'prior sites excluded.')
