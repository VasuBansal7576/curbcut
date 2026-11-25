const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { execFileSync, spawnSync, spawn } = require('node:child_process')
const { pathToFileURL } = require('node:url')
const { once } = require('node:events')
const { chromium } = require('playwright')
const esbuild = require('esbuild')

const root = path.resolve(__dirname, '../../../..')
const out = path.dirname(__dirname)
const project = fs.mkdtempSync(path.join(os.tmpdir(), 'curb-opening-'))
const assets = path.join(project, 'assets')
const run = (bin, args) => execFileSync(bin, args, { maxBuffer: 8 * 1024 * 1024 })
function prepare(){
  fs.mkdirSync(assets)
  const files={
    'meridiano.jpg':'launch/film/a2/plates/meridiano.jpg',
    'jev-on.png':'launch/film/plates/jev-on.png',
    'source-mono.woff2':'site/assets/fonts/jetbrains-mono.woff2',
    'cap.webp':'launch/direction/v8/source/tab/cap.webp',
    'spring.webp':'launch/direction/v8/source/tab/spring.webp',
    'foot.webp':'launch/direction/v8/source/tab/foot.webp',
    'switch-off.png':'launch/direction/v8/source/switch-off.png',
    'switch-on.png':'launch/direction/v8/source/switch-on.png'
  }
  for(const [name,file] of Object.entries(files))fs.copyFileSync(path.join(root,file),path.join(assets,name))
  fs.copyFileSync(path.join(__dirname,'index.html'),path.join(project,'index.html'))
  fs.copyFileSync(require.resolve('gsap/dist/gsap.min.js'),path.join(project,'gsap.min.js'))
  const recording=JSON.parse(fs.readFileSync(path.join(__dirname,'capture.json'),'utf8'))
  for(const [name,meta] of Object.entries(recording)){
    const pattern=path.join(assets,name+'-%02d.jpg')
    const proc=spawnSync('ffmpeg',['-hide_banner','-nostats','-i',path.join(__dirname,name+'.mp4'),'-vf','mpdecimate=hi=300:lo=120:frac=0.15,showinfo','-fps_mode','vfr','-q:v','2',pattern],{encoding:'utf8'})
    if(proc.status!==0)throw Error(proc.stderr)
    meta.frames=[...proc.stderr.matchAll(/pts_time:([0-9.]+)/g)].map((m,i)=>({time:Number(m[1]),src:name+'-'+String(i+1).padStart(2,'0')+'.jpg'}))
    if(!meta.frames.length)throw Error('No frames for '+name)
  }
  fs.writeFileSync(path.join(project,'recording.js'),'window.recording='+JSON.stringify(recording))
  const prefix=process.env.FILM_THREE_PREFIX || project
  if(!process.env.FILM_THREE_PREFIX)run('npm',['install','--prefix',prefix,'--no-audit','--no-fund','three@0.180.0'])
  esbuild.buildSync({entryPoints:[path.join(__dirname,'stage.js')],bundle:true,outfile:path.join(project,'stage.bundle.js'),nodePaths:[path.join(prefix,'node_modules')]})
}
async function render(){
  prepare()
  if(process.argv.includes('--check')){
    const check=spawnSync('npx',['hyperframes','check',project,'--json'],{
      stdio:'inherit',env:{...process.env,PRODUCER_HEADLESS_SHELL_PATH:chromium.executablePath()}
    })
    if(check.status!==0)throw Error('HyperFrames check exited with '+check.status)
    return
  }
  const context=await chromium.launchPersistentContext(path.join(project,'profile'),{
    headless:true,channel:'chromium', viewport:{width:1920,height:1080},
    args:['--mute-audio','--allow-file-access-from-files','--enable-unsafe-swiftshader']
  })
  try{
    const page=context.pages()[0]
    page.on('pageerror',e=>console.error(e.message))
    page.on('console',m=>{if(m.type()==='error')console.error(m.text())})
    await page.goto(pathToFileURL(path.join(project,'index.html')).href)
    await page.waitForFunction(()=>window.stageReady || document.body.dataset.error)
    const error=await page.evaluate(()=>document.body.dataset.error)
    if(error)throw Error(error)
    const draw=async (frame,format)=>Buffer.from(await page.evaluate(({frame,format})=>{
      if(frame==='jev')window.futureFrame()
      else window.frameAt(frame/30)
      return document.querySelector('canvas').toDataURL(format,.94).split(',')[1]
    },{frame,format}),'base64')
    for(const [name,frame] of [['01-tab',12],['02-switch',123],['03-menu',219],['04-jev','jev']]){
      fs.writeFileSync(path.join(out,'stills',name+'.png'),await draw(frame,'image/png'))
    }
    if(process.env.FILM_STILLS_ONLY)return
    fs.writeFileSync(path.join(project,'mix.m4a'),run('git',['-C',root,'show','e340b07:launch/audio/master.m4a']))
    const picture=path.join(project,'opening.mp4')
    const enc=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-i','pipe:0','-i',path.join(project,'mix.m4a'),'-i',path.join(out,'opening.en.vtt'),'-filter_complex','[1:a]atrim=end=8.04[a];[1:a]atrim=start=73.5:end=75.5,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.04,volume=0.6dB[mix]','-map','0:v','-map','[mix]','-map','2:s','-c:s','mov_text','-metadata:s:s:0','language=eng','-metadata:s:a:0','language=eng','-t','10','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a','aac','-b:a','256k','-movflags','+faststart',picture],{stdio:['pipe','ignore','inherit']})
    const done=once(enc,'exit')
    for(let i=0;i<300;i++){
      const frame=await draw(i,'image/jpeg')
      if(!enc.stdin.write(frame))await once(enc.stdin,'drain')
    }
    enc.stdin.end()
    const [status]=await done
    if(status!==0)throw Error('FFmpeg exited with '+status)
    fs.copyFileSync(picture,path.join(out,'opening-10s.mp4'))
  }finally{await context.close()}
}
render().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>fs.rmSync(project,{recursive:true,force:true}))
