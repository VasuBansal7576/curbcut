const fs=require('node:fs')
const path=require('node:path')
const os=require('node:os')
const {pathToFileURL}=require('node:url')
const {execFileSync}=require('node:child_process')
const {chromium}=require('playwright')
const timings=require('../v8/release/timing.json')
const original=require('../v8/problem-first/shots.json')
const chapter=require('../v8/chapter-timing.json')
const work=process.env.FILM_CACHE
if(!work)throw Error('Set FILM_CACHE to the prepared footage directory.')
const root=path.resolve(__dirname,'../../..'),url=p=>pathToFileURL(p).href
const read=file=>JSON.parse(fs.readFileSync(file))
const launch=original.filter(([start])=>start<2973).map(([start,id])=>({start,id}))
let cursor=2973
for(const id of Object.keys(timings).slice(0,11)){launch.push({start:cursor,id});cursor+=timings[id].frames}
const tail=cursor
for(const [start,id] of original.filter(([start])=>start>=3156))launch.push({start:tail+start-3156,id})
const launchEnd=tail+3559-3156
launch.push({start:launchEnd-50,id:'signoff'})
cursor=launchEnd
const dev=[]
for(const {id,duration} of chapter){
  dev.push({start:cursor,id:'dev'+id[0].toUpperCase()+id.slice(1)})
  cursor+=Math.round(duration*30)
  if(id==='report')for(const extra of Object.keys(timings).slice(11)){
    dev.push({start:cursor,id:extra});cursor+=timings[extra].frames
  }
}
const edits=[...launch,...dev].map((shot,i,arr)=>({...shot,frames:(arr[i+1]?.start??cursor)-shot.start}))
const teaser=['mapSkip','mapReport','mapAgent','mapFixed','mapPopup','signoff']
const dir=path.join(work,'segments');fs.mkdirSync(dir,{recursive:true})
async function encode(page,shot){
  const bytes=await page.evaluate(async ({id,frames})=>{
    const chunks=[];let failure
    const enc=new VideoEncoder({output:chunk=>{const b=new Uint8Array(chunk.byteLength);chunk.copyTo(b);chunks.push(b)},error:e=>failure=e})
    enc.configure({codec:'avc1.42002a',width:1920,height:1080,framerate:30,bitrate:9000000,latencyMode:'realtime',avc:{format:'annexb'}})
    try{
      for(let f=0;f<frames;f++){
        await paint(id,f/30,frames/30)
        const img=new VideoFrame(canvas,{timestamp:Math.round(f*1e6/30),duration:33333})
        enc.encode(img,{keyFrame:f%60===0});img.close()
        if(enc.encodeQueueSize>6)await enc.flush()
        if(failure)throw failure
      }
      await enc.flush()
    }finally{enc.close()}
    return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks))})
  },shot)
  const raw=path.join(dir,shot.id+'.264')
  fs.writeFileSync(raw,Buffer.from(bytes,'base64'))
  execFileSync('ffmpeg',['-loglevel','error','-y','-r','30','-i',raw,'-c:v','copy','-video_track_timescale','30000',path.join(dir,shot.id+'.mp4')])
  fs.unlinkSync(raw)
}
async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'curbcut-film-'))
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',args:['--mute-audio','--allow-file-access-from-files']})
  try{
    const page=context.pages()[0]
    await page.goto(url(path.resolve(__dirname,'stage.html')))
    const data=['shells.json','media/clips.json','media/tracks.json','native.json'].map(n=>read(path.join(work,n)))
    const command=read(path.join(root,'examples/claude/settings.json')).hooks.Stop[0].hooks[0].command
    await page.evaluate(async ({work,root,data,command})=>{hookCommand=command;await prepare(work,root,data)},{work:url(work)+'/',root:url(root)+'/',data,command})
    if(process.env.FILM_THUMBNAIL){
      const data=await page.evaluate(()=>{thumbnail();return canvas.toDataURL('image/png').split(',')[1]})
      fs.writeFileSync(path.join(root,'launch/curbcut-launch-thumbnail.png'),Buffer.from(data,'base64'))
      return
    }
    fs.mkdirSync(path.join(work,'shots'),{recursive:true})
    const only=process.env.FILM_SHOTS?.split(',')
    for(const shot of edits){
      if(only&&!only.includes(shot.id))continue
      if(process.env.FILM_STILLS){
        await page.evaluate(async({id,frames})=>paint(id,frames*.72/30,frames/30),shot)
        const pixels=await page.evaluate(()=>canvas.toDataURL('image/jpeg',.87).split(',')[1])
        fs.writeFileSync(path.join(work,'shots',shot.id+'.jpg'),Buffer.from(pixels,'base64'))
      }else await encode(page,shot)
      console.log(shot.id,shot.frames)
    }
    const ids=shots=>shots.map(s=>s.id)
    fs.writeFileSync(path.join(work,'edits.json'),JSON.stringify({edits,launch:ids(launch),teaser,demo:ids(edits)},null,2))
  }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true})}
}
main().catch(err=>{console.error(err);process.exitCode=1})
