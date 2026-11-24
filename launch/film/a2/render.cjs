const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const {pathToFileURL} = require('node:url')
const {execFileSync} = require('node:child_process')
const {chromium} = require('playwright')
const root = path.resolve(__dirname,'../../..')
const launch = path.join(root,'launch')
const read = file => JSON.parse(fs.readFileSync(file,'utf8'))
const edit = read(path.join(__dirname,'edit.json'))
const pending = read(path.join(launch,'film/pending.json')).shots
const mass = 'proof/hard-v4/kane/v4-86f207deeb57-7bc09a21/'
const unit = 'proof/kane/unitconverters-length/'
const reels = {
  mouse:[mass+'control',60],fail:[mass+'before',92],keyboard:[mass+'before',88],
  pointer:[mass+'control',59],keyboardpass:[mass+'attempt-1/after',79],
  unitfail:[unit+'2026-11-22T10-52-45.985Z/recheck-without',14],
  unitpass:[unit+'2026-11-22T11-06-33.087Z/attempt-1/after',17]
}
const ff = args => execFileSync('ffmpeg',['-y','-v','error',...args],{stdio:'inherit'})
const uri = name => pathToFileURL(name).href
const assets = Object.fromEntries(Object.entries({
  massBefore:'a2/plates/mass-before.jpg',massAfter:'a2/plates/mass-after.jpg',
  meridiano:'a2/plates/meridiano.jpg',munich:'a2/plates/munich.jpg',report:'plates/owner-report.png',contrastOff:'plates/contrast-off.png',contrastOn:'plates/contrast-on.png'
}).map(([name,file])=>[name,uri(path.join(launch,'film',file))]))
async function main(){
  const work=fs.mkdtempSync(path.join(process.env.FILM_CACHE||os.tmpdir(),'a2-render-'))
  const target=process.env.FILM_OUTPUT||launch
  fs.mkdirSync(target,{recursive:true})
  let context
  try{
    context=await chromium.launchPersistentContext(path.join(work,'profile'),{headless:true,channel:'chromium',viewport:{width:1920,height:1080},args:['--mute-audio','--allow-file-access-from-files']})
    const page=context.pages()[0]
    await page.goto(uri(path.join(__dirname,'stage.html')))
    await page.evaluate(async ({assets,cues})=>{window.cues=cues;await loadFilm(assets)},{assets,cues:read(path.join(__dirname,'speech.json'))})
    const segments=[]
    for(const shot of edit){
      const folder=path.join(work,shot.id)
      fs.mkdirSync(folder)
      const slot=pending.find(s=>s.id===shot.id)
      const incoming=slot&&path.join(root,slot.path)
      let source,offset=0
      if(incoming&&fs.existsSync(incoming)){
        source=incoming
        shot.incoming=true
      }else if(reels[shot.id]){
        source=path.join(root,reels[shot.id][0],'recording.mp4')
        offset=reels[shot.id][1]
      }
      let frames=null
      if(source){
        ff(['-ss',String(offset),'-i',source,'-t',String(shot.duration),'-an','-vf','fps=30','-q:v','2',path.join(folder,'%04d.jpg')])
        frames=fs.readdirSync(folder).filter(n=>n.endsWith('.jpg')).sort().map(n=>uri(path.join(folder,n)))
        if(frames.length!==shot.duration*30)throw Error('Expected '+shot.duration*30+' frames for '+shot.id+', got '+frames.length)
      }
      const stream=path.join(folder,'picture.h264')
      const encoded=await page.evaluate(async ({shot,frames})=>{
        const chunks=[]
        let error
        const enc=new VideoEncoder({output:chunk=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(bytes)},error:e=>{error=String(e)}})
        enc.configure({codec:'avc1.42002a',width:1920,height:1080,framerate:30,bitrate:7300000,latencyMode:'realtime',avc:{format:'annexb'}})
        try{
          for(let i=0;i<shot.duration*30;i++){
            const recording=frames?await img(frames[i]):null
            await drawShot(shot,i/30,recording)
            const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1000000/30),duration:Math.round(1000000/30)})
            enc.encode(frame,{keyFrame:i%60===0});frame.close()
            if(enc.encodeQueueSize>5)await enc.flush()
            if(error)throw Error(error)
          }
          await enc.flush()
        }finally{enc.close()}
        const blob=new Blob(chunks)
        return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)})
      },{shot,frames})
      fs.writeFileSync(stream,Buffer.from(encoded,'base64'))
      const segment=path.join(work,shot.id+'.mp4')
      ff(['-r','30','-i',stream,'-c:v','copy','-video_track_timescale','30000',segment])
      segments.push(segment)
      fs.rmSync(folder,{recursive:true,force:true})
      console.log(shot.id,shot.duration)
    }
    const list=path.join(work,'sequence.txt')
    fs.writeFileSync(list,segments.map(s=>"file '"+s.replaceAll("'","'\\''")+"'").join('\n')+'\n')
    const master=path.join(work,'master.mp4')
    ff(['-f','concat','-safe','0','-i',list,'-an','-c:v','libx264','-preset','fast','-crf','19','-threads','5','-bf','0','-pix_fmt','yuv420p','-force_key_frames','15,75',master])
    for(const [name,cap,duration] of [['curbcut-demo','demo',edit.reduce((sum,shot)=>sum+shot.duration,0)],['curbcut-launch','launch',75],['curbcut-launch-15s','teaser',15]]){
      ff(['-i',master,'-i',path.join(launch,'audio/demo.m4a'),'-i',path.join(launch,'captions',cap+'.vtt'),'-map','0:v:0','-map','1:a:0','-map','2:s:0','-t',String(duration),'-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=eng','-movflags','+faststart',path.join(target,name+'.mp4')])
    }
  }finally{
    if(context)await context.close()
    fs.rmSync(work,{recursive:true,force:true})
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})
