import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=file=>JSON.parse(readFileSync(new URL('../../'+file,import.meta.url)))
const five=read('proof/heldout-v5/local-summary.json')
const six=Object.values(read('proof/heldout-v6/local-summary.json').byCategory)
const hard=Object.entries(five.byClass).filter(([key])=>/^[1-5]$/.test(key)).map(([,v])=>v)
const counts=rows=>rows.reduce(([f,t],r)=>[f+r.fixed,t+r.total],[0,0])
const sample5=read('proof/heldout-v5/kane-sample-20/summary.json')
const sample6=read('proof/heldout-v6/kane-summary.json').cases
const inventory=read('extension/bundled.json')
const names=read('proof/jev/live-naming-real-sites.json')
export const study={
  sites5:read('proof/heldout-v5/sample.json').sites.length, local5:[five.fixed,five.total], hard:counts(hard),
  sites6:read('proof/heldout-v6/sample.json').sites.length, categories:six.length, local6:counts(six),
  kane5:[sample5.kaneVerified,sample5.started], kane6:[sample6.filter(c=>c.verified).length,sample6.length],
  inventory:inventory.length,verified:inventory.filter(p=>p.status==='verified').length,
  names:[names.adjudication.correct,names.summary.appliedNames]
}
assert.deepEqual(study,{sites5:2050,local5:[99,142],hard:[51,89],sites6:400,categories:5,local6:[76,118],kane5:[11,20],kane6:[7,15],inventory:105,verified:61,names:[13,15]})
