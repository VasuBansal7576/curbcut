import assert from 'node:assert/strict'
import {execFileSync, spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {once} from 'node:events'
import {existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {chromium} from 'playwright'
import './edit.mjs'
import {geometry} from './geometry.mjs'
import {initial, states, shopRules, study} from './story.mjs'

const launch=fileURLToPath(new URL('../',import.meta.url))
const work=process.env.FILM_CACHE || '/private/tmp/curbcut-v5-build'
const audio=path.join(launch,'audio')
const file=name=>path.join(work,name)
const read=p=>JSON.parse(readFileSync(p))
const run=(cmd,args)=>execFileSync(cmd,args,{stdio:['ignore','inherit','inherit']})
const python=process.env.FILM_PYTHON || 'python3'
const cuts=read(path.join(launch,'film/word-times.json'))
const beats=read(path.join(launch,'film/beats.json'))
const slug=w=>w.toLowerCase().replace(/^[\W_]+|[\W_]+$/g,'')
const names={master:'curbcut-launch.mp4',teaser:'curbcut-launch-15s.mp4'}
mkdirSync(work,{recursive:true})

function buildShot(cut,shot){
  const words=shot.cues.flatMap(c=>c.words), highlights=[]
  const localBeats=beats.filter(b=>b.cut===cut&&b.scene===shot.id).map(b=>{
    const phase=b.word.toLowerCase().split(' ')
    const index=words.findIndex(([,stamp])=>stamp===b.local)
    assert.ok(phase.every((p,i)=>slug(words[index+i]?.[0]??'')===p),b.word)
    assert.ok(index>=0,b.word)
    const local=words[index][1]
    assert.ok(Math.abs(shot.frame/30+local-b.wordStart)<.00001,b.word)
    for(const [w,t] of words.slice(index,index+phase.length))if(!['a','of','be'].includes(slug(w)))highlights.push(t)
    return {state:b.state,local,still:b.still}
  })
  return {...shot,beats:localBeats,highlights}
}
function prepare(shot,index){
  const selected=[initial[shot.id],...shot.beats.map(b=>b.state)].filter(k=>states[k])
  const used=Object.fromEntries(selected.map(k=>[k,states[k]]))
  const plates={}
  for(const s of Object.values(used))for(const key of [s.asset,s.panel,s.inset,s.detail].filter(Boolean)){
    const data=readFileSync(path.join(launch,'film/plates',index[key].file))
    plates[key]={...index[key],imageUrl:'data:image/'+(index[key].file.endsWith('.jpg')?'jpeg':'png')+';base64,'+data.toString('base64')}
  }
  return {scene:{states:used,initial:initial[shot.id],shopRules,study},plates}
}
async function encode(page,shot){
  const encoder=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-an',
    '-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p','-c:v','libx264','-threads','4','-preset','slow',
    '-crf','15','-tune','grain','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-video_track_timescale','30000',file(shot.id+'.mp4')],{stdio:['pipe','ignore','inherit']})
  const exited=once(encoder,'close')
  let minimum=1
  const navBeats=[]
  const reviewFrames=new Map(shot.beats.map(b=>[Math.min(shot.frames-1,Math.ceil(b.local*30-1e-8)+3),b.state]))
  try{
    for(let f=0;f<shot.frames;f++){
      const [image,share,nav]=await page.evaluate(([n,review])=>[window.frame(n),window.pageShare,review?window.navProof:null],[f,reviewFrames.has(f)])
      if(nav)navBeats.push({state:reviewFrames.get(f),frame:shot.frame+f,...nav})
      if(share!==null)minimum=Math.min(minimum,share)
      const buffer=Buffer.from(image,'base64')
      if(!encoder.stdin.write(buffer))await once(encoder.stdin,'drain')
    }
  }finally{encoder.stdin.end()}
  assert.equal((await exited)[0],0,shot.id)
  writeFileSync(file(shot.id+'-coverage.json'),JSON.stringify(minimum))
  if(navBeats.length)writeFileSync(file(shot.id+'-nav.json'),JSON.stringify(navBeats))
}
async function render(stillsOnly=false){
  const index=read(path.join(launch,'film/plates/index.json'))
  const browser=await chromium.launch({headless:true,args:['--mute-audio']})
  const design=createHash('sha256')
  for(const name of ['film/master.js','film/drawing.js','film/graphics.js','film/film.js','film/index.html','film/film.css','scripts/render.mjs','scripts/story.mjs','film/fonts/Overpass.ttf','film/fonts/JetBrainsMono.ttf','film/fonts/BarlowCondensed-ExtraBold.ttf'])design.update(readFileSync(path.join(launch,name)))
  const version=design.digest('hex')
  try{
    const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,offline:true})
    const shots=Object.entries(cuts).flatMap(([cut,rows])=>rows.map(s=>buildShot(cut,s)))
    const worker=async()=>{
      const page=await context.newPage()
      await page.goto(pathToFileURL(path.join(launch,'film/index.html')).href)
      assert.ok(await page.evaluate(async()=>{await window.fontsReady;return [...document.fonts].every(f=>f.status==='loaded')}))
      for(let shot;(shot=shots.shift());){
        if(process.env.FILM_SCENES && !process.env.FILM_SCENES.split(',').includes(shot.id))continue
        const {scene,plates}=prepare(shot,index)
        const hash=createHash('sha256').update(version).update(JSON.stringify([shot,scene,plates])).digest('hex')
        const signature=file(shot.id+'.sha256')
        if(!stillsOnly&&existsSync(signature)&&existsSync(file(shot.id+'.mp4'))&&readFileSync(signature,'utf8')===hash)continue
        await page.evaluate(args=>window.startShot(...args),[shot,scene,plates])
        const selected=shot.beats.filter(b=>b.still)
        assert.equal(selected.length,1,shot.id)
        const [b]=selected
        const stillFrame=Math.min(shot.frames-1,shot.id.startsWith('teaser-')?Math.ceil(b.local*30-1e-8)+3:Math.floor((b.local+(shot.beats[shot.beats.indexOf(b)+1]?.local??shot.frames/30))*15))
        const pixels=await page.evaluate(f=>window.frame(f,'png'),stillFrame)
        mkdirSync(file('references'),{recursive:true})
        writeFileSync(file('references/'+b.still+'.png'),Buffer.from(pixels,'base64'))
        if(stillsOnly)continue
        await encode(page,shot)
        writeFileSync(signature,hash)
        console.log('Rendered',shot.id)
      }
      return page
    }
    const [page]=await Promise.all(Array.from({length:3},worker))
    await page.evaluate(study=>window.startShot({id:'thumbnail',cues:[],frames:180},{study}),study)
    writeFileSync(path.join(launch,'curbcut-launch-thumbnail.png'),Buffer.from(await page.evaluate(()=>window.frame(100,'png')),'base64'))
  }finally{await browser.close()}
  if(!stillsOnly&&!process.env.FILM_SCENES)mux()
}
function mux(){
  for(const [cut,shots] of Object.entries(cuts)){
    if(cut==='teaser' && existsSync(path.join(launch,names.teaser)))continue
    const list=file(cut+'-list.txt')
    writeFileSync(list,shots.map(s=>"file '"+s.id+".mp4'\nduration "+(s.frames/30).toFixed(6)).join('\n')+'\n')
    const output=path.join(launch,names[cut]),pending=output+'.'+process.pid+'.mp4'
    try{
      run('ffmpeg',['-v','error','-y','-f','concat','-safe','1','-i',list,'-i',path.join(audio,cut+'.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',pending])
      renameSync(pending,output)
    }finally{rmSync(pending,{force:true})}
  }
}
async function measureGeometry(){
  const browser=await chromium.launch({headless:true,args:['--mute-audio']})
  try{
    const page=await browser.newPage({offline:true,viewport:{width:1920,height:1080}})
    await page.goto(pathToFileURL(path.join(launch,'film/index.html')).href)
    await page.evaluate(()=>window.fontsReady)
    const index=read(path.join(launch,'film/plates/index.json'))
    const rows=Object.entries(cuts).flatMap(([cut,shots])=>shots.filter(s=>initial[s.id]).map(s=>{
      const shot=buildShot(cut,s)
      return {shot,...prepare(shot,index)}
    }))
    const result=await geometry(page,rows)
    writeFileSync(path.join(launch,'out/geometry.json'),JSON.stringify(result,null,2)+'\n')
    console.log('Measured native scale and visible source area across',rows.length,'product scenes.')
  }finally{await browser.close()}
}
if(process.argv[2]==='check'){
  for(const [cut,shots] of Object.entries(cuts))for(const s of shots)buildShot(cut,s)
  console.log('Verified',beats.length,'word-linked events')
}else if(process.argv[2]==='geometry')await measureGeometry()
else if(process.argv[2]==='verify'){
  await measureGeometry()
  run(python,[path.join(launch,'scripts/sync-check.py')])
  run(python,[path.join(launch,'scripts/verify.py')])
  run(python,[path.join(launch,'scripts/nav-check.py')])
  run(python,[path.join(launch,'scripts/beat-stills.py')])
}else if(!process.argv[2]||process.argv[2]==='render')await render()
else if(process.argv[2]==='stills')await render(true)
else if(process.argv[2]==='mux')mux()
else throw Error('Use render, mux, stills, check or verify.')
