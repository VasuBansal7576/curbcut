const canvas = document.querySelector('canvas')
const g = canvas.getContext('2d',{alpha:false})
const M='#e8e4f5', D='#302039', S='#5c4b64', O='#ff784a', edge='#c3b9ce'
const assets={}, clipCache=new Map()
let directory, movies
const sat=x=>Math.max(0,Math.min(1,x))
const mix=(a,b,t)=>a+(b-a)*t
const step=(time,at,duration)=>{const t=sat((time-at)/duration);return t*t*(3-2*t)}
const pop=(t,at,d)=>1-Math.pow(1-sat((t-at)/d),3)
const still=async url=>{const i=new Image();i.src=url;await i.decode();return i}
async function load(media, lengths){
  directory=media;movies=lengths
  await Promise.all([document.fonts.load('600 58px InterTight'),document.fonts.load('500 19px JetBrains')])
  await Promise.all('nav menu wide switchOff switchOn report arrow dots search details foot spring cap'.split(' ').map(async n=>{assets[n]=await still(media+n+(['foot','spring','cap'].includes(n)?'.webp':'.png'))}))
}
async function clip(n,t){
  const index=1+Math.max(0,Math.min(movies[n]-1,Math.floor(t*15)))
  const key=n+index
  if(!clipCache.has(key)){
    if(clipCache.size>18)clipCache.delete(clipCache.keys().next().value)
    clipCache.set(key,await still(directory+n+'/'+String(index).padStart(4,'0')+'.jpg'))
  }
  return clipCache.get(key)
}
function rr(x,y,w,h,r,color,stroke,width=1){
  g.beginPath();g.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)))
  if(color){g.fillStyle=color;g.fill()}
  if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}
}
function type(str,x,y,size=38,weight=550,ink=D,align='left',family='InterTight'){
  g.fillStyle=ink;g.textAlign=align;g.textBaseline='alphabetic';g.font=weight+' '+size+'px '+family
  g.fillText(str,x,y)
}
function src(str,x,y,align='left',color=S){type(str,x,y,22,500,color,align,'JetBrains')}
function draw(n,x,y,w,h){const im=typeof n==='string'?assets[n]:n;g.drawImage(im,x,y,w,h??w*im.height/im.width)}
function paper(x,y,w,h,r=22,fill=M){
  g.save();g.shadowColor='rgba(54,32,65,.17)';g.shadowBlur=38;g.shadowOffsetY=20
  rr(x,y+4,w,h,r,'#c6bdce');g.restore()
  rr(x,y,w,h,r,fill,edge,1.5)
}
function line(x1,y1,x2,y2,col,width=2){
  g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=col;g.lineWidth=width;g.stroke()
}
function surface(dark=false){
  g.fillStyle=dark?D:M;g.fillRect(0,0,1920,1080)
}
function key(x,y,w,press=0,spread=0){
  g.save();g.translate(x,y)
  const s=w/1100
  g.scale(s,s)
  const shadow=g.createRadialGradient(530,825,15,530,825,485)
  shadow.addColorStop(0,'rgba(49,30,56,.25)');shadow.addColorStop(1,'rgba(49,30,56,0)')
  g.save();g.translate(0,650);g.scale(1,.31);g.translate(0,-650);g.fillStyle=shadow;g.fillRect(0,0,1100,1600);g.restore()
  draw('foot',0,0,1100)
  draw('spring',0,-15-spread*.4+press*52,1100)
  draw('cap',0,132-spread+press*161,1100)
  g.restore()
}
function ring(x,y,w,h,rad=12){
  rr(x,y,w,h,rad,null,D,10)
  rr(x,y,w,h,rad,null,O,7)
}
function nav(t,opened=0,travel=0,press=0,wait=false,withKey=true){
  const x=556, y=mix(350,257,opened)
  const w=1100,h=111
  const menuProgress=opened
  if(withKey)key(106,380,467,press,wait?12:28)
  src('mass.edu',x,y-36)
  paper(x,y,w,h,19)
  draw('nav',x+18,y+8,1067,98)
  const mx=x+5,my=y+h+13, mw=430,mh=552
  if(menuProgress>.001){
    g.save();g.globalAlpha=menuProgress;g.beginPath();g.roundRect(mx-8,my-6,mw+32,Math.max(9,(mh+53)*menuProgress),16);g.clip()
    paper(mx,my,mw,mh,16);draw('menu',mx+11,my+3,mw-22,mh-5);g.restore()
  }
  const tx=x+12,ty=y+8
  ring(mix(tx,mx+13,travel),mix(ty,my+7,travel),mix(233,393,travel),mix(94,64,travel),13)
}
function waiting(t){
  const z=pop(t,0,.6),x=820,y=403
  key(212,284,566,Math.sin(Math.PI*sat((t-2.2)/.55)),62)
  src('mass.edu',x,y-45)
  paper(x,y,475,195,25)
  g.drawImage(assets.nav,0,0,319,133,x+12,y+10,451,177)
  ring(x+8,y+9,458,176,21)
  g.save();g.globalAlpha=z;src('Keyboard focus',x+4,y+259);g.restore()
}
function openNav(t){
  const open=pop(t,1.05,.36),move=step(t,1.53,.52)
  nav(t,open,move,Math.sin(Math.PI*sat((t-.18)/.52)))
}
function wide(t){
  const w=985,x=750,y=232,h=w*.625,z=1+.035*t
  g.save();g.translate(x+w*.45,y+h*.3);g.scale(z,z);g.translate(-x-w*.45,-y-h*.3)
  paper(x-12,y-12,w+24,h+24,24)
  g.save();g.beginPath();g.roundRect(x,y,w,h,13);g.clip();draw('wide',x,y,w,h);g.restore()
  ring(x+10,y+113,58,24,5);src('mass.edu',x,y+h+62)
  g.restore()
  key(100,246,610,step(t,.22,.16)*.55,30)
}
function switcher(t,always=false){
  const z=.97+.035*pop(t,0,1.1), w=1060*z,x=(1920-w)/2,y=303+(1-pop(t,0,.5))*20
  const im=always||t>=.59?'switchOn':'switchOff'
  src('Chrome extension',x,y-39);paper(x-20,y-20,w+40,w*712/1560+40,23)
  draw(im,x,y,w);if(always||t>=.59){
    const f=w/1560;rr(x+1062*f,y+453*f,234*f,137*f,6,null,O,6)
  }
}
function embossedIcon(n,x,y,size){
  paper(x,y,size,size,size*.22);draw(n,x+size*.22,y+size*.22,size*.56,size*.56)
}
function label(t,enabled,preview=false){
  const reveal=enabled?step(t,2.82,.55):0
  const width=mix(538,775,reveal), x=960-width/2
  src('munich-airport.de',x,359)
  paper(x,409,width,214,31)
  rr(x+24,432,159,166,22,'#d7d0e5')
  draw('arrow',x+45,452,117,119)
  if(reveal<1){g.save();g.globalAlpha=sat(1-2.3*reveal);type('Button',x+226,541,66,570);g.restore()}
  if(reveal>0){g.save();g.globalAlpha=sat(2.1*reveal-1.1);type('Previous slide',x+222,541+15*(1-reveal),65,580);g.restore()}
  if(!preview){
    const text=reveal>.5?'Screen reader  ·  Vorherige Folie':'Screen reader'
    src(text,x+4,694)
  }
}
function contrast(t,active=true){
  const e=active?step(t,.85,.8):0
  const x=615,y=369,w=690,h=270
  src('extremeterrain.com',x,319)
  paper(x,y,w,h,26,D)
  g.save();g.translate(x+134,y+51);g.drawImage(detailLayers[0],0,0,425,160)
  g.globalAlpha=e;g.drawImage(detailLayers[1],0,0,425,160);g.restore()
  src('Text contrast',x,y+h+67)
  type((mix(4.39,4.50,e)).toFixed(2)+' : 1',x+w,y+h+72,44,550,D,'right')
  line(x,y+h+107,x+w,y+h+107,edge,2)
  line(x,y+h+107,x+mix(.38,.82,e)*w,y+h+107,O,7)
}
const detailLayers=[]
function detailInk(){
  const linear=x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}
  const lum=a=>a.map(linear).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
  const base=[48,32,57],end=[232,228,245]
  for(const ratio of [4.38696,4.50134]){
    let lo=0,hi=1
    for(let i=0;i<20;i++){const mid=(lo+hi)/2, col=base.map((v,j)=>mix(v,end[j],mid));if((lum(col)+.05)/(lum(base)+.05)<ratio)lo=mid;else hi=mid}
    const c=document.createElement('canvas');c.width=assets.details.width;c.height=assets.details.height
    const ctx=c.getContext('2d');ctx.drawImage(assets.details,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle='rgb('+base.map((v,j)=>mix(v,end[j],hi)).join(' ')+')';ctx.fillRect(0,0,c.width,c.height);detailLayers.push(c)
  }
}
function number(t,fixes){
  surface(true)
  const a=pop(t,0,.55),x=fixes?264:160
  g.save();g.translate(x,656+(1-a)*45);type(fixes?'105':'95.9%',0,0,fixes?398:306,640,M);g.restore()
  const tx=fixes?998:1225
  line(tx,391,tx+112,391,O,9)
  const caption=fixes?['Fixes live','today.']:['Of the top million','home pages have','accessibility barriers.']
  caption.forEach((v,i)=>type(v,tx,472+i*61,52,520,M))
  if(fixes){src('61 Kane-verified',tx,639,'left','#cfc3d9');src('44 with local proof',tx,684,'left','#cfc3d9')}
  else src('WebAIM Million',tx,702,'left','#cfc3d9')
}
function names(t,demo=false){
  const start=demo?1:1.8
  const left=step(t,start,.5),right=step(t,start+1.03,.52)
  src('meridiano.net',555,299)
  const glyph=(id,x,d,word)=>{
    embossedIcon(id,x,366,220)
    const cx=x+110,end=681
    if(d>0){
      line(cx,587,cx,mix(590,end,d),O,5)
      g.save();g.globalAlpha=d;const w=217
      paper(cx-w/2,end+(1-d)*15,w,82,37)
      type(word,cx,end+54+(1-d)*15,40,570,D,'center');g.restore()
    }
  }
  glyph('dots',595,left,'Menú');glyph('search',1104,right,'Buscar')
  if(demo&&t>8)src('13 of 15 names correct',960,860,'center')
}
function owner(t){
  const e=pop(t,0,.68),w=1080,x=420,y=383
  src('mass.edu',x,y-75)
  g.save();g.translate((1-e)*250,(1-e)*54);g.rotate((1-e)*.035)
  paper(x,y,w,437,14);rr(x+1,y+1,12,434,5,O)
  draw('report',x+37,y+27,w-75,355)
  g.restore()
}
function closeShot(t){
  key(263,165,762,0,25+17*Math.sin(t*.60))
  type('Curb Cut',1040,527,100,680)
  if(t>2.95){
    const p=pop(t,2.95,.38)
    g.save();g.globalAlpha=p;type('Get Curb Cut for Chrome',1046,620+(1-p)*14,43,510);g.restore()
  }
}
function clipCard(im,x,y,w,h,label,outcome,box){
  src(label,x,y-35)
  paper(x-7,y-7,w+14,h+14,18)
  g.save();g.beginPath();g.roundRect(x,y,w,h,13);g.clip()
  if(box){const [sx,sy,sw,sh]=box;g.drawImage(im,sx,sy,sw,sh,x,y,w,h)}
  else draw(im,x,y,w,h)
  g.restore()
  if(outcome){rr(x,y+h+34,10,40,4,O);type(outcome,x+31,y+h+70,40,575)}
}
async function proof(t){
  const failBox=[667,22,590,126],passBox=[285,124,601,132]
  if(t<8.5){
    const im=await clip('fail',t)
    const x=363,y=407,w=1194,h=255
    clipCard(im,x,y,w,h,t<2?'mass.edu':'Kane recording  /  mass.edu',t>=7.6?'Without the fix  ·  Failed':t>=6.5?'Without the fix':'',failBox)
  }else if(t<10.5){
    const u=t-8.5,landed=u>=22/30,at=landed?2.1+u-22/30:.95+u
    const im=await clip('pass',at)
    clipCard(im,363,407,1194,255,'Kane recording  /  mass.edu',u>=.75?'With the fix  ·  Passed':'With the fix',landed?passBox:failBox)
  }else{
    const a=await clip('fail',7), b=await clip('pass',t-7.5)
    clipCard(a,176,432,732,157,'Without the fix','Failed',failBox)
    clipCard(b,1010,432,732,157,'With the fix','Passed',passBox)
  }
}
async function launchPicture(id,t){
  surface()
  switch(id){
    case 'establish':wide(t);break
    case 'closed':nav(t,0,0,Math.sin(Math.PI*sat(t/.54)));break
    case 'switch':switcher(t);break
    case 'opened':openNav(t);break
    case 'people':key(525,79,865,.20*(1-step(t,0,.4)),mix(-30,145,pop(t,0,.85)));break
    case 'mouse':nav(t,0,0,0,true);break
    case 'unnamed':label(t,false,true);break
    case 'faint':contrast(t,false);break
    case 'million':number(t,false);break
    case 'wait':waiting(t);break
    case 'extension':switcher(t,true);break
    case 'reader':label(t,true);break
    case 'contrast':contrast(t);break
    case 'kane':await proof(t);break
    case 'total':number(t,true);break
    case 'jev':names(t);break
    case 'owner':owner(t);break
    case 'endcard':closeShot(t);break
  }
}
function nativeCard(im,x,y,w,h,box,label){
  clipCard(im,x,y,w,h,label,'',box)
}
function shopBox(im,wide=false){
  const sx=wide?183:258, sy=wide?220:295, w=wide?901:700
  return [sx,sy,w,Math.round(w*645/1270)]
}
function shopCaption(text,sub,x=325,y=829){
  rr(x,y-34,9,43,4,O);type(text,x+29,y,45,580)
  if(sub)src(sub,x+29,y+57)
}
async function shopScene(movie,elapsed,heading,description,wide=false){
  const im=await clip(movie,movie==='gateAfter'?Math.min(3.6,elapsed):movie==='retireShop'?Math.min(8.6,elapsed):elapsed)
  nativeCard(im,325,217,1270,645,shopBox(im,wide),heading)
  if(description)shopCaption(description,'',325,954)
}
async function terminal(n,t,heading,message,focus){
  const im=await clip(n,t),x=398,y=348,w=1124,h=335
  src(heading,x,y-46)
  paper(x-6,y-6,w+12,h+12,21,D)
  g.save();g.beginPath();g.roundRect(x,y,w,h,16);g.clip()
  g.drawImage(im,0,0,2,2,x,y,w,h)
  const row=(sx,sy,sw,sh,dy,scale=1.8)=>g.drawImage(im,sx,sy,sw,sh,x+71,y+dy,sw*scale,sh*scale)
  if(n==='checkTerm'){
    row(349,28,333,34,36)
    row(39,135,190,32,132)
    if(focus){
      row(39,317,202,35,189)
      row(39,459,321,37,247)
    }
  }else if(n==='gateTerm'){
    const second=focus>0
    row(34,second?306:29,337,36,60)
    row(34,second?342:64,440,37,157)
  }else{
    row(28,25,765,37,42,1.28)
    row(30,61,668,37,124,1.48)
    row(118,395,286,35,214,1.54)
  }
  g.restore()
  shopCaption(message,'',x,y+h+104)
}
async function popupScene(t,length,report){
  const name=report?'draft':'trust'
  const at=report?1.3+t/length*5.7:t<4.5?1.2+t/4.5*1.52:3.13+(t-4.5)/(length-4.5)*4.87
  const im=await clip(name,at)
  const imageW=im.width, imageH=im.height
  let box,title
  if(report){
    const f=step(at,.65,.8)
    const sx=mix(.10,.335,f), sy=mix(.02,0,f),sw=mix(.82,.652,f)
    box=[imageW*sx,imageH*sy,imageW*sw,imageH*mix(.89,.98,f)]
    title='Report a barrier'
  }else{
    if(at<2.85){
      const f=step(at,.45,.8);box=[imageW*mix(.08,.54,f),imageH*.01,imageW*mix(.82,.44,f),imageH*.94]
    }else box=[imageW*.11,imageH*.065,imageW*.77,imageH*.174]
    title=at<2.85?'Extension popup':'Kane recording'
  }
  const ratio=box[2]/box[3],h=666,w=Math.min(1285,h*ratio),actualH=w/ratio
  nativeCard(im,(1920-w)/2,528-actualH/2,w,actualH,box,title)
}
async function chapterPicture(shot,t){
  surface()
  const {id,duration}=shot
  if(id==='task'){
    await shopScene('shopBefore',t,'Stillroom  /  shop','Find headphones and add them to the cart.',true)
  }else if(id==='before'){
    if(t<5)await terminal('checkTerm',t*.49,'Terminal','curbcut check',0)
    else await shopScene('shopBefore',t-5,'Kane recording  /  keyboard','The keyboard skips Add to cart.')
  }else if(id==='patch'){
    if(t<6.5)await terminal('checkTerm',mix(3.2,11.9,t/6.5),'Terminal','Let the button take focus. Let Enter activate it.',76)
    else await shopScene('shopAfter',t-6.5,'Kane recording  /  keyboard',t>=10.75?'Field Headphones added.':'Try the repaired button with Enter.')
  }else if(id==='gateFail'){
    if(t<6.5)await terminal('gateTerm',Math.min(t,5.4),'Claude Code  /  Stop hook','Run the check before Claude finishes.',0)
    else await shopScene('gateBefore',t-6,'Kane recording  /  keyboard','Failed. The Stop hook sends the work back.')
  }else if(id==='gatePass'){
    if(t<5)await shopScene('gateAfter',t+4,'Kane recording  /  repaired site','The button now works by keyboard.')
    else await terminal('gateTerm',Math.min(10.9,7.3+t-5),'Claude Code  /  Stop hook','Passed. Claude can finish.',115)
  }else if(id==='trust')await popupScene(t,duration,false)
  else if(id==='names')names(t,true)
  else if(id==='report')await popupScene(t,duration,true)
  else if(id==='retire'){
    if(t<8)await shopScene('retireShop',t,'Kane recording  /  extension fix off','The site works on its own.')
    else await terminal('retireTerm',(t-8)*1.6,'Terminal','Curb Cut retires the fix.',0)
  }else if(id==='end'){
    await shopScene('retireShop',10,'Stillroom  /  shop','A working button for the next shopper.',true)
  }
}
async function picture(shot,t){
  g.save()
  const duration=shot.frames/30
  const amount=shot.chapter ? .025 : ['closed','opened','switch','reader','contrast','kane','owner','jev'].includes(shot.id) ? .048 : .033
  const camera=1+amount*step(t,0,duration)
  g.translate(960,540);g.scale(camera,camera);g.translate(-960,-540)
  if(shot.chapter)await chapterPicture(shot,t)
  else await launchPicture(shot.id,t)
  g.restore()
}

function thumbnail(){
  surface()
  type('Curb Cut',123,253,155,670)
  type('Accessibility fixes for Chrome',132,337,51,510)
  key(138,365,648,0,32)
  g.save();g.translate(382,175);g.scale(.825,.825);nav(0,1,1,0,false,false);g.restore()
}
