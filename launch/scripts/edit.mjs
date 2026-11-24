import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {initial,events,states,still} from './story.mjs'

const file=path=>new URL('../'+path,import.meta.url)
const cuts=JSON.parse(readFileSync(file('film/word-times.json')))
const catalog=JSON.parse(readFileSync(file('film/plates/index.json')))
const graphics={
  count:'Top million home pages',percent:'95.9% with failures',sixTypes:'Six common mistakes',logo:'Cut the curb into a ramp',
  freeze:'Freeze the repair code',sample:'2,050 unseen sites',fixed:'99 of 142 fixed locally',hardCount:'51 of 89 hard journeys',
  sample6:'400 new sites',categories:'Five additional categories',fixed6:'76 of 118 fixed locally',
  samples:'Random samples',v5:'11 of 20 v5 repairs verified',v6:'7 of 15 v6 repairs verified',limits:'Unverified outcomes',
  inventory:'105 active fixes',shipped:'61 verified by Kane'
}
const clean=s=>s.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g,'')
const beats=[],cues=[],rows=[]
for(const [cut,shots] of Object.entries(cuts)){
  for(const shot of shots){
    const words=shot.cues.flatMap(c=>c.words)
    let cursor=0
    const sources=new Set()
    const addSources=state=>{
      const s=states[state]
      if(!s)return
      for(const key of [s.asset,s.inset,s.panel,s.detail].filter(Boolean))sources.add(key)
    }
    addSources(initial[shot.id])
    for(const [word,state] of events[shot.id]){
      const phrase=word.toLowerCase().split(' ')
      const index=words.findIndex((_,j)=>j>=cursor&&phrase.every((p,i)=>clean(words[j+i]?.[0]??'')===p))
      assert.ok(index>=0,shot.id+' '+word)
      cursor=index+phrase.length
      const product=states[state]
      const region=cut==='teaser'?(state==='logo'?[60,160,730,535]:[1370,834,490,110]):
        state==='logo'?[56,160,780,540]:product?[140,24,385,51]:[84,300,580,220]
      const spec=[product?.headline??graphics[state],region]
      const beat={cut,scene:shot.id,word,state,event:spec[0],region:spec[1],local:words[index][1],wordStart:+(shot.frame/30+words[index][1]).toFixed(6)}
      if(still[shot.id]===state)beat.still=shot.id
      beats.push(beat);addSources(state)
    }
    rows.push([cut,shot,Array.from(sources)])
    if(cut==='master')for(const c of shot.cues)cues.push([shot.frame/30+c.start,shot.frame/30+c.end,c.text])
  }
}
const save=(name,data)=>writeFileSync(file(name),data)
const json=v=>JSON.stringify(v,null,2)+'\n'
save('film/beats.json',json(beats))
const time=t=>new Date(Math.round(t*1000)).toISOString().slice(11,23)
save('captions/launch.vtt','WEBVTT\n\n'+cues.map(([a,b,s])=>time(a)+' --> '+time(b)+'\n'+s+'\n').join('\n'))
let sheet='# Curb Cut launch film\n\n'
for(const cut of ['master','teaser']){
  sheet+='## '+(cut==='master'?'Master':'15-second cut')+'\n\n| Time | Narration | Picture and evidence |\n|---|---|---|\n'
  for(const [,s,keys] of rows.filter(([c])=>c===cut)){
    const refs=keys.map(key=>{
      const a=catalog[key]
      if(a.run)return '['+a.run.slice(0,8)+' · step '+a.step+' · '+a.verdict+'](../'+a.source+')'
      if(a.url)return '['+key+' · '+new URL(a.url).hostname+'](film/plates/'+a.file+')'
      return '['+key+'](film/plates/'+a.file+')'
    })
    const graphics={scale:'WebAIM Million 2026 · 959 of 1,000 marks',rules:'[Agent’s original rules](../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/agent-answer.txt)',results:'[Frozen local results](../proof/heldout-v5/local-summary.json)',six:'[Five v6 categories](../proof/heldout-v6/local-summary.json)',verified:'[Extension inventory](../extension/bundled.json)'}
    sheet+='| '+time(s.frame/30)+' | '+s.cues.map(c=>c.text).join(' ')+' | '+(refs.join(' · ')||graphics[s.id]||'Curb-to-ramp identity')+' |\n'
  }
  sheet+='\n'
}
sheet+='## Word-linked picture changes\n\n| Cut | Scene | Spoken word | Onset | Picture |\n|---|---|---|---:|---|\n'
for(const b of beats)sheet+=`| ${b.cut} | ${b.scene} | ${b.word} | ${time(b.wordStart)} | ${b.event} |\n`
sheet+='\nThe Munich baseline Kane pack records an unsuccessful search at the top of Reading view. The close-up uses a separate Chromium capture of the selector in the local study. The patched Kane outline uses the clicked row rectangle stored in step 4. The Jev close-up uses the two rows visible in the Meridiano capture. The Mass.edu insets come from the original Kane packs. ExtremeTerrain uses the measured foreground and background in each installed-extension capture.\n'
save('shots.md',sheet)
