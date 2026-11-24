const canvas = document.querySelector('canvas')
const g = canvas.getContext('2d', {alpha:false})
const ink = '#161419', paper = '#ffffff', pink = '#fa4698'
const W = 1440, H = 810
const images = {}
const clamp = n => Math.max(0,Math.min(1,n))
const ease = n => 1-(1-clamp(n))**3
const mix = (a,b,v) => a+(b-a)*v
const img = async url => {const image=new Image(); image.src=url; await image.decode(); return image}
async function loadFilm(assets){for(const [key,url] of Object.entries(assets)) images[key]=await img(url)}
function fill(x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h)}
function text(value,x,y,size,color=ink,weight=550,family='"Helvetica Neue", Arial',spacing=-.047){
  g.font=weight+' '+size+'px '+family;g.letterSpacing=size*spacing+'px';g.textBaseline='top';g.fillStyle=color;g.fillText(value,x,y)
}
function mono(value,x,y,size=17,color=ink){text(value,x,y,size,color,500,'Menlo, monospace',0)}
function lines(rows,x,y,size,color=ink,step=1.02){rows.forEach((row,i)=>text(row,x,y+i*size*step,size,color,650))}
function round(x,y,w,h,r,color){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=color;g.fill()}
function rule(x,y,w,color='#777'){fill(x,y,w,1,color)}
function ring(x,y,w,h,alpha=1,k=0,travel=0){
  if(alpha<=0)return
  g.save();g.lineJoin='round'
  for(let i=3;i>=0;i--){g.globalAlpha=alpha*(i?.10*i/3:1);let v=i*travel;g.beginPath();g.roundRect(x-v-k,y-v*.12-k,w+2*k,h+2*k,Math.min(13,h/2));g.lineWidth=i?5:9;g.strokeStyle=pink;if(!i){g.shadowColor=pink;g.shadowBlur=12}g.stroke()}
  g.restore()
}
function mark(x,y,s=1,light=false){
  g.save();g.translate(x,y);g.scale(s,s);g.transform(1,-.14,0,1,0,4);g.lineWidth=5;g.strokeStyle=pink;g.beginPath();g.moveTo(38,10);g.lineTo(38,6);g.quadraticCurveTo(38,0,31,0);g.lineTo(8,0);g.quadraticCurveTo(0,0,0,8);g.lineTo(0,17);g.quadraticCurveTo(0,24,8,24);g.lineTo(31,24);g.quadraticCurveTo(38,24,38,17);g.stroke();g.restore()
  text('Curb Cut',x+53*s,y-5*s,33*s,light?paper:ink,680)
}
function gradient(y0,y1,end=.94){
  const grad=g.createLinearGradient(0,y0,0,y1);grad.addColorStop(0,'#16141900');grad.addColorStop(1,'rgba(22,20,25,'+end+')');fill(0,y0,W,y1-y0,grad)
}
function photo(image,x,y,w,h,sx=0,sy=0,sw=image.width,sh=image.height){g.drawImage(image,sx,sy,sw,sh,x,y,w,h)}
function clip(x,y,w,h,draw){g.save();g.beginPath();g.rect(x,y,w,h);g.clip();draw();g.restore()}
function tag(value,x,y,light=false){
  g.font='500 19px Menlo';g.letterSpacing='0px';const w=g.measureText(value).width+32
  round(x,y,w,37,18,light?paper:ink);mono(value,x+16,y+8,18,light?ink:paper)
}
function follow(image,scale,ax,ay,dx=0,dy=0){
  const x=ax*(1-scale)+dx,y=ay*(1-scale)+dy
  photo(image,x,y,W*scale,900*scale)
  return (box)=>[x+box[0]*scale,y+box[1]*scale,box[2]*scale,box[3]*scale]
}
function popup(t,visible){
  const x=1072+390*(1-visible), y=50
  round(x,y,333,162,14,paper);mark(x+22,y+23,.78);mono('www.mass.edu',x+22,y+73,16);rule(x+20,y+102,293,'#ccc')
  text('Apply fixes',x+22,y+117,23);round(x+255,y+115,59,32,16,t?pink:'#777');round(x+(t?284:259),y+119,24,24,12,paper)
}
function opening(id,t,d){
  let fixed=id==='found', asset=fixed&&t>=1.1?'massAfter':'massBefore'
  let z=fixed?1.27+.32*t/d:1+.3*t/d
  let map=follow(images[asset],z,45,170)
  const here=map([15,169.39,79.65,33.92]),there=map([17,204.625,161.58,26])
  let p=fixed?ease((t-3.05)/.83):ease((t-2.13)/.75)
  const lost=id==='lost'?ease((t-4.7)/1.05):0
  ring(fixed?mix(here[0],there[0],p):mix(1060,here[0],p)-lost*95,fixed?mix(here[1],there[1],p):mix(68,here[1],p),fixed?mix(here[2],there[2],p):here[2],fixed?mix(here[3],there[3],p):here[3],fixed?1:1-lost,3*Math.exp(-4*Math.abs(t-(fixed?3.9:2))),fixed?11*(1-p):18*(1-p))
  gradient(250,H)
  if(fixed){
    if(t<4.2)popup(t>1.1,ease(t/.5)*(1-ease((t-3.4)/.8)))
    mono('KEYBOARD  /  EXTENSION ENABLED',49,524,18,paper);text(t<3.4?'About.':'The DHE.',40,566,142,paper,670)
    mark(53,747,.79,true)
  }else{
    mono('MASS.EDU  /  KEYBOARD ONLY',49,519,18,paper)
    text(t<4.5?'One more Tab.':'Where did it go?',40,564,t<4.5?130:119,paper,680)
    tag(t<3.9?'Tab ⇥':'↓  Arrow Down',54,740,true)
  }
}
function replay(id,t,d,video){
  const routeChanges=['pointer','keyboardpass','mouse'].includes(id)
  let zoom=1+.13*t/d
  const ax=.58, x=W*ax*(1-zoom)
  photo(video,x,0,W*zoom,W*(720/1280)*zoom,0,0,video.width,video.height*.9)
  gradient(335,H)
  const data={
    mouse:['POINTER CONTROL','Hover. Click.','Kane  /  385196a9'],
    fail:['KEYBOARD ONLY','About stays closed.','Kane  /  efcfdd9f'],
    keyboard:['BEFORE  /  KEYBOARD','Arrow Down.','No visible or accessible “The DHE” control appeared.'],
    pointer:['CONTROL  /  MOUSE','The link exists.','Kane reached /about/aboutdhe.asp'],
    keyboardpass:['AFTER  /  KEYBOARD','The same destination.','Kane reached /about/aboutdhe.asp']
  }[id]
  if(routeChanges&&t>d*.54){data[1]=id==='mouse'?'The DHE.':'Department reached.'}
  mono(data[0],48,520,20,paper);text(data[1],40,565,100,paper,645);mono(data[2],52,736,21,paper)
  if(id==='fail'||id==='keyboard'){let scale=W/1280*zoom;ring(x+716*scale,77*scale,59*scale,29*scale,.94,2*Math.sin(t*3)**2)}
}
function unit(id,t,d,video){
  const passed=id==='unitpass',z=1+.12*t/d
  fill(0,0,W,H,passed?paper:ink);const fg=passed?ink:paper
  mono('UNITCONVERTERS.NET  /  KANE REPLAY',46,48,18,fg)
  lines(passed?['One meter.','0.001 km.']:['The answer','runs off','the edge.'],36,174,105,fg,.92)
  mono(passed?'595c3531  /  PASS':'a496782e  /  FAIL',47,694,23,fg)
  const x=850,w=460;clip(x,65,w,680,()=>photo(video,x,65,w*z,1150*z));ring(x-6,64,w+12,684,1)
  mono('320 CSS pixels',x,760,18,fg)
}
function editorial(title,light=true){
  fill(0,0,W,H,light?paper:ink);mono(title,48,38,19,light?ink:paper);rule(48,84,1344,light?'#bbb':'#575559')
}
function writer(id,t,d){
  const v=t/d
  editorial(id==='trace'?'PROVENANCE   /   UNITCONVERTERS.NET':'CODING AGENT   /   UNITCONVERTERS.NET',false)
  g.save();g.translate(-7*v,5-12*v);g.scale(1+.018*v,1+.018*v)
  if(id==='diff'){
    text('Stack the cells.',45,157,103,paper,650)
    const rows=['[','  { "selector": "table", "action": "injectCSS",','    "value": { "display": "block" } },','  { "selector": "td", "action": "injectCSS",','    "value": { "display": "block" } }',']']
    rows.forEach((l,i)=>mono(l.slice(0,Math.floor(clamp((t-.35*i)/.85)*l.length)),65,358+50*i,28,paper))
    mono('Written by codex exec   /   gpt-6.2-sol',54,740,20,pink)
  }else{
    mono('KANE  /  FAILED ASSERTION',50,139,19,pink)
    lines(['“the complete To value field fits','within the 320-pixel viewport”'],44,184,58,paper,1.05)
    rule(50,365,1338,'#575559')
    mono('CODEX RECEIVES   ↘',51,406,20,pink)
    const idtext='a496782e-9c55-4b05-86a4-5523941bb947'
    mono(idtext.slice(0,Math.floor(ease((t-.45)/2)*idtext.length)),52,462,33,paper)
    const words=id==='trace'?'runner: kane      writer: codex exec':'{ "selector": "td", "action": "injectCSS", "value": { "display": "block" } }'
    mono(words.slice(0,Math.floor(ease((t-d*.32)/(d*.35))*words.length)),54,596,id==='trace'?40:25,paper)
    const travel=ease((t-d*.25)/(d*.42))
    ring(38, mix(170,565,travel),mix(1090,1260,travel),mix(141,85,travel),.8,1,Math.sin(Math.PI*travel)*10)
    mono(id==='trace'?'attempt-1/provenance.json':'table, td   /   proposed layout change',53,733,19,paper)
  }g.restore()
}
function announcements(t,d){
  const speech=window.cues.filter(s=>s.shot==='reader'),named=t>=(speech.at(-1)?.start??52)-47
  const z=1+.29*t/d;const map=follow(images.munich,z,6,335)
  const r=map([6,335,44,50]);ring(...r,1,3*Math.sin(t*2)**2)
  gradient(275,H);mono('MUNICH AIRPORT  /  READING VIEW',48,483,18,paper)
  text(named?'Vorherige Folie.':'button.',39,542,named?125:153,paper,670)
}
function jev(id,t,d){
  let z=1+.2*t/d,side=id==='jevdetail'
  fill(0,0,W,H,paper)
  const image=images.meridiano
  clip(side?650:0,0,side?790:W,H,()=>{
    let x=side?650:0,w=side?1080:1440
    photo(image,x,0,w*z,158*z*w/1440,0,0,2880,316)
    photo(image,x,158*z*w/1440,w*z,690*w/1440*z,0,901,2880,1380)
    let sc=w*z/1440
    const arrival=id==='jev'?window.cues.filter(c=>c.shot==='jev').at(-1).start-54:d*.7;const ix=mix(142,182,ease((t-arrival+.15)/.26))
    ring(x+ix*sc,65*sc,24*sc,24*sc,1,2*Math.sin(t*3)**2)
  })
  if(side){
    mono('TYPESAFE JEV  /  PUBLIC REVIEW',44,68)
    text('13 of 15',36,180,127);text('names correct.',40,326,77)
    lines(['Names applied on seven sites.','Two decisions were too vague.'],47,514,34)
  }else{
    gradient(240,H);let speech=window.cues.filter(s=>s.shot==='jev'),span=speech.filter(s=>s.voice!=='af_heart'),word=t>=(span.at(-1)?.start??62)-54?'Buscar.':t>=(span[0]?.start??60)-54?'Menú.':'button.'
    mono('MERIDIANO  /  LIVE NAMING',49,494,19,paper);text(word,39,547,151,paper,670)
    mono('First names applied  /  1.128 s',52,746,20,paper)
  }
}
function report(id,t,d){
  const v=t/d;editorial('SITE OWNER COPY   /   WWW.MASS.EDU')
  text(id==='owner'?'Repair the source.':'Send the evidence.',40,135,94)
  const x=54-v*10,y=302-20*v
  photo(images.report,x,y,1115+50*v,530+24*v)
  const mag=(1115+50*v)/650
  const which=ease((t-d*.46)/.73)
  ring(x+32*mag,y+(126+31*which)*mag,mix(560,498,which)*mag,32*mag,.88,1,8*Math.sin(Math.PI*which))
}
function closing(id,t,d){
  fill(0,0,W,H,ink);const v=t/d,grow=.86+.14*v
  g.save();g.translate(58-12*v,74-10*v);g.scale(grow,grow);mark(0,0,1.3,true);g.restore()
  if(id==='release'){
    const reveal=ease(t/1.1)
    text(String(Math.round(105*reveal)),35,190,235,paper,690);text('repairs in Chrome.',50,442,104,paper)
    mono('61 Kane-verified   /   44 locally verified',56,619,25,paper)
  }else{
    lines(['Try the next','key.'],38,175,150,paper,.9)
    mono('Curb Cut for Chrome',55,589,27,paper)
  }
  const z=1+.06*v;g.save();g.translate(51,696);g.scale(z,z);ring(0,0,588,68,1,1.3*Math.sin(t*2)**2);mono('github.com/VasuBansal7576/curbcut',23,22,24,paper);g.restore()
}
function task(t,d){
  editorial('MASS.EDU   /   REGISTERED TASK')
  text('Find the department.',39,123,90)
  const z=.92+.1*t/d
  clip(52,280,1334,442,()=>photo(images.massAfter,52,210,1440*z,900*z))
  ring(52+17*z,210+204.625*z,161.58*z,26*z,1,2*Math.sin(t*2)**2)
  mono('Expected destination   /   /about/aboutdhe.asp',54,749,21)
}
function nightly(t,d){
  editorial('RECHECK   /   PUBLIC EVIDENCE',false);text('Try it without the rule.',39,145,92,paper)
  const rows=[['10','still verified'],['7','inconclusive'],['1','re-patched']]
  rows.forEach(([n,label],i)=>{let x=49+i*460;rule(x,340,420,'#777');text(n,x,375,133,paper);text(label,x,539,43,paper)})
  ring(44+460*clamp(t/(d*.85))*2,327,422,284,.82)
  mono('18 public rechecks   /   prior status preserved on inconclusive evidence',52,716,20,paper)
}
function pending(id,t,d){
  const table={
    check:[['curbcut check'],['Kane fails the task','Agent receives the reason','Kane tests the revision']],
    gate:[['curbcut gate'],['Stop hook runs','Failing task returns','Agent edits the source']],
    trust:[['Open the proof.'],['Inspect the status','Play the recording','Follow the destination']],
    shortcut:[['Report a barrier.'],['Press the shortcut','Capture the task','Review the report']],
    retire:[['Retire the rule.'],['Site repairs its source','Unpatched task passes','Extension drops the fix']]
  },[title,steps]=table[id]
  editorial('RECORDING PENDING   /   '+id.toUpperCase(),false)
  text(title[0],38,167,111,paper,650)
  mono('EXPECTED CAPTURE   /   '+d+' seconds',51,313,20,'#cccccc')
  g.save();g.translate(-8*t/d,-10*t/d);g.scale(1+.035*t/d,1+.035*t/d)
  const v=t/d,index=Math.min(2,Math.floor(v*3))
  for(let i=0;i<3;i++){
    const y=402+i*104
    mono('0'+(i+1),51,y+13,23,i===index?pink:'#bcbcbc')
    text(steps[i],122,y,45,i===index?paper:'#bcbcbc',540)
  }
  const y=386+104*(ease((t-d/3+.27)/.55)+ease((t-2*d/3+.27)/.55))
  ring(37,y,Math.min(1070,800+70*v),78,.95,1,8*Math.sin(Math.PI*(v*3%1)));g.restore()
}
function contrast(t,d){
  const on=t>2.9,plate=on?images.contrastOn:images.contrastOff
  editorial('EXTREMETERRAIN   /   LOCAL CONTRAST MEASUREMENT')
  const v=t/d
  photo(plate,46,130,1348,292,0,0,5400,1170)
  mono('Details link',52,478,23)
  text(on?'4.501 : 1':'4.387 : 1',40,535,122)
  const mx=755,my=483,scale=1.2+.16*v
  clip(mx,my,640,194,()=>photo(plate,mx,my,640,194,2680,71,640/scale,194/scale))
  ring(mx+(2717.66-2680)*scale,my+(95-71)*scale,268.2*scale,105*scale,.95)
  mono(on?'Extension enabled   /   measured ratio':'Extension paused   /   measured ratio',50,730,21)
}
async function drawShot(shot,t,recording){
  g.setTransform(4/3,0,0,4/3,0,0);fill(0,0,W,H,paper);const id=shot.id,d=shot.duration
  if(recording&&shot.incoming){photo(recording,0,0,W,H);return}
  if(id==='lost'||id==='found')opening(id,t,d)
  else if(['mouse','fail','keyboard','pointer','keyboardpass'].includes(id))replay(id,t,d,recording)
  else if(['unitfail','unitpass'].includes(id))unit(id,t,d,recording)
  else if(['write','trace','diff'].includes(id))writer(id,t,d)
  else if(id==='reader')announcements(t,d)
  else if(id==='jev'||id==='jevdetail')jev(id,t,d)
  else if(id==='report'||id==='owner')report(id,t,d)
  else if(id==='release'||id==='install')closing(id,t,d)
  else if(id==='task')task(t,d)
  else if(id==='contrast')contrast(t,d)
  else if(id==='night')nightly(t,d)
  else pending(id,t,d)
}
