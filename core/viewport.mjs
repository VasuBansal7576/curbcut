import {createServer} from 'node:http'
import {ws as WebSocket,wsServer as WebSocketServer} from 'playwright-core/lib/utilsBundle'

function lockMetrics(message,width,height) {
  if(['Emulation.setDeviceMetricsOverride','Emulation.clearDeviceMetricsOverride'].includes(message.method)) {
    message.method='Emulation.setDeviceMetricsOverride'
    message.params={width,height,deviceScaleFactor:1,mobile:false,screenWidth:width,screenHeight:height}
  } else if(message.method==='Emulation.setVisibleSize') message.params={width,height}
  else if(message.method==='Emulation.setPageScaleFactor') message.params={pageScaleFactor:1}
  else if(message.method==='Target.sendMessageToTarget') {
    message.params.message=JSON.stringify(lockMetrics(JSON.parse(message.params.message),width,height))
  }
  return message
}

export async function lockViewport(endpoint,width,height) {
  const server=createServer(async(req,res)=>{
    try {
      if(req.method!=='GET' || !/^\/json(?:\/(?:version|list|protocol))?\/?$/.test(req.url)) {
        res.writeHead(404).end()
        return
      }
      const response=await fetch(endpoint+req.url)
      const data=(await response.text()).replaceAll('ws://'+new URL(endpoint).host,'ws://127.0.0.1:'+server.address().port)
      res.writeHead(response.status,{'Content-Type':'application/json'}).end(data)
    } catch {res.writeHead(502).end()}
  })
  const clients=new WebSocketServer({server})
  clients.on('connection',(client,req)=>{
    if(!/^\/devtools\/(?:browser|page)\/[a-z\d-]+$/i.test(req.url)) {
      client.close(1008)
      return
    }
    const upstream=new WebSocket(new URL(req.url,endpoint.replace(/^http:/,'ws:')))
    const pending=[]
    client.on('message',data=>{
      try {
        const message=JSON.stringify(lockMetrics(JSON.parse(data),width,height))
        if(upstream.readyState===WebSocket.OPEN) upstream.send(message)
        else if(upstream.readyState===WebSocket.CONNECTING) pending.push(message)
      } catch {client.close(1003)}
    })
    upstream.on('open',()=>{for(const message of pending.splice(0)) upstream.send(message)})
    upstream.on('message',data=>{if(client.readyState===WebSocket.OPEN) client.send(data,{binary:false})})
    upstream.on('close',()=>client.close())
    upstream.on('error',()=>client.close())
    client.on('close',()=>upstream.terminate())
    client.on('error',()=>upstream.terminate())
  })
  await new Promise((resolve,reject)=>{
    server.once('error',reject)
    server.listen(0,'127.0.0.1',resolve)
  })
  return {
    endpoint:'http://127.0.0.1:'+server.address().port,
    close(){
      for(const client of clients.clients) client.terminate()
      clients.close()
      server.close()
    }
  }
}
