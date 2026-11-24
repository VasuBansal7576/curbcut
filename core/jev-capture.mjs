import {match} from './engine.js'

export async function captureInstant(page,task) {
  if(!match({id:'capture',site:new URL(task.url).hostname,match:new URL(task.url).origin+new URL(task.url).pathname,
    task:task.task,persona:task.persona,barrier:'capture',status:'candidate',evidence:{},history:[],
    rules:[{action:'makeFocusable',selector:'body'}]},page.url())) return null
  if(task.probe?.action==='read') {
    await page.evaluate(selector=>{
      document.querySelector(selector)?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})
      window.scrollTo({left:0,top:scrollY,behavior:'instant'})
    },task.observedSelector)
  }
  const start=performance.now()
  const state=await page.evaluate(()=>CurbCut.instantPrivacy()?CurbCut.collectInstantState().state:null)
  if(!state) return null
  const screenshot=state.candidates.length?await page.screenshot({type:'jpeg',quality:65,timeout:5000}):null
  return {state:{...state,zoom:1},screenshot:screenshot?'data:image/jpeg;base64,'+screenshot.toString('base64'):null,
    captureMs:Math.round(performance.now()-start)}
}
