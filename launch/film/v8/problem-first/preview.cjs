const fs=require('node:fs')
const os=require('node:os')
const path=require('node:path')
const {execFileSync}=require('node:child_process')
const {pathToFileURL}=require('node:url')
const {chromium}=require('playwright')
const shots=require('./shots.json')
const work=process.env.FILM_CACHE
if(!work)throw Error('FILM_CACHE must contain the prepared recordings.')
const root=path.resolve(__dirname,'../../../..')
const out=path.join(root,'launch/direction/v8/problem-first')
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
    await page.addScriptTag({path:path.join(__dirname,'picture.js')})
    const media=path.join(work,'media')
    const patch=json(path.join(root,'proof/demo/check/2026-11-24T18-15-53.859Z/attempt-1/candidate.json'))
    await page.evaluate(async ({media,lengths,tracks,selector})=>{
      canvas.width=854;canvas.height=480
      await load(media,lengths,tracks);await previewAssets();detailInk()
      document.documentElement.dataset.selector=selector
    },{media:url(media)+'/',lengths:json(path.join(media,'clips.json')),tracks:json(path.join(media,'tracks.json')),selector:patch.observedSelector})
    const picture=path.join(work,'preview.264')
    fs.writeFileSync(picture,'')
    for(let i=0;i<shots.length;i++){
      const shot=shots[i],next=shots[i+1]?.[0]??3559
      const bytes=await page.evaluate(async ({shot,next})=>{
        const buffers=[]
        let failure
        const enc=new VideoEncoder({output:chunk=>{const b=new Uint8Array(chunk.byteLength);chunk.copyTo(b);buffers.push(b)},error:e=>failure=e})
        enc.configure({codec:'avc1.42001f',width:canvas.width,height:canvas.height,framerate:30,bitrate:1850000,latencyMode:'realtime',avc:{format:'annexb'}})
        try{
          for(let frame=shot[0];frame<next;frame++){
            await previewFrame(shot,frame,next)
            const img=new VideoFrame(canvas,{timestamp:Math.round(frame*1e6/30),duration:33333})
            enc.encode(img,{keyFrame:(frame-shot[0])%60===0});img.close()
            if(enc.encodeQueueSize>6)await enc.flush()
            if(failure)throw failure
          }
          await enc.flush()
        }finally{enc.close()}
        return new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(buffers))})
      },{shot,next})
      fs.appendFileSync(picture,Buffer.from(bytes,'base64'))
      console.log(shot[1],next-shot[0])
    }
    run(['-r','30','-i',picture,'-i',path.join(out,'launch-audio.m4a'),'-i',path.join(out,'launch.vtt'),
      '-map','0:v','-map','1:a','-map','2:s','-c','copy','-c:s','mov_text','-metadata:s:s:0','language=eng',
      '-disposition:s:0','0','-movflags','+faststart',path.join(out,'launch-preview.mp4')])
  }finally{await context.close();fs.rmSync(profile,{recursive:true,force:true})}
}
main().catch(error=>{console.error(error);process.exitCode=1})
