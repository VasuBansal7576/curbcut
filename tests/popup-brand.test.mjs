import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const charcoal='#161419'
const ring='#FA4698'
const luminance=hex=>{
  const [r,g,b]=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255)
  const lin=channel=>channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4
  return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
}
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+0.05)/(Math.min(luminance(a),luminance(b))+0.05)

test('popup and options keep charcoal, white, the pink ring, and one grotesk',async()=>{
  const css=await readFile(new URL('../extension/popup.css',import.meta.url),'utf8')
  const html=await readFile(new URL('../extension/popup.html',import.meta.url),'utf8')
  const options=await readFile(new URL('../extension/options.html',import.meta.url),'utf8')
  assert.match(css,new RegExp(charcoal,'i'))
  assert.match(css,new RegExp(ring,'i'))
  assert.match(css,/Inter Tight/)
  assert.match(css,/:where\(a, button, input, select, summary\):focus-visible/)
  assert.match(css,/outline: 2px solid var\(--ring\)/)
  assert.match(css,/\.mark \{[\s\S]*border: 3px solid var\(--ring\)/)
  assert.match(css,/\.primary \{ background: var\(--primary\); color: var\(--paper\)/)
  assert.doesNotMatch(css,/Overpass|JetBrains|#2340FF|#E8FF5A|#f4f1ea|#f5f0e6|beige|cream|#fff8e7/i)
  assert.doesNotMatch(html+options,/beige|cream/i)
  assert.match(html,/aria-labelledby="active-heading"/)
  assert.match(html,/id="global-toggle"[^>]*role="switch"/)
  assert.match(options,/for="visual-state"/)
  assert.match(options,/for="glance"/)
  assert.match(options,/for="finder"/)
  assert.ok(contrast(charcoal,'#ffffff')>=4.5)
  assert.ok(contrast(ring,charcoal)>=3)
})
