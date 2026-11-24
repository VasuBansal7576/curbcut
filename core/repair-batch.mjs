import {proposeBatch} from './agent.mjs'

export async function batchRepairs(tasks,repair) {
  const groups=Map.groupBy(tasks,task=>new URL(task.url).hostname)
  const results=new Map()
  for(const group of groups.values()) {
    const active=new Set(group)
    const pending=new Map()
    function flush() {
      if(!active.size || pending.size!==active.size) return
      const wave=[...pending.values()]
      pending.clear()
      for(const batch of Map.groupBy(wave,row=>row.options.model??null).values()) {
        proposeBatch(batch).then(settled=>{
          for(const [index,result] of settled.entries()) {
            const {resolve,reject}=batch[index]
            if(result.status==='fulfilled') resolve(result.value)
            else reject(result.reason)
          }
        },error=>{for(const {reject} of batch) reject(error)})
      }
    }
    await Promise.all(group.map(async data=>{
      try {
        const write=(task,failure,previous,directory,options)=>new Promise((resolve,reject)=>{
          pending.set(data,{task,failure,previous,directory,options,resolve,reject})
          flush()
        })
        results.set(data,await repair(data,write))
      } catch(error) {results.set(data,{status:'error',reason:error.message})}
      finally {active.delete(data);flush()}
    }))
  }
  return tasks.map(task=>results.get(task))
}
