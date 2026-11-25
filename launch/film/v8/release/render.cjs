const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {execFileSync}=require('node:child_process')
const {pathToFileURL}=require('node:url')
const {chromium}=require('playwright')
const baseShots=require('../problem-first/shots.json')
const timing=require('./timing.json')
const insertion=Object.keys(timing).slice(0,11)
let at=2973
const shots=baseShots.filter(s=>s[0]<2973).map(([start,id])=>({start,id}))
for(const id of insertion){shots.push({start:at,id});at+=timing[id].frames}
const tailStart=at
for(const [start,id] of baseShots.filter(s=>s[0]>=3156))shots.push({start:tailStart+start-3156,id})
const end=tailStart+3559-3156
shots.push({start:end-50,id:'signoff'})
const launchShots=shots.slice()
at=end
for(const id of Object.keys(timing).slice(11)){shots.push({start:at,id});at+=timing[id].frames}
const extent=at
const developerShots=shots.slice(launchShots.length)
shots.push({start:extent,id:"chapterReport"})
const work=process.env.FILM_CACHE
if(!work)throw Error('FILM_CACHE must contain the prepared recordings.')
const root=path.resolve(__dirname,'../../../..')
const out=path.join(work,'segments')
fs.mkdirSync(out,{recursive:true})
const json=file=>JSON.parse(fs.readFileSync(file))
const url=p=>pathToFileURL(p).href
const run=args=>execFileSync('ffmpeg',['-y','-v','error',...args],{stdio:'inherit'})
async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'curbcut-review-'))
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',
    args:['--mute-audio','--allow-file-access-from-files']})
  try{
    const page=context.pages()[0]
    await page.goto(url(path.resolve(__dirname,'../stage.html')))
    await page.addScriptTag({path:path.join(__dirname,'../problem-first/picture.js')})
    await page.addScriptTag({path:path.join(__dirname,'ocean.js')})
    const media=path.join(work,'media')
    const patch=json(path.join(root,'proof/demo/check/2026-11-24T18-15-53.859Z/attempt-1/candidate.json'))
    await page.evaluate(async ({media,lengths,tracks,selector})=>{
      canvas.width=1920;canvas.height=1080
      await load(media,lengths,tracks);await previewAssets();detailInk()
      document.documentElement.dataset.selector=selector
    },{media:url(media)+'/',lengths:json(path.join(media,'clips.json')),tracks:json(path.join(media,'tracks.json')),selector:patch.observedSelector})
    for(let i=0;i<shots.length;i++){
      const {start,id}=shots[i],next=shots[i+1]?.start??(extent+315)
      const picture=path.join(out,id+'.264')
      const finished=path.join(out,id+'.mp4')
      if(process.env.FILM_RESUME&&fs.existsSync(finished))continue
      const bytes=await page.evaluate(async ({start,id,next})=>{
        const buffers=[]
        let failure
        const enc=new VideoEncoder({output:chunk=>{const b=new Uint8Array(chunk.byteLength);chunk.copyTo(b);buffers.push(b)},error:e=>failure=e})
        enc.configure({codec:'avc1.42002a',width:canvas.width,height:canvas.height,framerate:30,bitrate:8500000,latencyMode:'realtime',avc:{format:'annexb'}})
        try{
          for(let frame=start;frame<next;frame++){
            if(!await oceanFrame(id,frame-start,next-start))await previewFrame([start,id],frame,next)
            const img=new VideoFrame(canvas,{timestamp:Math.round(frame*1e6/30),duration:33333})
            enc.encode(img,{keyFrame:(frame-start)%60===0});img.close()
            if(enc.encodeQueueSize>6)await enc.flush()
            if(failure)throw failure
          }
          await enc.flush()
        }finally{enc.close()}
        return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(buffers))})
      },{start,id,next})
      fs.writeFileSync(picture,Buffer.from(bytes,'base64'))
      run(['-r','30','-i',picture,'-c:v','copy','-video_track_timescale','30000',finished])
      fs.unlinkSync(picture)
      console.log(id,next-start)
    }
    await page.evaluate(()=>oceanThumbnail())
    fs.writeFileSync(path.join(root,'launch/curbcut-launch-thumbnail.png'),await page.locator('canvas').screenshot())
    fs.writeFileSync(path.join(work,'cuts.json'),JSON.stringify({launch:launchShots,developer:developerShots,end,extent}))
  }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true})}
}
main().catch(error=>{console.error(error);process.exitCode=1})
