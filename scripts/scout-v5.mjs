import {spawn} from 'node:child_process'
import {appendFile,mkdir,readFile} from 'node:fs/promises'
import {createInterface} from 'node:readline'
import {setTimeout as delay} from 'node:timers/promises'
import path from 'node:path'
import {ROOT,instant,readJSON} from '../core/io.mjs'
import {siteKey} from '../core/task.mjs'
import {withLock} from '../core/loop.mjs'
import {preflight} from '../core/preflight.mjs'
import {git,hostExclusion,scoutSite,sha256} from './scout-v4.mjs'
import {concurrency,count,firstInput,frozen,maximumRank,minimumRank,optional,read,same,sampleSeed,save} from './cohort-v5.mjs'

const normalDomain=/^[a-z\d-]+(?:\.[a-z\d-]+)+$/
const legacy='proof/hard-v4'

async function historicalDomains(refs) {
  const sites=new Set()
  const pattern='https?://[A-Za-z0-9._-]+|"(site|domain|host|hostname)": *"[A-Za-z0-9._-]+"'
  for(const ref of refs) {
    const child=spawn('git',['grep','-I','-h','-o','-E',pattern,ref,'--','tasks','patches','proof','README.md','SPEC.md'],
      {cwd:ROOT,stdio:['ignore','pipe','inherit']})
    const exit=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)})
    for await(const line of createInterface({input:child.stdout})) {
      const domain=line.startsWith('"')?'https://'+line.split('"')[3]:line
      try {sites.add(siteKey(new URL(domain)))} catch {}
    }
    if(await exit!==0) throw new Error('Could not recover prior site exclusions from '+ref+'.')
  }
  return sites
}

async function safetyScreen(directory,allowed) {
  const pinned=await readJSON(path.join(ROOT,legacy,'safety-exclusions.json'))
  const blocked=new Map()
  for(const source of pinned.sources) {
    const bytes=await readFile(path.join(directory,source.category+'.txt'))
    if(sha256(bytes)!==source.sha256) throw new Error('Safety list digest mismatch for '+source.category+'.')
    for(const line of bytes.toString().split(/\r?\n/)) {
      if(!line || line.startsWith('#')) continue
      const host=line.trim().split(/\s+/).at(-1)
      if(!normalDomain.test(host)) continue
      const site=siteKey(new URL('https://'+host))
      if(!allowed.has(site)) continue
      if(!blocked.has(site)) blocked.set(site,new Set())
      blocked.get(site).add(source.category)
    }
  }
  return {source:pinned.source,ref:pinned.ref,sources:pinned.sources,excluded:[...blocked].sort(([left],[right])=>left.localeCompare(right))
    .map(([site,categories])=>({site,categories:[...categories]}))}
}

async function sample(csv,safetyDirectory) {
  if(await optional('sample.json')) throw new Error('The held-out sample has already been selected.')
  const [freeze,freezeSource,older,bytes]=await Promise.all([
    frozen(),firstInput('freeze-integrity.json'),readJSON(path.join(ROOT,legacy,'sample.json')),readFile(csv)
  ])
  const csvSha256=sha256(bytes)
  if(csvSha256!==older.csvSha256) throw new Error('The Tranco CSV does not match the pinned immutable list.')
  const priorSources=[freeze.frozenCommit,await git(['rev-parse',older.priorCommit+'^{commit}'])]
  const prior=await historicalDomains(priorSources)
  const candidates=new Map()
  const ranks=new Set()
  let excludedPrior=0,excludedHost=0
  for(const line of bytes.toString().split(/\r?\n/)) {
    const [rawRank,domain]=line.split(',')
    const rank=Number(rawRank)
    if(!Number.isInteger(rank) || rank<minimumRank || rank>maximumRank) continue
    ranks.add(rank)
    if(!normalDomain.test(domain) || hostExclusion.test(domain)) {excludedHost++;continue}
    const site=siteKey(new URL('https://'+domain))
    if(prior.has(site)) {excludedPrior++;continue}
    if(site!==domain || candidates.has(site)) {excludedHost++;continue}
    candidates.set(site,{rank,site,url:'https://'+site+'/'})
  }
  if(ranks.size!==maximumRank-minimumRank+1) throw new Error('The CSV does not cover every requested rank.')
  const safety=await safetyScreen(safetyDirectory,candidates)
  for(const {site} of safety.excluded) candidates.delete(site)
  if(candidates.size<count) throw new Error('There are too few eligible registrable domains.')
  const order=site=>sha256(sampleSeed+'\n'+site)
  const sites=[...candidates.values()].sort((a,b)=>order(a.site).localeCompare(order(b.site))).slice(0,count)
  await save('prior-sites.json',{sources:priorSources,sites:[...prior].sort()})
  await save('safety-exclusions.json',safety)
  await save('sample.json',{version:5,registeredAt:instant(),source:older.source,listId:older.listId,csvSha256,seed:sampleSeed,
    rankRange:[minimumRank,maximumRank],freeze:freezeSource,excludedPrior,excludedHost,excludedSafety:safety.excluded.length,concurrency,
    sampling:'Sort eligible registrable domains by SHA-256 of the seed, a newline and the domain. Select the first 2,050 without replacement.',
    discovery:'Attempt every selected site. Check up to four declarative candidates per site and run the CDP preflight on the first confirmed task.',sites})
  console.log('Preregistered '+sites.length+' untouched sites. Excluded '+excludedPrior+' prior ranks and '+safety.excluded.length+' safety-listed ranks.')
}

