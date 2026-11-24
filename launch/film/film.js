const onset=(shot,state)=>shot.beats?.find(b=>b.state===state)?.local??Infinity
let overlays=[]
function cover(x,y,w,h){
  if(!window.current.shot.id.startsWith('teaser-'))y+=ctx.getTransform().f
  if(w>0 && h>0 && x<W && x+w>0 && y<H && y+h>0)
    overlays.push([Math.max(0,x),Math.max(0,y),Math.min(W,x+w),Math.min(H,y+h)])
}
function coverage(){
  const xs=[...new Set(overlays.flatMap(r=>[r[0],r[2]]))].sort((a,b)=>a-b)
  let area=0
  for(let i=1;i<xs.length;i++){
    let bottom=0
    for(const r of overlays.filter(r=>r[0]<xs[i] && r[2]>=xs[i]).sort((a,b)=>a[1]-b[1])){
      if(r[3]>bottom){area+=(xs[i]-xs[i-1])*(r[3]-Math.max(bottom,r[1]));bottom=r[3]}
    }
  }
  return 1-area/(W*H)
}
function laneMark(n,x,y,t){
  const labels=['Test','Write','Prove','Share']
  mono('0'+n+' / '+labels[n-1].toUpperCase(),x,y+42,40,yellow)
  for(let i=0;i<4;i++)rect(x+i*58,y+55,i===n-1?35+18*at(t,0,.28):49,6,i<n?yellow:ghost)
}
function focusRect(s,a){
  if(Array.isArray(s.focus))return s.focus
  if(s.focus==='element'){
    const {x,y,width,height}=a.element_rect
    return [x,y,width,height]
  }
  return a[s.focus]
}
function outlineTarget(rectangle,age){
  const [x,y,w,h]=rectangle
  const path=[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]
  traced(path,.76+.24*at(age,0,.12),ink,10)
  traced(path,.76+.24*at(age,0,.12),yellow,6)
  cover(x-5,y-5,w+10,10);cover(x-5,y+h-5,w+10,10)
  cover(x-5,y,10,h);cover(x+w-5,y,10,h)
}
function navigation(s,assets,t,age){
  const plate=assets[s.detail||s.asset]
  const mass=plate.url.includes('mass.edu')
  const destination=plate.key==='Enter'
  const target=destination?plate.letters.heading.bounds:plate.trigger
  const overview=mass && plate.visible && plate.focus!=='The DHE'
  const scale=destination?(mass?.70:.85):overview?.904:1.13
  const zoom=scale+(destination?.006:overview?.002:.012)*Math.sin(t*.84)
  const left=destination?90:mass?60:115
  const top=destination?203:plate.visible?(overview?12:112):345
  const offsetX=Math.round(Math.max(W-plate.img.width*zoom,Math.min(0,left-target[0]*zoom+7*Math.sin(t*.72))))
  const offsetY=Math.round(Math.max(976-plate.img.height*zoom,Math.min(0,top-target[1]*zoom+5*Math.sin(t*.65))))
  const project=([x,y,w,h])=>[offsetX+x*zoom,offsetY+y*zoom,w*zoom,h*zoom]
  ctx.drawImage(plate.img,offsetX,offsetY,plate.img.width*zoom,plate.img.height*zoom)
  const focused=destination?target:s.detail?plate.rect:s.focus?plate[s.focus]:null
  if(focused)outlineTarget(project(focused),age)
  if(destination){
    face(46,'Mono',600)
    const width=ctx.measureText(plate.url).width+46
    rect(59,321,width,66,ink);cover(59,321,width,66)
    mono(plate.url,80,368,46,yellow)
  }
  const letters=destination?[plate.letters.heading]:[plate.letters.trigger]
  if(!destination && plate.visible)letters.push(plate.letters.item)
  if(plate.focus==='Board Business')letters.push(plate.letters.active)
  window.navProof={source:s.detail||s.asset, zoom, url:plate.url, key:plate.key, focus:plate.focus,
    menuVisible:plate.visible, lettering:letters.filter(Boolean).map(({text,bounds})=>({text,region:project(bounds)}))}
  if(s.detail){
    const evidence=assets[s.asset]
    const [fx,fy,fw,fh]=s.focus
    const x=1022,y=504,w=862,h=306,z=1.25
    const sx=Math.max(0,Math.min(evidence.img.width-w/z,fx-65-5*Math.sin(t*.8)))
    const sy=Math.max(0,Math.min(evidence.img.height-h/z,fy-43))
    rect(x-5,y-60,w+10,h+65,ink)
    cover(x-5,y-60,w+10,60);cover(x-5,y,5,h+5);cover(x+w,y,5,h+5);cover(x,y+h,w,5)
    mono('KANE REPLAY  /  '+evidence.verdict+'  /  STEP '+evidence.step,x+19,y-18,31,yellow)
    ctx.drawImage(evidence.img,sx,sy,w/z,h/z,x,y,w,h)
    const proofRect=[x+(fx-sx)*z,y+(fy-sy)*z,fw*z,fh*z]
    outlineTarget(proofRect,age)
    const glyphs={
      'efcfdd9f-12':['About',[1087,130,52,24]],'efcfdd9f-13':['About',[1087,90,52,24]],
      'cb96e3af-13':['The DHE',[1089,162,59,23]],'cb96e3af-17':['About the Department of Higher Education',[477,243,613,40]],
      'ad931ab3-13':['ABOUT',[488,136,48,23]],
      'ebcd0a03-18':['Ministry of Electronics & Information Technology',[680,225,491,29]]
    }
    const [text,[gx,gy,gw,gh]]=glyphs[s.asset]
    window.navProof.kane={run:evidence.run, step:evidence.step, scale:z, text,region:[x+(gx-sx)*z,y+(gy-sy)*z,gw*z,gh*z]}

  }else if(window.current.shot.id.startsWith("teaser-"))sourceTag(s,assets)
}
function sourceTag(s,assets){
  const a=assets[s.inset||s.asset]
  let text=a.run?'Kane CLI · run '+a.run.slice(0,8)+' · step '+a.step+' · '+a.verdict:'Curb Cut extension · Chromium recording'
  if(s.inset)text='Chromium · inset: '+text
  if(s.panel?.startsWith('report'))text+=' · extension inset'
  face(40,'Overpass',680)
  const w=ctx.measureText(text).width+52, x=W-w-35,y=20
  rect(x,y,w,62,ink);cover(x,y,w,62)
  rect(x,y,8,62,a.verdict==='FAIL'?red:yellow)
  print(text,x+26,y+44,40,white,'Overpass',680)
}
function slugTitle(s,t){
  const size=118
  face(size)
  const tw=ctx.measureText(s.headline).width
  const lane=s.lane?268:0
  const w=tw+68+lane, y=!s.nav&&(s.focus?.[1]>840||s.asset==='f1123b3e-5')?137:825
  ctx.save()
  if(s.nav)ctx.translate(W-w-72,0)
  rect(36,y,w,133,ink);cover(s.nav?W-w-36:36,y,w,133)
  if(s.fail)stripes(36,y,14,133,t*42)
  else rect(36,y,12,133,yellow)
  if(s.lane)laneMark(s.lane,66,y+25,t)
  print(s.headline,65+lane,y+104,size,s.pass||s.retire?yellow:white)
  ctx.restore()
  if(s.retire||s.peel){
    const progress=s.peel?1-at(t,0,.6):.35+.65*at(t,0,.21)
    if(progress>.01){
      ctx.save();ctx.translate(1170,575);ctx.rotate(-.055)
      cut(0,0,510*progress,150,()=>{
        rect(0,0,510,150,asphalt)
        print('RETIRED',26,116,124,yellow)
        for(let i=0;i<4;i++)rect(92+i*88,35,5,82,ink)
      });ctx.restore();cover(1165,540,530*progress,192)
    }
  }
}
window.fontsReady=Promise.all(['400 80px Highway','600 40px Mono','600 54px Overpass','680 40px Overpass','700 46px Overpass'].map(f=>document.fonts.load(f)))
window.startShot=async(shot,scene,assets={})=>{
  document.querySelector('video').hidden=true
  canvas.hidden=false
  for(const a of Object.values(assets)){
    const img=new Image();img.src=a.imageUrl;await img.decode();a.img=img
  }
  window.current={shot,scene,assets}
}
window.frame=(frame,format='jpeg')=>{
  const {shot,scene,assets}=window.current,t=frame/30
  const beat=shot.beats?.findLast(b=>b.local<=t+1e-8)
  const state=beat?.state,age=beat?t-beat.local:t
  overlays=[]
  window.navProof=null
  ground()
  if(!shot.id.startsWith("teaser-"))return masterFrame(shot,scene,assets,frame,format)
  const product=shot.id!=='teaser-title'
  if(product){
    const s=scene.states[state]??scene.states[scene.initial]
    navigation(s,assets,t,age)
    if(beat || shot.id==='teaser-after')slugTitle(s,age)
  }else if(state==='logo')identity(shot,age)
  else pavement(-.04)
  band(shot,t)
  window.pageShare=product?coverage():null
  return canvas.toDataURL('image/'+format,.985).split(',')[1]
}
