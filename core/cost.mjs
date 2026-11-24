import {AsyncLocalStorage} from 'node:async_hooks'
import {randomUUID} from 'node:crypto'
import {readdir} from 'node:fs/promises'
import path from 'node:path'
import {ROOT,readJSON,saveJSON} from './io.mjs'

const context=new AsyncLocalStorage()
const directory=path.join(ROOT,'.curbcut/cost')
export const tokens=text=>Math.ceil(Buffer.byteLength(text??'')/4)
export const balanceNumber=text=>{
  const value=text?.match(/Available credits:\s*([\d,.]+)/i)?.[1]
  return value===undefined?null:Number(value.replaceAll(',',''))
}

export function recordCost(mechanism,values={}) {
  context.getStore()?.events.push({mechanism,...values})
}

export async function meter(action,{balance},work) {
  const read=async()=>balance?balanceNumber(await balance().catch(()=>null)):0
  const row={id:randomUUID(),at:new Date().toISOString(),action,events:[],balanceBefore:await read()}
  try {return await context.run(row,work)}
  finally {
    row.balanceAfter=await read()
    row.kaneCredits=row.balanceBefore===null || row.balanceAfter===null?null:row.balanceBefore-row.balanceAfter
    row.agentTokens=row.events.reduce((sum,event)=>sum+(event.tokens??0),0)
    await saveJSON(path.join(directory,row.id+'.json'),row)
    console.log('Cost '+JSON.stringify(row))
  }
}

export async function summarizeCost() {
  const files=await readdir(directory).catch(error=>{if(error.code==='ENOENT') return [];throw error})
  const rows=await Promise.all(files.filter(file=>file.endsWith('.json')).map(file=>readJSON(path.join(directory,file))))
  const mechanisms={}
  for(const row of rows) for(const event of row.events) {
    const total=mechanisms[event.mechanism]??={events:0}
    total.events++
    for(const [key,value] of Object.entries(event)) if(Number.isFinite(value)) total[key]=(total[key]??0)+value
  }
  return {runs:rows.length,agentTokens:rows.reduce((sum,row)=>sum+row.agentTokens,0),
    measuredKaneCredits:rows.reduce((sum,row)=>sum+(row.kaneCredits??0),0),
    unknownKaneRuns:rows.filter(row=>row.kaneCredits===null).length,mechanisms}
}
