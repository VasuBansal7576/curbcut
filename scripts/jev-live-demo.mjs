import assert from 'node:assert/strict'
import path from 'node:path'
import {ROOT,saveJSON} from '../core/io.mjs'
import {runLiveNaming} from './jev-live-extension-e2e.mjs'

const folder=path.join(ROOT,'proof/jev/live-naming-demo')
const target='https://meridiano.net/'
const result=await runLiveNaming({urls:[target],viewport:{width:1920,height:1080},folder,focusSelector:'#open-sidebar'})
const {pages:[page],...run}=result
const observed=page.names?.filter(row=>row.visibleInBefore && row.visibleInAfter &&
  row.before?.includes('(unnamed)') && row.after?.includes(row.name))
assert(observed?.length>=2,JSON.stringify(page))
await saveJSON(path.join(folder,'capture.json'),{...run,...page,source:page.finalUrl})