async function scout() {
  if(await optional('scouting.json')) throw new Error('The held-out scouting run already finished.')
  const [freeze,sample,plan,prior,safety,priorSource,safetySource,freezeSource]=await Promise.all([
    frozen(),firstInput('sample.json'),read('sample.json'),read('prior-sites.json'),read('safety-exclusions.json'),
    firstInput('prior-sites.json'),firstInput('safety-exclusions.json'),firstInput('freeze-integrity.json')
  ])
  const excluded=new Set([...prior.sites,...safety.excluded.map(item=>item.site)])
  if(!same(plan.freeze,freezeSource) || plan.seed!==sampleSeed || plan.concurrency!==concurrency || !same(plan.rankRange,[minimumRank,maximumRank]) ||
    plan.sites.length!==count || new Set(plan.sites.map(item=>item.site)).size!==count ||
    !plan.sites.every(({rank,site,url})=>rank>=minimumRank && rank<=maximumRank && !excluded.has(site) && url==='https://'+site+'/')) {
    throw new Error('The held-out sample fails its preregistered scope.')
  }
  await git(['merge-base','--is-ancestor',freeze.frozenCommit,sample.commit+'^'])
  const folder=path.join(ROOT,'.curbcut/v5')
  await mkdir(folder,{recursive:true})
  const journal=path.join(folder,'scouting-'+sample.blob+'.ndjson')
  const lines=await readFile(journal,'utf8').catch(error=>{if(error.code==='ENOENT') return '';throw error})
  const recorded=new Map(lines.trim().split('\n').filter(Boolean).map(line=>{const row=JSON.parse(line);return [row.site,row]}))
  if([...recorded.values()].some(row=>row.frozenCommit!==freeze.frozenCommit)) throw new Error('Scouting checkpoints use a different workflow.')
  const remaining=plan.sites.filter(row=>!recorded.has(row.site))
  const startedAt=[...recorded.values()][0]?.attemptedAt??instant()
  let writes=Promise.resolve()
  async function worker() {
    while(remaining.length) {
      const candidate=remaining.shift()
      const attemptedAt=instant()
      const result=await scoutSite(candidate,{version:5,checkAccess:preflight})
      const row={...candidate,...result,attemptedAt,checkedAt:instant(),frozenCommit:freeze.frozenCommit}
      recorded.set(row.site,row)
      writes=writes.then(()=>appendFile(journal,JSON.stringify(row)+'\n'))
      await writes
      if(recorded.size%25===0 || result.status==='confirmed') {
        const eligible=result.checks?.filter(check=>check.result.status==='confirmed' && check.access?.status==='pass')??[]
        console.log(recorded.size+'/'+count,row.site,result.status,eligible.map(check=>check.task.barrierClass??'single-control').join(','))
      }
      await delay(900)
    }
  }
  delete process.env.CURBCUT_CHROME
  await Promise.all(Array.from({length:concurrency},worker))
  const rows=plan.sites.map(site=>recorded.get(site.site))
  const groups=Object.groupBy(rows,row=>row.status)
  const confirmed=rows.flatMap(row=>row.checks?.filter(check=>check.result.status==='confirmed')??[])
  const eligible=confirmed.filter(check=>check.access?.status==='pass')
  const summary={attempted:rows.length,confirmed:confirmed.length,eligible:eligible.length,preflightExcluded:confirmed.length-eligible.length,
    counts:Object.fromEntries(Object.entries(groups).map(([status,items])=>[status,items.length]))}
  await save('scouting.json',{runner:'playwright',sample,prior:priorSource,safety:safetySource,frozenCommit:freeze.frozenCommit,startedAt,finishedAt:instant(),summary,rows})
  console.log(JSON.stringify(summary,null,2))
}

const [action,csv,safetyDirectory]=process.argv.slice(2)
if(action==='sample' && csv && safetyDirectory) await sample(csv,safetyDirectory)
else if(action==='scout') await withLock(scout)
else throw new Error('Usage: node scripts/scout-v5.mjs sample <tranco.csv> <pinned-safety-lists> | scout')
