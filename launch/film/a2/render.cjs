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
const calculator = 'proof/kane/calculator-net-add-days/'
const delivered = read(path.join(launch,'footage/manifest.json')).slots
const worms = 'proof/heldout-v5/kane-rerun-50/v5-c22b9bdca86b-71a63d77/'
const reels = {
  chapter:[calculator+'2026-11-21T19-46-40.781Z/control',3],
  calcMouse:[calculator+'2026-11-21T19-46-40.781Z/control',9],
  calcKeys:[calculator+'runtime-replay/attempt-1/after',62],
  trust:[worms+'after',60],shortcut:[worms+'before',68],
  install:[worms+'after',66]
}
const shopReplays = {
  check:[['before',76,4.5,'Keyboard · before'],['control',54,2.5,'Mouse control'],['after',100,5,'Keyboard · first repair']],
  gate:[['fail',115,6,'Keyboard · original source'],['pass',116,5,'Keyboard · source fixed']],
  retire:[['without',54,8,'Keyboard · patch disabled']]
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
    for(const shot of edit.filter(s=>s.start>=75)){
      const folder=path.join(work,shot.id)
      fs.mkdirSync(folder)
      const slot=pending.find(s=>s.id===shot.id)
      const incoming=slot&&path.join(root,slot.path)
      const deliveredSlot=delivered[shot.id]
      const replayFrames=[]
      if(deliveredSlot){
        for(const [key,start,duration,label] of shopReplays[shot.id]){
          const replayFolder=path.join(folder,key)
          fs.mkdirSync(replayFolder)
          ff(['-ss',String(start),'-i',path.join(root,deliveredSlot.kaneRecordings[key]),'-t',String(duration),'-vf','fps=30','-q:v','2',path.join(replayFolder,'%04d.jpg')])
          const names=fs.readdirSync(replayFolder).sort()
          if(names.length!==duration*30)throw Error('Short Kane recording: '+key)
          replayFrames.push(...names.map(name=>({url:uri(path.join(replayFolder,name)),label})))
        }
        if(replayFrames.length!==shot.duration*30)throw Error('Replay duration mismatch: '+shot.id)
      }
      let source,offset=0
      if(deliveredSlot){
        source=path.join(root,deliveredSlot.file)
      }else if(incoming&&fs.existsSync(incoming)){
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
      const encoded=await page.evaluate(async ({shot,frames,replayFrames})=>{
        const chunks=[]
        let error
        const enc=new VideoEncoder({output:chunk=>{const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(bytes)},error:e=>{error=String(e)}})
        enc.configure({codec:'avc1.42002a',width:1920,height:1080,framerate:30,bitrate:7300000,latencyMode:'realtime',avc:{format:'annexb'}})
        try{
          for(let i=0;i<shot.duration*30;i++){
            const recording=frames?await img(frames[i]):null
            if(replayFrames.length){
              const replay=replayFrames[i]
              drawShopRun(recording,await img(replay.url),replay.label)
            }else{
              await drawShot(shot,i/30,recording)
            }
            const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1000000/30),duration:Math.round(1000000/30)})
            enc.encode(frame,{keyFrame:i%60===0});frame.close()
            if(enc.encodeQueueSize>5)await enc.flush()
            if(error)throw Error(error)
          }
          await enc.flush()
        }finally{enc.close()}
        const blob=new Blob(chunks)
        return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob)})
      },{shot,frames,replayFrames})
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
    const opening=path.join(work,'opening.mp4')
    ff(['-i',path.join(launch,'curbcut-launch.mp4'),'-map','0:v:0','-an','-c:v','copy',opening])
    fs.writeFileSync(list,"file 'opening.mp4'\nduration 75\nfile 'master.mp4'\n")
    const seconds=edit.at(-1).start+edit.at(-1).duration
    ff(['-f','concat','-safe','0','-i',list,'-i',path.join(launch,'audio/demo.m4a'),'-i',path.join(launch,'captions/demo.vtt'),'-map','0:v:0','-map','1:a:0','-map','2:s:0','-t',String(seconds),'-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=eng','-movflags','+faststart',path.join(target,'curbcut-demo.mp4')])
  }finally{
    if(context)await context.close()
    fs.rmSync(work,{recursive:true,force:true})
  }
}
main().catch(error=>{console.error(error);process.exitCode=1})
