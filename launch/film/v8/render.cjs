const fs=require('node:fs')
const path=require('node:path')
const os=require('node:os')
const {pathToFileURL}=require('node:url')
const {execFileSync}=require('node:child_process')
const {chromium}=require('playwright')
const work=process.env.FILM_CACHE
if(!work)throw Error('Set FILM_CACHE to the prepared media directory’s parent.')
const ff=args=>execFileSync('ffmpeg',['-v','error','-y',...args],{stdio:'inherit'})
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'))
const opening=[['establish',0],['closed',12],['switch',90],['opened',150],['people',255],['mouse',330],['unnamed',395],['faint',440],['million',480],['wait',660],['extension',825],['reader',945],['contrast',1095],['kane',1185],['total',1560],['jev',1710],['owner',1935],['endcard',2070]]
const shots=opening.map(([id,start],i)=>({id,start,frames:(opening[i+1]?.[1]??2265)-start}))
const chapter=read(path.join(__dirname,'chapter-timing.json'))
for(const row of chapter)shots.push({id:row.id,start:2265+row.start*30,frames:row.duration*30,chapter:true,duration:row.duration})
async function main(){
  const dir=path.join(work,'picture')
  fs.mkdirSync(dir,{recursive:true})
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'curbcut-film-chromium-'))
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1920,height:1080},args:['--mute-audio','--allow-file-access-from-files']})
  try{
    const page=context.pages()[0]
    await page.goto(pathToFileURL(path.join(__dirname,'stage.html')).href)
    await page.evaluate(async ({directory,lengths,tracks})=>{await load(directory,lengths,tracks);detailInk()},{
      directory:pathToFileURL(path.join(work,'media')).href+'/',lengths:read(path.join(work,'media/clips.json')),tracks:read(path.join(work,'media/tracks.json'))})
    await page.evaluate(()=>thumbnail())
    const thumbnail=await page.locator('canvas').screenshot()
    fs.writeFileSync(path.resolve(__dirname,'../../curbcut-launch-thumbnail.png'),thumbnail)
    for(const shot of shots){
      if(process.env.SHOTS&&!process.env.SHOTS.split(',').includes(shot.id))continue
      const base=path.join(dir,String(shot.start).padStart(5,'0')+'-'+shot.id)
      if(process.env.FILM_RESUME&&fs.existsSync(base+'.mp4')&&!process.env.SHOTS)continue
      const encoded=await page.evaluate(async shot=>{
        const chunks=[]
        let failure
        const enc=new VideoEncoder({output:c=>{const b=new Uint8Array(c.byteLength);c.copyTo(b);chunks.push(b)},error:e=>failure=e})
        enc.configure({codec:'avc1.42002a',width:1920,height:1080,framerate:30,bitrate:8500000,latencyMode:'realtime',avc:{format:'annexb'}})
        try{
          for(let i=0;i<shot.frames;i++){
            await picture(shot,i/30)
            const f=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/30),duration:33333})
            enc.encode(f,{keyFrame:i%60===0});f.close()
            if(enc.encodeQueueSize>6)await enc.flush()
            if(failure)throw failure
          }
          await enc.flush()
        }finally{enc.close()}
        return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(chunks))})
      },shot)
      fs.writeFileSync(base+'.264',Buffer.from(encoded,'base64'))
      ff(['-r','30','-i',base+'.264','-c:v','copy','-video_track_timescale','30000',base+'.mp4'])
      fs.unlinkSync(base+'.264')
      console.log(shot.id,shot.frames)
    }
    for(const [name,selection] of [['launch',shots.filter(s=>!s.chapter)],['teaser',shots.filter(s=>s.start<255||s.id==='endcard')],['demo',shots]]){
      fs.writeFileSync(path.join(work,name+'.txt'),selection.map(s=>"file '"+path.join(dir,String(s.start).padStart(5,'0')+'-'+s.id+".mp4'")).join('\n')+'\n')
    }
  }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1})
