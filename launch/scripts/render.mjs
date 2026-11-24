import assert from 'node:assert/strict'
import {execFileSync,spawn} from 'node:child_process'
import {once} from 'node:events'
import {mkdirSync,readFileSync,renameSync,rmSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {chromium} from 'playwright'
import {beats,cuts} from './edit.mjs'
import {platesByState} from './story.mjs'

const root=fileURLToPath(new URL('../',import.meta.url))
const work=process.env.FILM_CACHE || '/private/tmp/curbcut-film'
const python=process.env.FILM_PYTHON || 'python3'
const file=name=>path.join(work,name)
const destination=process.env.FILM_OUTPUT || root
mkdirSync(destination,{recursive:true})
const colors=JSON.parse(readFileSync(path.join(root,'../core/brand-palette.json')))
const names={master:'curbcut-launch.mp4',teaser:'curbcut-launch-15s.mp4'}
const index=JSON.parse(readFileSync(path.join(root,'film/plates/index.json')))
mkdirSync(work,{recursive:true})
const run=(cmd,args)=>execFileSync(cmd,args,{stdio:['ignore','inherit','inherit']})
const rows=Object.values(cuts).flat().map(shot=>({...shot,beats:beats.filter(b=>b.scene===shot.id).map(b=>({...b,asset:platesByState[b.state]}))}))

function assets(shot){
  const plates={}
  const sources=shot.beats.map(b=>b.asset)
  for(const asset of [...sources]){
    const detail=index[asset]?.magnifierSource
    if(detail)sources.push(detail)
  }
  for(const asset of sources){
    if(!asset||plates[asset])continue
    const record=index[asset],source=path.join(root,'film/plates',record.file)
    if(record.file.endsWith('.mp4')){
      const [x,y,w,h]=record.clip.crop
      const filter='fps=12,crop='+[w,h,x,y].join(':')+',format=gray,tile=5x6'
      const atlas=execFileSync('ffmpeg',['-v','error','-ss',String(record.clip.start),'-i',source,'-t',String(record.clip.seconds),'-vf',filter,'-frames:v','1','-c:v','png','-f','image2pipe','-'],{maxBuffer:32*1024*1024})
      plates[asset]={...record,imageUrl:'data:image/png;base64,'+atlas.toString('base64')}
    }else{
      const data=readFileSync(source)
      plates[asset]={...record,imageUrl:'data:image/'+(record.file.endsWith('.jpg')?'jpeg':'png')+';base64,'+data.toString('base64')}
    }
  }
  return plates
}
async function encode(page,shot){
  const encoder=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-an',
    '-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-threads','4','-preset','fast','-crf','15',
    '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-video_track_timescale','30000',file(shot.id+'.mp4')],{stdio:['pipe','ignore','inherit']})
  const exited=once(encoder,'close')
  let maximum=0
  try{
    for(let i=0;i<shot.frames;i++){
      const [data,scale]=await page.evaluate(i=>[window.frame(i),window.sourceScale],i)
      maximum=Math.max(maximum,scale)
      if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain')
    }
  }finally{encoder.stdin.end()}
  assert.equal((await exited)[0],0)
  writeFileSync(file(shot.id+'-scale.json'),JSON.stringify(maximum))
}
function mux(){
  for(const [cut,shots] of Object.entries(cuts)){
    const list=file(cut+'-list.txt'),output=path.join(destination,names[cut]),pending=output+'.pending.mp4'
    writeFileSync(list,shots.map(s=>"file '"+s.id+".mp4'\nduration "+(s.frames/30).toFixed(7)).join('\n')+'\n')
    try{
      run('ffmpeg',['-v','error','-y','-f','concat','-safe','1','-i',list,'-i',path.join(root,'audio',cut+'.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',pending])
      renameSync(pending,output)
    }finally{rmSync(pending,{force:true})}
  }
  const scales=Object.fromEntries(rows.map(s=>[s.id,JSON.parse(readFileSync(file(s.id+'-scale.json')))]))
  mkdirSync(path.join(destination,'out'),{recursive:true})
  writeFileSync(path.join(destination,'out/geometry.json'),JSON.stringify(scales,null,2)+'\n')
}
async function render(){
  const browser=await chromium.launch({channel:'chromium',headless:true,args:['--mute-audio']})
  try{
    const context=await browser.newContext({offline:true,viewport:{width:1920,height:1080}})
    await context.addInitScript(colors=>{window.brandPalette=colors},colors)
    const queue=rows.filter(s=>!process.env.FILM_SCENES||process.env.FILM_SCENES.split(',').includes(s.id))
    const worker=async()=>{
      const page=await context.newPage()
      await page.goto(pathToFileURL(path.join(root,'film/index.html')).href)
      await page.evaluate(()=>window.fontsReady)
      for(let shot;(shot=queue.shift());){
        await page.evaluate(args=>window.startShot(...args),[shot,assets(shot)])
        await encode(page,shot)
        console.log('Rendered',shot.id)
      }
      return page
    }
    const [page]=await Promise.all(Array.from({length:3},worker))
    await page.evaluate(()=>window.startShot({beats:[{state:'thumbnail',local:0}]}))
    writeFileSync(path.join(destination,'curbcut-launch-thumbnail.png'),Buffer.from(await page.evaluate(()=>window.frame(60,'png')),'base64'))
  }finally{await browser.close()}
  if(!process.env.FILM_SCENES)mux()
}
const action=process.argv[2]??'render'
if(action==='verify'){
  run(python,[path.join(root,'scripts/sync-check.py')])
  run(python,[path.join(root,'scripts/verify.py')])
}else if(action==='mux')mux()
else if(action==='render')await render()
else throw Error('Use render, mux or verify')
