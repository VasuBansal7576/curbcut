import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {initial,events,states,still} from './story.mjs'

const file=path=>new URL('../'+path,import.meta.url)
const cuts=JSON.parse(readFileSync(file('film/word-times.json')))
const catalog=JSON.parse(readFileSync(file('film/plates/index.json')))
const custom={
 count:['Start the WebAIM counter',[65,280,820,230]],percent:['Land at 95.9% and 959 tiles',[150,289,505,217]],
 logo:['Cut the curb into a ramp',[60,160,730,535]],lane2:['Paint the second lane',[76,70,280,76]],
 rules:['Reveal the repair rules',[88,509,900,75]],focusRule:['Highlight makeFocusable',[84,508,1240,72]],
 enterRule:['Highlight bindEnterToClick',[84,695,1240,72]],
 sample:['2,050 held-out sites attempted',[65,228,480,205]],barriers:['142 registered barriers',[735,228,365,205]],
 fixed:['99 fixed in local Playwright tests',[1365,228,320,205]],hardCount:['51 of 89 hard journeys fixed locally',[815,540,990,103]],
 menusCount:['31 of 43 hover menus',[80,700,281,117]],panelsCount:['11 of 20 disclosures',[425,700,281,117]],
 tabsCount:['5 of 14 tabs and carousels',[770,700,281,117]],modalsCount:['3 of 11 modal dialogs',[1115,700,281,117]],
 wormsSkip:['Outline the skipped Tools menu',[1390,246,156,68]],
 wormsFail:['Show FAIL on the unpatched Kane frame',[61,836,275,105]],
 wormsPass:['Show PASS on the patched Kane frame',[61,836,275,105]],
 gate:['Kane proves the journey before release',[71,342,1440,189]],shipped:['Show the verified inventory of 43',[55,215,675,490]],
 published:['Mark fixes live in the extension',[744,507,805,154]]
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
      const top=states[state]?.focus?.[1]>840||states[state]?.asset==='f1123b3e-5'?146:834
      const spec=custom[state]??(states[state]?.nav?[states[state].headline,[1370,834,490,110]]:null)??[states[state].headline,[55+(states[state].lane?268:0),top,Math.min(570,Math.max(190,states[state].headline.length*43)),111]]
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
      if(a.url)return '[Chromium '+(a.enabled?'on':'off')+' · '+(a.key??'320 CSS px')+'](film/plates/'+a.file+')'
      return '['+key+'](film/plates/'+a.file+')'
    })
    const graphics={scale:'WebAIM Million 2026 · 959 of 1,000 marks',rules:'[Agent’s original rules](../proof/kane/keyboard-add-headphones/2026-11-21T19-39-28.953Z/attempt-1/agent-answer.txt)',results:'[Frozen local results](../proof/heldout-v5/local-summary.json)',verified:'[Extension inventory](../extension/bundled.json)'}
    sheet+='| '+time(s.frame/30)+' | '+s.cues.map(c=>c.text).join(' ')+' | '+(refs.join(' · ')||graphics[s.id]||'Curb-to-ramp identity')+' |\n'
  }
  sheet+='\n'
}
sheet+='The extension captures used fresh headless Chromium profiles. The CloudConvert detail was captured at 320 CSS pixels and 6× device scale. The narrow right-hand inset is Kane’s original 320-pixel step. The ColorHexa report inset comes from the installed extension recording at 1 and 5 seconds. The Share shot places the photographed extension switch over the captured Mass.edu page. The government-site detail uses fresh 5464 × 3400 screenshots at 200% browser zoom. At a Kane proof beat, the bordered inset shows the original evidence at 1.25× and the surrounding page shows the matching Chromium journey. The displayed destination URL comes from the recorded tab. Focus labels transcribe the page or identify the recorded key.\n\nThe underscore is an original 88 BPM synthesized score. Kokoro af_heart narrates at speed 1.04. Motion sounds come from the HyperFrames offline SFX collection.\n'
save('shots.md',sheet)
