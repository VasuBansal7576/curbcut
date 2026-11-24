import http from 'node:http'
import path from 'node:path'
import {createReadStream} from 'node:fs'
import {stat,realpath,readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {ROOT,readJSON,saveJSON} from './io.mjs'
import {fix,withLock} from './loop.mjs'
import {requireKane} from './kane.mjs'
import {normalizeTask,allowedHost,acceptableURL,fixtureURL} from './task.mjs'
import {chooseInstant} from './jev-policy.js'
import {chooseNames,chooseLanguage} from './jev-decisions.js'
import {chooseStuck} from './jev-stuck.js'
import {jevKey} from './jev.mjs'
import {enqueueInstant,enqueueDraft} from './jev-queue.mjs'
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.mp4':'video/mp4','.md':'text/plain','.txt':'text/plain','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.vtt':'text/vtt'}
const publicRoots=['/site/','/fixtures/shop/','/patches/','/proof/','/evidence/','/launch/curbcut-launch.mp4']
export function serve(port=4317) {
  let running=false
  const server=http.createServer(async(req,res)=>{
    const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
    try {
      if(req.headers.host!=='127.0.0.1:'+port && req.headers.host!=='localhost:'+port) return json(403,{error:'Local host required'})
      const url=new URL(req.url,'http://127.0.0.1:'+port)
      if(['OPTIONS','POST'].includes(req.method) && ['/instant/decide','/instant/queue','/instant/name','/instant/language','/instant/stuck'].includes(url.pathname)) {
        const origin=req.headers.origin
        if(origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) return json(403,{error:'Extension only'})
        if(origin) res.setHeader('Access-Control-Allow-Origin',origin)
        if(req.method==='OPTIONS') {
          res.writeHead(204,{'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'})
          return res.end()
        }
        if(!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'JSON required'})
        res.setHeader('Cache-Control','no-store')
        const parts=[]
        let size=0
        for await(const chunk of req) {
          size+=chunk.length
          if(size>4000000) return json(413,{error:'Instant request too large'})
          parts.push(chunk)
        }
        const data=JSON.parse(Buffer.concat(parts))
        if(url.pathname.endsWith('/queue')) return json(202,await enqueueInstant(data))
        if(url.pathname.endsWith('/stuck')) {
          const key=await jevKey()
          return key?json(200,await chooseStuck(key,data.trace)):json(503,{error:'Jev is not configured.'})
        }
        const page=new URL(data.state?.url??data.url)
        if(!acceptableURL(page) || page.search || page.hash || (!fixtureURL(page) && !await allowedHost(page.hostname))) {
          return json(400,{error:'Use a public HTTPS page or the local fixture.'})
        }
        const key=await jevKey()
        if(!key) return json(503,{error:'Jev is not configured.'})
        if(url.pathname.endsWith('/name')) {
          if(!Array.isArray(data.pairs) || !data.pairs.length || data.pairs.length>4) return json(400,{error:'Invalid naming batch'})
          return json(200,await chooseNames(key,data.pairs,data.language,{live:true}))
        }
        if(url.pathname.endsWith('/language')) {
          if(typeof data.sample!=='string') return json(400,{error:'Invalid language sample'})
          return json(200,await chooseLanguage(key,data.sample.slice(0,2048)))
        }
        return json(200,await chooseInstant(key,data.state,data.screenshot))
      }
      const jobMatch=/^\/tasks\/([a-f0-9-]{36})$/.exec(url.pathname)
      if(jobMatch && req.method==='GET') {
        const {job,status,phase,result}=await readJSON(path.join(ROOT,'.curbcut/jobs',jobMatch[1]+'.json'))
        res.setHeader('Cache-Control','no-store')
        return json(200,{job,status,phase,patchId:result?.patch?.id})
      }
      if(url.pathname==='/tasks/draft' && ['OPTIONS','POST'].includes(req.method)) {
        const origin=req.headers.origin
        if(origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) return json(403,{error:'Extension only'})
        if(origin) res.setHeader('Access-Control-Allow-Origin',origin)
        if(req.method==='OPTIONS') {
          res.writeHead(204,{'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'})
          return res.end()
        }
        if(!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'JSON required'})
        const parts=[]
        let size=0
        for await(const chunk of req) {size+=chunk.length;if(size>65536) return json(413,{error:'Report too large'});parts.push(chunk)}
        res.setHeader('Cache-Control','no-store')
        return json(202,await enqueueDraft(JSON.parse(Buffer.concat(parts))))
      }
      if(url.pathname==='/tasks' && req.method==='POST') {
        const origin=req.headers.origin
        if(origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) return json(403,{error:'Extension only'})
        if(!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'JSON required'})
        if(running) return json(409,{error:'A task is running'})
        const parts=[]
        let size=0
        for await(const chunk of req) {size+=chunk.length;if(size>65536) return json(413,{error:'Task too large'});parts.push(chunk)}
        const data=JSON.parse(Buffer.concat(parts))
        const task=await normalizeTask(data)
        if(running) return json(409,{error:'A task is running'})
        const job=randomUUID()
        const file=path.join(ROOT,'.curbcut/jobs',job+'.json')
        running=true
        try {
          const snapshot=data.snapshot??null
          await saveJSON(file,{job,status:'queued',task,snapshot})
          res.setHeader('Cache-Control','no-store')
          json(202,{job,status:'queued',file:'.curbcut/jobs/'+job+'.json'})
          const report=(phase,run)=>console.log([`[${job.slice(0,8)}]`,phase,run?.runId?`Kane ${run.status} ${run.runId}`:null].filter(Boolean).join(' · '))
          const progress=async(phase,run)=>{
            report(phase,run)
            await saveJSON(file,{job,task,snapshot,status:'running',phase})
          }
          report('capture received')
          void withLock(async()=>{await requireKane();return fix(task,{progress})}).then(async result=>{
            await saveJSON(file,{job,task,snapshot,status:result.status,result})
            report(result.status)
          }).catch(async error=>{
            await saveJSON(file,{job,task,snapshot,status:'blocked',error:error.message})
            report(`blocked · ${error.message}`)
          }).finally(()=>{running=false})
        } catch(error) {running=false;throw error}
        return
      }
      if(req.method!=='GET' && req.method!=='HEAD') return json(405,{error:'Method not allowed'})
      let pathname=decodeURIComponent(url.pathname)
      if(pathname==='/') pathname='/site/'
      if(!publicRoots.some(p=>pathname.startsWith(p)) || pathname.split('/').some(s=>s.startsWith('.'))) return json(404,{error:'Unknown path'})
      if(pathname.endsWith('/')) pathname+='index.html'
      const file=await realpath(path.join(ROOT,pathname))
      const canonical='/'+path.relative(ROOT,file)
      if(!publicRoots.some(p=>canonical.startsWith(p))) return json(403,{error:'Outside public folders'})
      if(canonical==='/fixtures/shop/index.html' && process.env.CURBCUT_FIXTURE_NATIVE==='1') {
        const html=(await readFile(file,'utf8')).replace('<html lang="en">','<html lang="en" data-native-repair>')
        res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'})
        return res.end(req.method==='HEAD'?'':html)
      }
      const info=await stat(file)
      if(!info.isFile()) return json(404,{error:'Not a file'})
      const headers={'Content-Type':types[path.extname(file)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'}
      let range
      if(req.headers.range) {
        const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range)
        if(!match) return json(416,{error:'Invalid range'})
        const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),info.size-1):info.size-1
        if(start>end) return json(416,{error:'Invalid range'})
        range={start,end}
        headers['Content-Range']=`bytes ${start}-${end}/${info.size}`
        headers['Content-Length']=end-start+1
      }
      res.writeHead(range?206:200,headers)
      if(req.method==='HEAD') res.end()
      else createReadStream(file,range).on('error',()=>res.destroy()).pipe(res)
    } catch(error) {if(!res.headersSent) json(error.code==='ENOENT'?404:400,{error:error.message});else res.end()}
  })
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server))})
}
