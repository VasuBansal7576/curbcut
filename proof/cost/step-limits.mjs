import {readJSON} from '../../core/io.mjs'

const registrations=await Promise.all(['hard-v4','heldout-v5','heldout-v6'].map(cohort=>readJSON('proof/'+cohort+'/registration.json')))
const tasks=new Map(registrations.flatMap(cohort=>cohort.tasks.map(({task})=>[task.id,task])))
const rows=(await readJSON('proof/jev/predict-rows.json')).filter(row=>row.decisive && Number.isInteger(row.steps))
const groups=Map.groupBy(rows,row=>{
  if(row.file.includes('/control/')) return 'control'
  const task=tasks.get(row.taskId)
  if(!task) return null
  return task.evaluation?.category??task.barrierClass??task.probe?.action??task.persona
})
const limits={}
for(const [type,group] of groups) {
  if(!type || group.length<5) continue
  const ordered=group.map(row=>row.steps).sort((a,b)=>a-b)
  limits[type]={count:ordered.length,maxSteps:ordered[Math.ceil(ordered.length*.95)-1]+3}
}
console.log(JSON.stringify(limits,null,2))
