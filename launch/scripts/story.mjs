import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=name=>JSON.parse(readFileSync(new URL(name,import.meta.url)))
export const cues=read('../film/cues.json')
export const inventory=read('../../extension/bundled.json').length
assert.equal(inventory,105)

export const platesByState={
  'switch-off':'popup-apply-off','switch-on':'popup-apply-fixes',closed:'mass-off-10',opened:'mass-on-10',
  'reader-off':'reader-off','reader-on':'reader-on',
  'contrast-off':'contrast-off','contrast-on':'contrast-on',
  replay:'efcfdd9f-13',failed:'efcfdd9f-13',passed:'cb96e3af-17',record:'kane-replay',
  inventory:'popup-apply-fixes','popup-proof':'popup-proof-and-report',
  'jev-off':'jev-off',jev:'jev-off','jev-on':'jev-on',report:'owner-report'
}
