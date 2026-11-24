import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {cues,platesByState} from './story.mjs'

const file=name=>new URL('../'+name,import.meta.url)
export const cuts=JSON.parse(readFileSync(file('film/word-times.json')))
export const beats=[]
const time=t=>new Date(Math.round(t*1000)).toISOString().slice(11,23)
const catalog=JSON.parse(readFileSync(file('film/plates/index.json')))
const clean=word=>word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g,'')
let sheet='# Launch film shot list\n'
for(const [cut,shots] of Object.entries(cuts)){
  let captions='WEBVTT\n\n'
  sheet+='\n## '+(cut==='master'?'Launch film':'Teaser')+'\n\n| Word onset | Visible cut | Word | Picture | Source |\n|---:|---:|---|---|---|\n'
  for(const shot of shots){
    const words=shot.cues.flatMap(c=>c.words)
    let cursor=0
    for(const [i,[word,state]] of (cues[shot.id]??cues[shot.id.replace(/^teaser-/,'')]).entries()){
      const at=words.findIndex(([w],j)=>j>=cursor&&clean(w)===clean(word))
      assert.ok(at>=0,shot.id+' '+word)
      cursor=at+1
      const local=i?words[at][1]:0
      const wordStart=+(shot.frame/30+words[at][1]).toFixed(6)
      const frame=shot.frame+Math.ceil(local*30-1e-8)
      assert.ok(Math.abs(frame/30-wordStart)<=.2,JSON.stringify({state,wordStart,frame}))
      const asset=platesByState[state]
      const src=asset?'['+asset+'](film/plates/'+catalog[asset].file+')':'Motion design'
      beats.push({cut,scene:shot.id,word,state,event:state,local,frame,wordStart,region:state==='population'?[110,820,1540,104]:[96,120,1728,804]})
      sheet+='| '+time(wordStart)+' | '+time(frame/30)+' | '+word+' | '+state+' | '+src+' |\n'
    }
    for(const c of shot.cues)captions+=time(shot.frame/30+c.start)+' --> '+time(shot.frame/30+c.end)+'\n'+c.text+'\n\n'
  }
  writeFileSync(file('captions/'+(cut==='master'?'launch':'teaser')+'.vtt'),captions.trimEnd()+'\n')
}
writeFileSync(file('shots.md'),sheet)
writeFileSync(file('film/beats.json'),JSON.stringify(beats,null,2)+'\n')
