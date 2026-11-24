import {serve} from '../core/server.mjs'

let pending
const handle={close(done){if(typeof done==='function') done()}}
export async function fixtureServer() {
  pending??=serve().then(server=>{
    server.unref()
    return server
  }).catch(error=>{
    if(error.code!=='EADDRINUSE') throw error
  })
  await pending
  return handle
}
