import {tmpdir} from 'node:os'
import {session} from './chrome.mjs'
import {BlockedPage,pageBlock} from './access.mjs'
import {taskNavigation} from './task.mjs'
import {widthEvidence} from './geometry.js'

class LaneFailure extends Error {}

async function control(page,selector,persona) {
  const locator=page.locator(selector)
  if(await locator.count()!==1 || !await locator.isVisible()) throw new Error('The declared control is unavailable: '+selector)
  if(persona==='low-vision' && !(await locator.evaluate(widthEvidence,undefined,{timeout:1500})).fits) {
    throw new LaneFailure('The control extends past the visible width: '+selector)
  }
  return locator
}

async function readingControl(locator,role,name,action) {
  const handle=await locator.evaluateHandle(element=>CurbCut.readerRow(element)?.row,undefined,{timeout:1500})
  try {
    const row=handle.asElement()
    const actual=await locator.evaluate(element=>CurbCut.readerRow(element)?.info,undefined,{timeout:1500})
    if(!row || actual?.role!==role || actual?.name!==name) throw new LaneFailure('Reading view did not expose '+role+' '+name+'.')
    return await action(row)
  } finally {await handle.dispose()}
}

async function enter(locator,persona,name,value) {
  if(persona==='screen-reader-view') return readingControl(locator,'textbox',name,async row=>{
    const field=await row.$('input')
    if(!field) throw new LaneFailure('Reading view exposed no editable field for '+name+'.')
    await field.fill(value,{timeout:1500})
    await field.press('Tab',{timeout:1500})
  })
  await locator.click({timeout:1500})
  await locator.fill('',{timeout:1500})
  await locator.pressSequentially(value,{timeout:1500})
  await locator.press('Tab',{timeout:1500})
}

async function addDays(page,persona) {
  const textbox=await control(page,'#c2day',persona)
  const submit=await control(page,'form:has(#c2day) input[type=submit][value="Calculate"]',persona)
  await enter(textbox,persona,'Days to add','2')
  if(persona==='screen-reader-view') await readingControl(submit,'button','Calculate',row=>row.isVisible())
  throw new Error('The date calculator requires form submission to verify the numerical outcome.')
}

async function latitude(page,persona) {
  const input=await control(page,'input[name=lat]',persona)
  const radio=await control(page,'input[name=opt][value="-l"]',persona)
  await enter(input,persona,'Latitude','10')
  if(await input.inputValue({timeout:1500})!=='10' || !await radio.isChecked()) return false
  if(persona==='screen-reader-view') {
    return readingControl(radio,'radio','Lat:',async row=>/(?:^| · )checked(?: · |$)/.test(await row.innerText()))
  }
  return true
}

async function conversion(page,persona) {
  const form='form[name=MainForm] '
  const from=await control(page,form+'select[name=from]',persona)
  const to=await control(page,form+'select[name=to]',persona)
  const input=await control(page,form+'input[name=what]',persona)
  const convert=await control(page,form+'input[type=button][name=Go]',persona)
  await enter(input,persona,'','1')
  await from.selectOption({label:'feet'},{timeout:1500})
  await to.selectOption({label:'inch'},{timeout:1500})
  await convert.click({timeout:1500})
  const answer=await control(page,form+'input[name=answer]','control')
  return (await answer.inputValue({timeout:1500})).trim()==='1 feet = 12 inch'
}

async function length(page,persona) {
  const input=await control(page,'#fromVal',persona)
  const answer=await control(page,'#toVal',persona)
  const from=page.locator('#calFrom option:checked')
  const to=page.locator('#calTo option:checked')
  if((await from.innerText({timeout:1500})).trim()!=='Meter' || (await to.innerText({timeout:1500})).trim()!=='Kilometer') {
    throw new Error('The default length units changed.')
  }
  await enter(input,persona,'','1')
  return (await answer.inputValue({timeout:1500})).trim()==='0.001'
}

const objectives={
  'calculator-net-add-days':addDays,
  'fourmilab-prepare-latitude':latitude,
  'online-conversion-length':conversion,
  'unitconverters-length':length
}
export const hasLegacyReplay=id=>Object.hasOwn(objectives,id)

export async function replayLegacy(task,persona,patch=null) {
  const result=(status,reason)=>({runner:'playwright',status,reason})
  let browser
  try {
    browser=await session(task,persona,patch,tmpdir(),{local:true,gate:true})
    const {page}=browser
    const passed=await objectives[task.id](page,persona)
    const blocked=await pageBlock(page,browser.responses.get(page))
    if(blocked || !taskNavigation(new URL(task.url),new URL(page.url()))) return result('blocked',blocked??'The action left the public task page.')
    if(persona==='low-vision' && await page.evaluate(()=>__curbcutState.horizontalScroll)) return result('fail','The conversion required horizontal scrolling.')
    if(patch && passed && ![...browser.observations.values()].some(entry=>entry.events.some(event=>event.type==='rule' && event.patchId===patch.id))) {
      return result('inconclusive','No published rule matched during the replay.')
    }
    return result(passed?'pass':'fail',passed?'The input sequence reached the declared result.':'The numerical or selected-state result did not match.')
  } catch(error) {
    return result(error instanceof BlockedPage?'blocked':error instanceof LaneFailure?'fail':'inconclusive',error.message.split('\n')[0])
  } finally {await browser?.abort()}
}
