function rail(x,y,w,color=lime){roundBox(x,y,w,6,3,color)}
function typeFrame(lines,size,age,emphasis,sub=''){
  ground()
  const x=122+48*(1-at(age,0,.34))
  const baseline=(lines.length===1?635:485)+40*(1-at(age,0,.42))
  typeLines(lines,x,baseline,size,white,1670,.91,emphasis)
  if(sub)print(sub,x+5,baseline+108,65,lime,'Tight',620)
}
function brandFrame(state,age){
  ground()
  if(state==='end-line'||state==='thumbnail'){
    curbObject(1480,758,.71,age+1)
    brandLock(122,350,1.05,white)
    typeLines(['Fixing the web for','the people it shuts out.'],129,594,106,white,1090,1.04,'people')
    return
  }
  if(state==='brand'||state==='end'){
    curbObject(1285,755,1.05,age)
    print('Curb Cut',110,415,236,white)
    return
  }
  curbObject(1402,761,.80,age+1)
  typeLines(['Right in','your browser.'],111,484,190,white,1080,.96,'browser')
}
function browserFrame(x,y,w,h,host){
  ctx.save()
  ctx.shadowColor=alpha(ink,.30);ctx.shadowBlur=42;ctx.shadowOffsetY=27
  roundBox(x-7,y-7,w+14,h+88,21,white)
  ctx.restore()
  roundBox(x,y,w,h+74,17,white)
  curbMark(x+25,y+26,.61,cobalt)
  print(host,x+106,y+49,30,ink,'Mono',570,w-222)
  for(let i=0;i<3;i++)disk(x+w-69+i*15,y+36,3.6,cobalt)
  rect(x,y+72,w,2,toned(white,ink,.24))
}
function plate(a,x,y,w,h,sx,sy,z){
  window.sourceScale=Math.max(window.sourceScale,z)
  if(z>1.250001)throw Error('Source magnification '+z)
  const sw=w/z,sh=h/z
  sx=Math.max(0,Math.min(a.img.width-sw,sx));sy=Math.max(0,Math.min(a.img.height-sh,sy))
  ctx.drawImage(a.img,sx,sy,sw,sh,x,y,w,h)
  return r=>[x+(r[0]-sx)*z,y+(r[1]-sy)*z,r[2]*z,r[3]*z]
}
function corners(r,color,t){
  const [x,y,w,h]=r,p=11,n=19+8*at(t,0,.3)
  ctx.lineWidth=4;ctx.strokeStyle=color
  for(const [xx,yy,dx,dy] of [[x-p,y-p,1,1],[x+w+p,y-p,-1,1],[x-p,y+h+p,1,-1],[x+w+p,y+h+p,-1,-1]]){
    ctx.beginPath();ctx.moveTo(xx+n*dx,yy);ctx.lineTo(xx,yy);ctx.lineTo(xx,yy+n*dy);ctx.stroke()
  }
}
function menuShot(a,open,age){
  ground()
  const x=870,y=185+12*(1-at(age,0,.35)),w=933,h=470,z=.86+.035*at(age,0,1.1)
  browserFrame(x,y,w,h,'mass.edu')
  const project=plate(a,x,y+74,w,h,0,528,z)
  corners(project(a.letters.trigger.bounds),open?lime:coral,age)
  label('Keyboard',110,235,34,white)
  typeLines(open?['Menu','open.']:['Menu','closed.'],104,480,175,open?lime:white,720,.88,open?'open':'closed')
  if(!open)rect(114,708,214,10,coral)
  else rail(114,700,300)
}
function readingShot(state,a,t){
  ground()
  const spanish=state.startsWith('jev')
  const named=state==='reader-on'||state==='jev-on'
  const headline=spanish?(state==='jev-off'?'An unfamiliar page.':state==='jev'?'Meet Jev.':'Buttons with names.'):(named?'Previous slide.':'Just “button.”')
  const x=138,w=1644,headerY=spanish?401:418,h=spanish?332:165
  label(spanish?'Live naming':'Screen reader',137,128,34,white)
  typeLines([headline],126,322,157,named?lime:white,1660,.95,spanish?'names':(named?'slide':'button'))
  browserFrame(x,headerY,w,h,spanish?'meridiano.net  /  Reading view':'munich-airport.de  /  Reading view')
  const target=a.targets[0],z=1.045+.023*at(t,0,1.0)
  const project=plate(a,x,headerY+74,w,h,target.words[0]-56/z,target.rect[1]-(h/z-(spanish?2:1)*target.rect[3])/2,z)
  for(const target of a.targets){
    const [xx,yy,ww,hh]=project(target.words)
    line(xx,yy+hh+4,xx+ww*at(t+.1,0,.35),yy+hh+4,named?cobalt:coral,5)
  }
}
function contrastShot(a,ok,t){
  ground()
  label('Low vision',113,224,34,white)
  typeLines(ok?['Made','readable.']:['Too','faint.'],106,475,177,ok?lime:white,750,.95,ok?'readable':'faint')
  const x=886,y=306,w=822,h=185,z=1.21+.025*at(t,0,.68)
  browserFrame(x,y,w,h,'extremeterrain.com')
  const [sx,sy,sw,sh]=a.rect
  const targetX=x+(w-sw*z)/2,targetY=y+74+(h-sh*z)/2
  const sample=a.img.getContext('2d').getImageData(sx-2,sy+2,1,1).data
  rect(x,y+74,w,h,'rgb('+Array.from(sample.slice(0,3)).join(',')+')')
  ctx.drawImage(a.img,sx,sy,sw,sh,targetX,targetY,sw*z,sh*z)
  window.sourceScale=Math.max(window.sourceScale,z)
  corners([targetX,targetY,sw*z,sh*z],ok?lime:coral,t)
}
function kaneShot(a,state,t){
  ground()
  const pass=state==='passed'||state==='record'
  const title={replay:['Open','About.'],failed:['FAIL'],passed:['PASS'],record:['That’s','the proof.']}[state]
  const x=815,y=318,w=998,h=state==='record'?152:pass?132:160
  const color=state==='failed'?coral:pass?lime:white
  if(state==='failed'||state==='passed'){
    roundBox(111,423,650,237,24,color);print(state==='failed'?'FAIL':'PASS',143,604,172,ink,'Mono',780,584)
  }else typeLines(title,110,507,146,white,654,.96,state==='record'?'proof':'About')
  browserFrame(x,y,w,h,'mass.edu  /  Replay')
  if(a.clip){
    const [,,sw,sh]=a.clip.crop,idx=Math.min(29,Math.floor(t*12))
    ctx.drawImage(a.img,(idx%5)*sw,Math.floor(idx/5)*sh,sw,sh,x,y+74,w,h)
    window.sourceScale=Math.max(window.sourceScale,w/sw,h/sh)
  }else{
    const z=1.19+.035*at(t,0,.8)
    const project=plate(a,x,y+74,w,h,pass?445:906,pass?211:37,z)
    corners(project(pass?[470,237,609,36]:[1086,87,78,30]),color,t)
  }
  const start=x+40,end=x+w-40,track=y+h+113
  rect(start,track,end-start,4,toned(ink,white,0.25))
  rect(start,track,(end-start)*(.22+.55*at(t,0,1.3)),4,color)
  disk(start+(end-start)*(.22+.55*at(t,0,1.3)),track+2,7,color)
}
function popupShot(a,proof,t){
  ground()
  if(proof){
    typeLines(['See the','proof.'],116,470,184,white,692,.93,'proof')
    print('A replay or a measurement.',122,787,49,white,'Tight',550,706)
  }
  else{
    print('105',105,645,410,lime,'Mono',780,707)
    print('fixes live today',128,759,75,white,'Tight',670)
  }
  const x=887,y=proof?364:280,z=1.12+.035*at(t,0,.8)
  const w=proof?800:863,h=proof?148:395
  browserFrame(x,y,w,h,'Curb Cut  /  Extension')
  plate(a,x,y+74,w,h,proof?Math.max(0,a.rect[0]-20):0,proof?Math.max(0,a.rect[1]-12):0,z)
}
function reportShot(a,t){
  ground()
  typeLines(['For the','site owner.'],110,456,163,white,720)
  const x=880,y=254,w=948,h=450,z=w/a.img.width
  browserFrame(x,y,w,h,'Curb Cut  /  Site report')
  plate(a,x,y+74,w,h,0,0,z)
}
function paint(state,age,assets,assetKey){
  const a=assets[assetKey]
  switch(state){
    case 'key':case 'same-key':
      ground()
      typeLines(state==='key'?['Press','Tab.']:['Same','keys.'],117,467,218,white,780,.83)
      keycap(1302,553,1.37,age)
      break
    case 'switch-off':case 'switch-on':
      ground()
      label('Chrome extension',112,231,36,white)
      typeLines(state==='switch-off'?['Turn it','on.']:['Curb Cut','is on.'],103,484,169,white,725,.98,'on')
      browserFrame(895,286,852,387,'Curb Cut  /  Extension')
      plate(a,895,360,852,387,0,0,1.11)
      break
    case 'key-hit':
      ground()
      keycap(977,547,2.12,age)
      break
    case 'closed':case 'opened':menuShot(a,state==='opened',age);break
    case 'millions':typeFrame(['For millions,','this is the web.'],166,age,'millions');break
    case 'mouse':ground();typeLines(['Mouse','only.'],114,481,201,white);pointerObject(1140,241,420,age);break
    case 'anonymous':ground();typeLines(['No','name.'],114,481,201,white);blankTag(1360,518,1.1,age);break
    case 'faint-word':ground();print('Too',117,482,230,white);print('faint.',112,706,269,toned(ink,white,.56+.14*at(age,0,.9)));rail(132,783,248,coral);break
    case 'percent':case 'population':
      ground()
      print('95.9%',93,743+(state==='percent'?36*(1-at(age,0,.48)):0),560,lime,'Tight',820,1650)
      rect(127,802,1450*(state==='percent'?at(age,0,1.18):1),5,white)
      if(state==='population')print('of the top million home pages have barriers.',124+16*(1-at(age,0,.25)),903,62,white,'Tight',640)
      break
    case 'years':ground();curbObject(1300,724,1.14,age,false);typeLines(['Years','to fix.'],105,466,209,white,754);break
    case 'cant-wait':typeFrame(['People','can’t wait.'],218,age,'wait');break
    case 'sign':brandStamp(age);break
    case 'brand':case 'now':case 'end':case 'end-line':case 'thumbnail':brandFrame(state,age);break
    case 'reader-off':case 'reader-on':case 'jev-off':case 'jev':case 'jev-on':readingShot(state,a,age);break
    case 'contrast-off':case 'contrast-on':contrastShot(a,state==='contrast-on',age);break
    case 'guess':typeFrame(['No guessing.'],224,age,'guessing');break
    case 'kane':typeFrame(['Kane'],298,age,'','An AI tester');break
    case 'replay':case 'failed':case 'passed':case 'record':kaneShot(a,state,age);break
    case 'inventory':case 'popup-proof':popupShot(a,state==='popup-proof',age);break
    case 'quiet':typeFrame(['Unsure?','Stay quiet.'],192,age,'quiet');break
    case 'paper':typeFrame(['Pass it on.'],235,age,'on');break
    case 'report':reportShot(a,age);break
    case 'retire':ground();curbObject(1400,748,.82,age);typeLines(['One day,','it just works.'],110,470,151,white,1000,.92);break
    default:throw Error('Unknown picture '+state)
  }
}
