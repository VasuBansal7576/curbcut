import {jevKey} from '../core/jev.mjs'
import {chooseStuck,stuckThreshold} from '../core/jev-stuck.js'
import {instant,saveJSON} from '../core/io.mjs'

const key=await jevKey()
const arrays={
  cycle:Array.from({length:12},(_,i)=>({key:'Tab',focus:i%2,role:'button',named:true,visible:true,gapMs:500,effect:'focus-change',revisited:i>1})),
  noEffect:Array.from({length:8},()=>({key:'Enter',focus:0,role:'button',named:true,visible:true,gapMs:700,effect:'unchanged',revisited:true})),
  progress:Array.from({length:10},(_,i)=>({key:'Tab',focus:i,role:'link',named:true,visible:true,gapMs:600,effect:'focus-change',revisited:false})),
  invisible:Array.from({length:8},(_,i)=>({key:i%2?'Enter':'Tab',focus:i%2,role:'button',named:false,visible:false,gapMs:700,effect:'unchanged',revisited:i>1}))
}
const rows=[]
for(const [type,trace] of Object.entries(arrays)) {
  const decision=await chooseStuck(key,trace)
  rows.push({type,expected:type!=='progress',alert:decision.p>=stuckThreshold,...decision,trace})
}
await saveJSON('proof/jev/stuck-development.json',{source:'Synthetic development traces',checkedAt:instant(),threshold:stuckThreshold,rows})
console.log(rows.map(({type,p,alert})=>({type,p,alert})))
