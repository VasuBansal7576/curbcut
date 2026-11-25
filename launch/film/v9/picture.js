const canvas=document.querySelector('canvas')
const g=canvas.getContext('2d',{alpha:false})
const ink='#171719', blue='#2452A5', gray='#57585c'
const images={}, cache=new Map()
let sizes, lengths, tracks, nativeBounds, media
const clamp=x=>Math.max(0,Math.min(1,x))
const lerp=(a,b,t)=>a+(b-a)*t
function ease(t,start,length){const v=clamp((t-start)/length);return v*v*(3-2*v)}
async function image(url){const im=new Image();im.src=url;await im.decode();return im}
async function prepare(work,root,data){
  ;[sizes,lengths,tracks,nativeBounds]=data
  media=work+'media/'
  const paths=Object.fromEntries(Object.keys(sizes).map(id=>['shell-'+id,work+'shell-'+id+'.png']))
  for(const id of Object.keys(nativeBounds))paths['native-'+id]=work+'native-'+id+'.png'
  for(let i=0;i<=8;i++)paths['key-'+i]=work+'key-'+i+'.png'
  for(const id of ['owner-report','reader-on','reader-off','contrast-on','contrast-off','popup-apply-fixes','popup-apply-off','popup-proof-and-report','jev-on','jev-off'])paths[id]=root+'launch/film/plates/'+id+'.png'
  for(const id of ['mass-before','munich','meridiano'])paths[id]=root+'launch/film/a2/plates/'+id+'.jpg'
  for(const mode of ['on','off'])paths['shopPopup-'+mode]=work+'shop-popup-'+mode+'.png'
  paths.close=root+'launch/direction/v9/A/end-card.png'
  await Promise.all(Object.entries(paths).map(async([id,url])=>images[id]=await image(url)))
  await document.fonts.load('600 54px InterTight')
}
async function movie(id,time){
  const n=Math.min(lengths[id],Math.max(1,1+Math.floor(time*15))),key=id+n
  if(!cache.has(key)){
    if(cache.size>24)cache.delete(cache.keys().next().value)
    cache.set(key,await image(media+id+'/'+String(n).padStart(4,'0')+'.jpg'))
  }
  return cache.get(key)
}
function track(id,t){const v=tracks[id];return v[Math.min(v.length-1,Math.max(0,Math.floor(t*15)))]}
function rounded(x,y,w,h,r,fill,stroke,lineWidth=1){
  g.beginPath();g.roundRect(x,y,w,h,r)
  if(fill){g.fillStyle=fill;g.fill()}
  if(stroke){g.strokeStyle=stroke;g.lineWidth=lineWidth;g.stroke()}
}
function text(value,x,y,size=42,weight=555,color=ink){
  g.font=weight+' '+size+'px InterTight';g.fillStyle=color;g.textAlign='left';g.textBaseline='alphabetic';g.fillText(value,x,y)
}
function box(id){const [x,y,w,h]=sizes[id];return {x:x+1,y:y+101,w:w-2,h:h-102}}
function shell(id){g.drawImage(images['shell-'+id],0,0);return box(id)}
function inside(b,fn){
  g.save();g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,[0,0,15,15]);g.clip();fn();g.restore()
}
function content(im,b,x,y,w){
  w=Math.min(w,im.width,im.height*b.w/b.h)
  const z=b.w/w,h=b.h/z
  x=Math.max(0,Math.min(x,im.width-w));y=Math.max(0,Math.min(y,im.height-h))
  inside(b,()=>g.drawImage(im,x,y,w,h,b.x,b.y,b.w,b.h))
  return rect=>[b.x+(rect[0]-x)*z,b.y+(rect[1]-y)*z,rect[2]*z,rect[3]*z]
}
function focus([x,y,w,h],r=7){
  rounded(x,y,w,h,r,null,'#fff',8);rounded(x,y,w,h,r,null,blue,4)
}
function footer(b,label,detail='',outcome=null){
  const y=b.y+b.h+85
  let x=b.x+8
  if(outcome!==null){
    g.fillStyle=blue;g.beginPath();g.arc(x+22,y-14,23,0,2*Math.PI);g.fill()
    g.strokeStyle='white';g.lineWidth=4.5;g.lineCap='round';g.lineJoin='round';g.beginPath()
    if(outcome){g.moveTo(x+11,y-14);g.lineTo(x+19,y-6);g.lineTo(x+34,y-22)}
    else{g.moveTo(x+15,y-21);g.lineTo(x+29,y-7);g.moveTo(x+29,y-21);g.lineTo(x+15,y-7)}
    g.stroke();x+=66
  }
  text(label,x,y,42,605)
  if(detail){
    const left=x+g.measureText(label).width+29
    rounded(left,y-30,1,32,0,'#cdced0');text(detail,left+22,y-3,25,490,gray)
  }
}
function plate(im,x,y,w,h,crop=null,r=10){
  g.save();g.shadowColor='#11111135';g.shadowBlur=28;g.shadowOffsetY=8
  rounded(x,y,w,h,r,'white');g.restore()
  g.save();g.beginPath();g.roundRect(x,y,w,h,r);g.clip()
  if(crop)g.drawImage(im,...crop,x,y,w,h)
  else g.drawImage(im,x,y,w,h)
  g.restore();rounded(x,y,w,h,r,null,'#00000024')
}
function popup(b,im,t,crop=null,width=450){
  const a=ease(t,-.03,.32),aspect=crop?crop[3]/crop[2]:im.height/im.width
  const h=Math.min(width*aspect,b.h-17),w=h/aspect
  const x=b.x+b.w-145-w,y=b.y+6+(1-a)*18
  g.save();g.globalAlpha=a;plate(im,x,y,w,h,crop);g.restore()
}
function key(press=0){g.drawImage(images['key-'+Math.round(clamp(press)*8)],77,541,490,490)}
function press(t,at){return Math.sin(Math.PI*clamp((t-at)/.42))}
function nativeShot(state,b){
  const im=images['native-'+state],fit=content(im,b,0,0,im.width),k=im.width/1200
  inside(b,()=>focus(fit(nativeBounds[state].map((v,i)=>(v+(i<2?-4:8))*k))))
}
function opening(id,t){
  const b=shell('opening')
  const time=id==='skip'?t+100/30:id==='task'?t*.61:id==='key'?9.63+t:t
  const state=time<2.88?'search':time<5.39?'button':'skipped'
  nativeShot(state,b);key(Math.max(press(time,2.68),press(time,5.18)))
  text(state==='skipped'?'Tab skips the headphones’ Add to cart.':'A shopper is here for the Field Headphones.',608,902,41,545)
}
function noteSide(title,lines,source=''){
  text(title,104,502,title.length>4?156:194,690)
  lines.forEach((s,i)=>text(s,115,600+i*57,48,525))
  if(source)text(source,118,784,25,490,gray)
}
function mapBackground(b,im){return content(im,b,105,0,1080)}
function stats(id,t,im){
  const isScale=id==='scale',b=shell(isScale?'shopSide':'mapSide')
  if(isScale){nativeShot('skipped',b);noteSide('95.9%',['of the top million home pages','had accessibility failures.'],'WebAIM Million, 2026')}
  else{
    mapBackground(b,im)
    popup(b,im,.8,[1386,46,486,944],345)
    noteSide('106',['fixes live in the extension.',...(id==='proven'?['62 proven by Kane.']:[])])
  }
}
async function shopProof(name,t,label,outcomeAt,mark){
  const b=shell('shop'),im=await movie(name,t),sy=track(name,t)
  const pass=name==='shopAfter'||name==='gateAfter', retired=name==='retireShop'
  const change={shopBefore:26/15,shopAfter:23/15,gateBefore:23/15,gateAfter:21/15,retireShop:1.75}[name]
  const p=ease(t,change-.04,.15)
  const target=name==='shopBefore'||retired?[893,277,80,30]:name==='gateBefore'?[296,331,102,31]:[546,277,80,30]
  const w=pass?lerp(837,745,p):864
  const left=pass?lerp(201,168,p):199
  const cropY=sy+lerp(-60,pass?63:4,p)
  const fit=content(im,b,left,cropY,w)
  const evidence=[lerp(536,target[0],p),sy+lerp(0,target[1],p)-2,lerp(58,target[2],p),lerp(30,target[3],p)+3]
  inside(b,()=>focus(fit(evidence)))
  const outcome=t>=outcomeAt
  footer(b,outcome?label:pass?'Tab reaches Add to cart.':retired?'The site’s own button':'Follow the keyboard focus.', 'Kane replay',outcome?mark:null)
}
async function mouseShot(cart,t){
  const b=shell('shop'),time=cart?7.84+t*.5:.08+t*.74
  const im=await movie('mouseControl',time)
  content(im,b,...(cart?[405,244,500]:[200,392,650]))
  footer(b,cart?'Field Headphones is in the cart.':time>.88?'Mouse passed':'Click Add to cart.','Kane replay',cart?null:time>.88?true:null)
}
function shopRule(t){
  const b=shell('shopSide')
  nativeShot('skipped',b)
  text('Add to cart',107,455,90,640)
  text('Let Tab reach the button.',114,558,47,520)
  if(t>1.22)text('Let Enter activate it.',114,624,47,520)
  text('Stillroom Supply  /  proposed fix',116,758,25,490,gray)
}
function massBackground(b){return content(images['mass-before'],b,0,0,2410)}
async function massShot(id,t){
  const b=shell('mass')
  if(id==='wide'){massBackground(b);footer(b,'Massachusetts Department of Higher Education');return}
  if(id==='destination'){
    content(await movie('destination',t),b,216,81,760);footer(b,'Enter opens the department page.');return
  }
  const fixed=id==='opened',dhe=fixed&&t>=37/30,name=fixed?'pass':'fail'
  const at=fixed?(dhe?7.25+t-37/30:t):t+2.9
  const baseline=track(name,at),im=await movie(name,at),w=690-32*ease(t,0,3)
  const fit=content(im,b,745-.27*w,Math.max(0,baseline-107),w)
  const p=fixed?ease(t,1.14,.22):0
  inside(b,()=>focus(fit([718,baseline+lerp(-36,-13,p),lerp(55,110,p),lerp(23,21,p)])))
  footer(b,fixed?(dhe?'The DHE has focus.':'About opens.'):'About stays closed.','Kane replay',fixed?(dhe?true:null):t>2.4?false:null)
}
function shopPopup(t){
  const b=shell('opening')
  nativeShot('skipped',b);key()
  const enabled=t>=1.72
  popup(b,images['shopPopup-'+(enabled?'on':'off')],t-.18,null,410)
  text('Curb Cut for Chrome',608,902,43,605)
}
function massPopup(t,kind){
  const b=shell('mass');massBackground(b)
  const proof=kind==='share'||kind==='owner'
  const im=images[proof?'popup-proof-and-report':t>.8?'popup-apply-fixes':'popup-apply-off']
  popup(b,im,t,null,455)
  if(kind==='owner'&&t>.45){
    const a=ease(t,.45,.46);g.save();g.globalAlpha=a
    plate(images['owner-report'],b.x+60+(1-a)*28,b.y+184,845,401);g.restore()
  }
  footer(b,kind==='owner'?'Give the site owner the exact change.':proof?'Open the fix. Watch the proof.':'Curb Cut for Chrome')
}
function readerShot(id,t){
  const b=shell('munich'),named=id!=='unnamed',reading=id==='reading'
  const im=images.munich,w=lerp(2105,1510,ease(t,0,4))
  content(im,b,0,Math.max(0,720-.47*w*b.h/b.w),w)
  const r=images[named?'reader-on':'reader-off']
  const f=reading?1:ease(t,named?.3:1,.52)
  if(f>0){g.save();g.globalAlpha=f;plate(r,b.x+104,b.y+b.h-167+(1-f)*22,728,106,[183,1131,927,135]);g.restore()}
  footer(b,named?'Previous slide':'Button','Munich Airport  /  screen reader')
}
function contrastShot(t){
  const b=shell('contrast'),p=ease(t,2.85,.8),z=ease(t,0,2.3)
  const w=lerp(4600,1970,z),x=lerp(320,1905,z)
  content(images['contrast-off'],b,x,3,w)
  g.save();g.globalAlpha=p;content(images['contrast-on'],b,x,3,w);g.restore()
  footer(b,'Text contrast',p<.99?'4.39:1':'4.50:1')
}
function jevShot(id,t){
  const b=shell('jev'),demo=id==='devNames',done=id==='accuracy'
  const start=demo?3.0:2.55
  const first=done?1:id==='newsite'?0:ease(t,start,.30),second=done?1:id==='newsite'?0:ease(t,start+(demo?2.28:1.16),.30)
  const data=[{rect:[281,127,54,55],row:1128,amount:first},{rect:[358,125,56,57],row:1272,amount:second}]
  inside(b,()=>{
    text('Reading view',b.x+109,b.y+119,37,585)
    for(const [i,item] of data.entries()){
      const y=b.y+186+i*178
      g.drawImage(images.meridiano,...item.rect,b.x+111,y,111,110)
      const x=b.x+265,w=915,h=112
      g.drawImage(images['jev-off'],190,item.row,1177,144,x,y,w,h)
      g.save();g.globalAlpha=item.amount;g.drawImage(images['jev-on'],190,item.row,1177,144,x,y,w,h);g.restore()
    }
  })
  footer(b,id==='newsite'?'A page without a saved fix':'TypeSafe Jev',done||demo&&t>9.9?'13 of 15 names correct':'Meridiano')
}
function examples(t){
  if(t<.98){const b=shell('mass');massBackground(b);footer(b,'A menu the keyboard cannot open.')}
  else if(t<2.02)readerShot('unnamed',1.6)
  else contrastShot(.3)
}
async function mapTask(id,t){
  const fixed=id==='mapFixed',b=shell('map')
  const s=fixed?Math.min(11.6,9.34+t*.88):Math.min(5.8,2.94+t*.72)
  const im=await movie('archive',s),w=lerp(1190,995,ease(t,0,2.8))
  const fit=content(im,b,20,0,w)
  const rect=fixed?(s<9.66?[100,20,49,40]:s<10?[201,24,129,36]:[441,15,110,50]):
    s>=3.27&&s<3.54?[100,20,49,40]:s>=3.54&&s<3.99?[201,24,129,36]:null
  if(rect)inside(b,()=>focus(fit(rect)))
  footer(b,fixed?'The same eight Tabs open View.':'Eight Tabs skip View.','OpenSeaMap')
}
async function mapReport(t,queued=false){
  const b=shell('map')
  mapBackground(b,await movie('archive',4.8))
  const s=queued?2.13:Math.min(2.15,.70+t*.79)
  const form=await movie('form',s)
  popup(b,form,t,[0,0,390,714],460)
  footer(b,queued?'Report queued':'Report a barrier',queued?'06:38:19 UTC':'Ctrl + Shift + U')
}
async function mapRule(t,detailed){
  const b=shell('mapSide')
  const im=await movie('archive',4.8)
  content(im,b,213,0,726)
  text('Grok wrote',107,413,87,645)
  text('the fix.',107,508,87,645)
  text('Let Tab reach View.',114,609,47,520)
  if(t>.62||detailed)text('Open the menu on focus.',114,672,47,520)
  text('16 seconds',115,778,27,505,gray)
}
async function mapVerdict(id,t){
  const pass=id==='mapPass',mouse=id==='mapMouse',b=shell('map')
  const time=mouse?1.35+t:pass?4.16+t:.2+t
  const complete=mouse?time>=28/15:pass?time>=68/15:t>.65
  const im=await movie(id,time)
  const w=lerp(642,593,ease(t,0,2)),fit=content(im,b,12,0,w)
  if(pass&&complete)inside(b,()=>focus(fit([196,7,49,23])))
  const who=mouse?'Mouse':'Keyboard'
  const session=mouse?'7168aa29':pass?'006b53ce':'700b66b7'
  footer(b,complete?who+(pass||mouse?' passed':' failed'):who+(pass?' with the fix':mouse?' hover':' without the fix'),'Kane replay  /  '+session,complete?pass||mouse:null)
}
async function verified(id,t){
  const shipped=id==='ship'||id==='publisher',b=shell(shipped?'mapSide':'map')
  const im=await movie('archive',Math.min(16.9,(id==='recordings'?14.15:15.45)+t))
  const fit=content(im,b,120,0,shipped?940:1160)
  inside(b,()=>focus(fit([441,15,110,50])))
  popup(b,im,t,[1386,46,486,944],shipped?355:435)
  if(shipped){
    text('Published',106,466,94,645)
    text('after a recheck.',111,550,70,530)
    text('06:49:55 UTC',116,697,29,490,gray)
  }else footer(b,id==='recordings'?'Watch the before and after.':'Sea Marks is right there.','Installed extension')
}
async function terminal(kind,t,passed=false){
  const id=kind==='checkTerm'?'check':kind==='gateTerm'?'gate':'retire'
  shell(id)
  const [x,y,w,h]=sizes[id],b={x:x+1,y:y+47,w:w-2,h:h-48}
  const im=await movie(kind,t)
  const badge=kind==='checkTerm'?(passed?'Keyboard passed':'Run curbcut check'):kind==='gateTerm'?(passed?'Claude can finish.':'Claude runs the Stop hook.'):'The fix retires.'
  inside(b,()=>{
    g.drawImage(im,0,0,1,1,b.x,b.y,b.w,b.h)
    const row=(sx,sy,sw,sh,dy,scale)=>g.drawImage(im,sx,sy,sw,sh,b.x+64,b.y+dy,sw*scale,sh*scale)
    if(kind==='gateTerm'){
      g.fillStyle='#f7f7f7';g.font='28px monospace'
      g.fillText('Stop hook',b.x+63,b.y+82)
      g.font='24px monospace'
      g.fillText(hookCommand,b.x+63,b.y+143)
      rounded(b.x+63,b.y+197,b.w-126,1,0,'#69696b')
      const offset=passed?295:0
      row(30,30+offset,1105,35,258,1.19)
      row(30,68+offset,650,38,337,1.62)
    }else if(kind==='checkTerm'){
      row(346,29,342,34,74,1.75)
      row(38,138,770,36,201,1.42)
      row(38,324,792,38,309,1.42)
      row(38,470,909,39,418,1.42)
    }else{
      row(28,24,800,37,80,1.52)
      row(30,61,708,40,198,1.65)
      row(31,394,642,38,337,1.65)
    }
  })
  const outcome=kind==='gateTerm'?(passed?true:t>1.7?false:null):kind==='checkTerm'?(passed&&t>6.4?true:t>1.6?false:null):null
  footer(b,kind==='checkTerm'&&outcome===false?'Keyboard failed':badge,id==='gate'?'Claude Code  /  gate recording':'Terminal',outcome)
}
async function trust(t){
  if(t<5.3){massPopup(t,'share');return}
  const b=shell('mass'),im=await movie('trust',Math.min(7.95,3.55+(t-5.3)*.63))
  content(im,b,110,32,1238);footer(b,'Watch the recorded keyboard run.','Curb Cut')
}
async function developer(id,t){
  switch(id){
    case 'devTask':opening('task',t);break
    case 'devBefore':
      if(t<5)await terminal('checkTerm',t*.49)
      else await shopProof('shopBefore',t-5,'Keyboard failed',1.90,false);break
    case 'devPatch':
      if(t<5.8)await terminal('checkTerm',lerp(3.2,11.9,t/5.8),true)
      else await shopProof('shopAfter',(t-5.8)*1.48,'Field Headphones added to cart.',6.25,true);break
    case 'devGateFail':
      if(t<6.5)await terminal('gateTerm',Math.min(5.4,t))
      else await shopProof('gateBefore',t-6.5,'Keyboard failed',1.75,false);break
    case 'devGatePass':
      if(t<5)await shopProof('gateAfter',t*1.6,'Field Headphones added to cart.',5.75,true)
      else await terminal('gateTerm',Math.min(10.9,7.3+t-5),true);break
    case 'devTrust':await trust(t);break
    case 'devNames':jevShot(id,t);break
    case 'devReport':
      if(t<2.9)await mapTask('mapSkip',t)
      else if(t<6.6)await mapReport((t-2.9)*.27)
      else await mapReport(1.08+(t-6.6)*.53);break
    case 'devRetire':
      if(t<8)await shopProof('retireShop',t,'The shop works on its own.',6,true)
      else await terminal('retireTerm',Math.min(7.95,(t-8)*1.63));break
    case 'devEnd':{
      const b=shell('shop')
      nativeShot(t<2.05?'reached':'added',b)
      footer(b,t<2.05?'Tab reaches Field Headphones.':'Field Headphones added to cart.','Native site repair')
      break
    }
    default:throw Error('Unknown developer shot '+id)
  }
}
let hookCommand
async function paint(id,t,duration){
  g.setTransform(1,0,0,1,0,0);g.fillStyle='white';g.fillRect(0,0,1920,1080)
  g.save()
  const amount=['end','signoff'].includes(id)?.004:id==='opened'||id==='skip'?.006:.016
  const zoom=1+amount*ease(t,0,duration)
  g.translate(960,540);g.scale(zoom,zoom);g.translate(-960,-540)
  try{
    if(id.startsWith('dev'))return await developer(id,t)
    switch(id){
      case 'shop':case 'skip':case 'key':opening(id,t);break
      case 'scale':stats(id,t);break
      case 'mistakes':examples(t);break
      case 'title':case 'switch':shopPopup(id==='title'?t:t+40/30);break
      case 'keyboard':await shopProof('shopBefore',Math.max(0,t-1.05),'Keyboard failed',5.2,false);break
      case 'mouse':case 'cart':await mouseShot(id==='cart',t);break
      case 'rule':shopRule(t);break
      case 'replay':await shopProof('shopAfter',t<2.89?.65+t:6.25+t-2.89,'Keyboard passed',6.25,true);break
      case 'share':case 'owner':massPopup(t,id);break
      case 'wide':case 'closed':case 'opened':case 'destination':await massShot(id,t);break
      case 'unnamed':case 'named':case 'reading':readerShot(id,t);break
      case 'contrast':contrastShot(t);break
      case 'newsite':case 'jev':case 'accuracy':jevShot(id,t);break
      case 'mapSkip':case 'mapFixed':await mapTask(id,t);break
      case 'mapReport':case 'queue':await mapReport(t,id==='queue');break
      case 'mapAgent':case 'agentRule':await mapRule(t,id==='agentRule');break
      case 'mapFail':case 'mapMouse':case 'mapPass':await mapVerdict(id,t);break
      case 'mapPopup':case 'ship':case 'publisher':case 'recordings':await verified(id,t);break
      case 'live':case 'proven':stats(id,t,await movie('archive',Math.min(16.85,15.85+t)));break
      case 'retireSite':await shopProof('retireShop',6+t,'The site’s own button works.',6,true);break
      case 'retire':{
        const b=shell('shop');nativeShot('added',b)
        footer(b,'Patch retired.','Curb Cut recheck',true);break
      }
      case 'end':case 'signoff':g.drawImage(images.close,0,0);break
      default:throw Error('Unknown shot '+id)
    }
  }finally{g.restore()}
}
function thumbnail(){
  g.setTransform(1,0,0,1,0,0);g.drawImage(images.close,0,0)
  g.fillStyle='white';g.fillRect(0,0,789,1080)
  text('Curb Cut for Chrome',112,360,43,565)
  text('The same keys',107,497,94,655)
  text('now open View.',107,606,94,655)
  g.fillStyle=blue;g.beginPath();g.arc(139,732,25,0,Math.PI*2);g.fill()
  g.beginPath();g.strokeStyle='white';g.lineWidth=5;g.lineCap='round';g.lineJoin='round'
  g.moveTo(126,732);g.lineTo(135,741);g.lineTo(152,723);g.stroke()
  text('Verified by Kane',183,747,41,545)
}
