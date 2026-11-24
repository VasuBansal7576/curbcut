const onset=(shot,state)=>shot.beats?.find(b=>b.state===state)?.local??Infinity
let overlays=[]
function cover(x,y,w,h){overlays.push([Math.max(0,x),Math.max(0,y),Math.min(W,x+w),Math.min(H,y+h)])}
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
    rect(x-5,y-111,w+10,h+116,ink)
    cover(x-5,y-111,w+10,111);cover(x-5,y,5,h+5);cover(x+w,y,5,h+5);cover(x,y+h,w,5)
    print('Chromium page · Kane CLI inset',x+20,y-65,40,white,'Overpass',680)
    print('run '+evidence.run.slice(0,8)+' · step '+evidence.step+' · '+evidence.verdict,x+20,y-15,40,evidence.verdict==='FAIL'?white:yellow,'Overpass',680)
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

  }else sourceTag(s,assets)
}
function photo(s,assets,t,age){
  const a=assets[s.asset],img=a.img,r=focusRect(s,a)
  if(s.inset){
    const z=.80
    ctx.drawImage(img,0,-17+7*Math.sin(t*.65),img.width*z,img.height*z)
    const inset=assets[s.inset].img
    ctx.drawImage(inset,1536,0,384,960)
    rect(1536,957,384,22,ink)
    cover(1536,957,384,22)
    line(1536,0,1536,976,yellow,7);cover(1532,0,8,976)
    return
  }
  const z=1.15+.065*Math.sin(t*.37-.5)+.025*at(age,0,1.6)
  if(z>1.25 || img.width*z<1920 || img.height*z<976)throw Error(s.asset+' has insufficient source pixels')
  const [cx,cy]=r?[r[0]+r[2]/2,r[1]+r[3]/2]:[img.width*.5,img.height*.48]
  const x=Math.round(Math.max(W-img.width*z,Math.min(0,740-cx*z-12*Math.sin(t*.47))))
  const y=Math.round(Math.max(977-img.height*z,Math.min(0,440-cy*z-14*Math.sin(t*.56))))
  ctx.drawImage(img,x,y,img.width*z,img.height*z)
  if(s.cross){
    const [a,b,w,h]=s.cross.map(v=>v*z)
    line(x+a,y+b,x+a+w,y+b+h,red,4);line(x+a+w,y+b,x+a,y+b+h,red,4)
    cover(x+a,y+b,w,h)
  }
  if(r){
    const left=x+r[0]*z,top=y+r[1]*z,w=r[2]*z,h=r[3]*z
    const points=[[left,top],[left+w,top],[left+w,top+h],[left,top+h],[left,top]]
    const progress=.4+.6*at(age,0,.21)
    traced(points,progress,ink,11);traced(points,progress,yellow,6)
    cover(left-6,top-6,w+12,12);cover(left-6,top+h-6,w+12,12)
    cover(left-6,top,12,h);cover(left+w-6,top,12,h)
    if(s.callout){
      const right=left+w
      const onLeft=right>1250
      const from=onLeft?left:right, y0=Math.max(92,Math.min(961,top+h*.5))
      face(46,'Overpass',700)
      const cw=ctx.measureText(s.callout).width+38,tx=onLeft?Math.max(18,from-cw-56):Math.min(1900-cw,right+(s.cross?360:56))
      const ty=Math.max(109,Math.min(722,y0-34))
      const end=onLeft?tx+cw:tx
      line(from,y0,end,ty+34,ink,8);line(from,y0,end,ty+34,yellow,4)
      cover(Math.min(from,end),Math.min(y0,ty+34)-4,Math.abs(end-from),Math.abs(y0-ty-34)+8)
      rect(tx,ty,cw,68,yellow);cover(tx,ty,cw,68)
      print(s.callout,tx+18,ty+49,46,ink,'Overpass',700)
    }
  } else if(s.callout){
    face(46,'Mono',600)
    const w=ctx.measureText(s.callout).width+40
    rect(40,696,w,72,yellow);cover(40,696,w,72);mono(s.callout,60,746,46,ink)
  }
  if(s.panel){
    const panel=assets[s.panel].img
    const report=s.panel.startsWith('report')
    const width=report?panel.width:640,h=width*panel.height/panel.width
    const left=report?1475:1045,top=report?240:330
    rect(left-5,top-5,width+10,h+10,ink)
    ctx.drawImage(panel,left,top,width,h)
    cover(left-5,top-5,width+10,h+10)
  }
}
function wormsEvidence(s,assets,t,age){
  const a=assets[s.asset],dy=-Math.round(9+8*Math.sin(t*.75))
  ctx.drawImage(a.img,0,dy)
  if(s.focus){
    const [x,y,w,h]=s.focus
    outlineTarget([x,y+dy,w,h],age)
    face(46,'Overpass',700)
    const cw=Math.ceil(ctx.measureText(s.callout).width)+36,tx=1546-cw,ty=246
    line(tx+cw,ty+32,x-4,y+dy+h/2,ink,8)
    line(tx+cw,ty+32,x-4,y+dy+h/2,yellow,4)
    cover(tx+cw-4,Math.min(ty+32,y+dy+h/2)-4,x-tx-cw+8,Math.abs(ty+32-y-dy-h/2)+8)
    rect(tx,ty,cw,68,yellow);cover(tx,ty,cw,68)
    print(s.callout,tx+18,ty+49,46,ink,'Overpass',700)
  }
  const hasVerdict=s.fail||s.pass,x=58,y=832
  const label='Kane CLI · '+a.run.slice(0,8)+' · step '+a.step
  face(40,'Overpass',680)
  const bw=Math.ceil(ctx.measureText(label).width)+58
  const chip=hasVerdict?225:0
  rect(x,y,bw+chip,110,ink);cover(x,y,bw+chip,110)
  if(hasVerdict){
    rect(x,y,chip,110,s.fail?red:yellow)
    print(s.headline,x+27,y+84,93,ink)
  }
  print(label,x+chip+27,y+70,40,white,'Overpass',680)
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
  let product=false
  if(['title','close','teaser-title','thumbnail'].includes(shot.id)){
    if(state==='logo'||shot.id==='thumbnail')identity(shot,age)
    else pavement(-.04)
  }else if(shot.id==='scale')scaleGraphic(shot,t)
  else if(shot.id==='rules')rulesGraphic(shot,state,t,scene)
  else if(shot.id==='results')resultsGraphic(state,t)
  else if(shot.id==='worms'){
    wormsEvidence(scene.states[state??scene.initial],assets,t,age)
    product=true
  }
  else if(shot.id==='verified')shippedGraphic(state,t)
  else{
    const s=scene.states[state]??scene.states[scene.initial]
    if(s.nav)navigation(s,assets,t,age)
    else {photo(s,assets,t,age);sourceTag(s,assets)}
    if(beat || ['shopping','skip','mass-on','teaser-after'].includes(shot.id))slugTitle(s,age)
    product=true
  }
  if(shot.id!=='thumbnail')band(shot,t)
  window.pageShare=product?coverage():null
  return canvas.toDataURL('image/'+format,.985).split(',')[1]
}
