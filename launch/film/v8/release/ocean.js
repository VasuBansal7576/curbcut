const oceanShots=new Set(['mapSkip','mapReport','mapAgent','mapFail','mapMouse','mapPass','ship','mapFixed','mapPopup','live','proven','signoff','queue','agentRule','publisher','recordings','chapterReport'])
const mapFrame={x:118,y:175,w:1684,h:728}
function mapFoot(text){shopCaption(text,'',mapFrame.x,993)}
function mapCard(im,crop,title){
  nativeCard(im,mapFrame.x,mapFrame.y,mapFrame.w,mapFrame.h,crop,title)
}
function mapMenuCrop(left,top,width){return [left,top,width,width*mapFrame.h/mapFrame.w]}
async function mapTask(t,fixed){
  const s=fixed?Math.min(11.6,9.35+t*.85):Math.min(5.8,2.95+t*.72)
  const im=await clip('archiveMap',s)
  const z=step(t,0,2.6),crop=mapMenuCrop(mix(0,23,z),0,mix(1070,875,z))
  mapCard(im,crop,'OpenSeaMap  /  '+(fixed?'published extension':'original extension'))
  const search=fixed?s>=9.66&&s<10:s>=3.54&&s<3.99
  const logo=fixed?s<9.66:s>=3.27&&s<3.54
  if(logo)projectedRing(mapFrame,crop,[101,21,49,40])
  if(search)projectedRing(mapFrame,crop,[201,24,129,36])
  if(fixed&&s>=10.00)projectedRing(mapFrame,crop,[438,15,116,51])
  if(!fixed&&s>=3.99){
    const x=mapFrame.x+(443-crop[0])*mapFrame.w/crop[2]
    line(x,mapFrame.y+68*mapFrame.w/crop[2],x+100*mapFrame.w/crop[2],mapFrame.y+68*mapFrame.w/crop[2],O,6)
  }
  mapFoot(fixed?'The same eight Tabs reach View.':'Eight Tabs skip View. The menu stays closed.')
}
async function mapForm(t,queued=false){
  const take=queued?2.13:Math.min(2.17,.85+t*.86)
  const im=await clip('reportForm',take)
  const a=pop(t,0,.42),y=196+(1-a)*100
  for(const [i,name] of ['Ctrl','Shift','U'].entries()){
    const x=146+i*190,press=8*Math.sin(Math.PI*sat((t-.1*i)/.5))
    rr(x,433,162,141,23,D)
    rr(x,418+press,162,138,23,i===2?O:M,edge,2)
    type(name,x+81,508+press,46,620,D,'center')
  }
  type(queued?'Report queued':'Report a barrier',136,276,68,630)
  if(queued)src('06:38:19 UTC',142,869)
  else src('Keyboard shortcut',144,652)
  const box=queued?[12,444,371,273]:t<1.08?[10,17,370,433]:[12,446,371,272]
  const width=queued?873:t<1.08?650:790,height=width*box[3]/box[2],x=queued?820:t<1.08?939:866
  nativeCard(im,x,y,width,height,box,'Curb Cut  /  '+(queued?'verification queue':'extension report'))
  if(!queued&&t>1.20)headingMark('Queued',x,y+height+84)
}
async function mapRule(t,detailed){
  const im=await clip('archiveMap',4.8)
  const left=262,top=282,w=1396
  paper(left,top,w,540,25)
  src('OpenSeaMap  /  proposed repair',left+76,top+82)
  g.drawImage(im,437,16,119,49,left+76,top+141,252,104)
  type('Grok wrote the fix',left+400,top+219,68,630)
  line(left+77,top+279,left+w-77,top+279,edge,2)
  type('Let Tab reach View.',left+78,top+369,47,555)
  type('Open the menu when View gets focus.',left+78,top+444,47,555)
  const a=pop(t,.24,.35)
  g.save();g.globalAlpha=a;rr(left+w-371,top+132,299,88,17,D)
  type(detailed?'Keyboard repair':'16 seconds',left+w-221,top+190,39,610,M,'center');g.restore()
}
const lanes={
  mapFail:['oceanFail','keyboard without the fix','700b66b7',false,'View stays closed.'],
  mapMouse:['oceanMouse','mouse','7168aa29',true,'Hover opens View. Sea Marks appears.'],
  mapPass:['oceanPass','keyboard with the fix','006b53ce',true,'Tab opens View. Sea Marks appears.']
}
async function mapVerdict(id,t){
  const [movie,mode,session,pass,copy]=lanes[id]
  const time=id==='mapMouse'?1.35+t:id==='mapPass'?4.17+t:.2+t
  const completed=id==='mapMouse'?time>=28/15:id==='mapPass'?time>=68/15:true
  const im=await clip(movie,time)
  const crop=mapMenuCrop(13,0,530-24*step(t,0,2))
  mapCard(im,crop,'Kane recording  /  '+mode+'  /  '+session)
  if(id==='mapPass'&&completed)projectedRing(mapFrame,crop,[196,6,50,23])
  if(id==='mapMouse'&&completed)line(mapFrame.x+186*mapFrame.w/crop[2],mapFrame.y+63*mapFrame.w/crop[2],mapFrame.x+254*mapFrame.w/crop[2],mapFrame.y+63*mapFrame.w/crop[2],O,6)
  if(completed)verdict(pass?'Passed':'Failed',pass,1557,52)
  mapFoot(completed?copy:id==='mapPass'?'Press Tab to reach View.':'Move the pointer to View.')
}
async function shipped(t){
  const im=await clip('archiveMap',12.5+Math.min(3,t))
  const a=pop(t,0,.56)
  type('Published',173,462,99,640)
  type('in the extension',176,555,70,540)
  src('06:49:55 UTC',181,636)
  headingMark('Recorded evidence rechecked',180,782)
  const f=[1405,258,456,209]
  nativeCard(im,809,315+(1-a)*36,958,414,f,'Published extension  /  map.openseamap.org')
}
async function verifiedPopup(t,playback=false){
  const im=await clip('archiveMap',Math.min(16.85,(playback?13:12.55)+t*.95))
  const crop=[438,12,372,168]
  nativeCard(im,115,340,868,392,crop,'OpenSeaMap   /   View')
  ring(115+(441-438)*868/372,340+(17-12)*868/372,108*868/372,48*868/372)
  const slide=pop(t,0,.44),px=1087+(1-slide)*81
  const box=playback?[1392,345,472,620]:[1389,260,477,263]
  const w=playback?510:713,h=w*box[3]/box[2]
  nativeCard(im,px,playback?180:342,w,h,box,'Curb Cut   /   evidence')
  type(playback?'Watch the before and after recordings.':'Sea Marks is visible.',118,963,47,560)
}
async function oceanFrame(id,frame,duration){
  if(!oceanShots.has(id))return false
  const t=frame/30
  g.setTransform(1,0,0,1,0,0);surface();g.save()
  const z=1+.023*step(frame,0,duration)
  g.translate(960,540);g.scale(z,z);g.translate(-960,-540)
  if(id==='chapterReport'){
    if(t<2.9)await mapTask(t,false)
    else if(t<6.6)await mapForm(Math.min(.98,(t-2.9)*.7))
    else await mapForm(1.08+(t-6.6)*.48)
  }
  else if(id==='mapSkip'||id==='mapFixed')await mapTask(t,id==='mapFixed')
  else if(id==='mapReport'||id==='queue')await mapForm(t,id==='queue')
  else if(id==='mapAgent'||id==='agentRule')await mapRule(t,id==='agentRule')
  else if(lanes[id])await mapVerdict(id,t)
  else if(id==='ship'||id==='publisher')await shipped(t)
  else if(id==='mapPopup'||id==='recordings')await verifiedPopup(t,id==='recordings')
  else if(id==='live'||id==='proven'){
    surface(true);type('106',290,676,363,640,M);line(1016,422,1106,422,O,9)
    type('Live fixes',1014,533,74,590,M)
    if(id==='proven')type('62 proven by Kane',1014,635,50,550,M)
  }else if(id==='signoff')await renderBeat('end',2.77+t)
  g.restore();return true
}
async function oceanThumbnail(){
  g.setTransform(1,0,0,1,0,0);surface()
  const im=await clip('archiveMap',11)
  const crop=[435,13,374,202]
  type('Curb Cut',128,306,146,675)
  type('The same keys',134,419,68,540)
  type('now open View.',134,502,68,540)
  key(131,507,566,0,48)
  nativeCard(im,837,299,948,512,crop,'map.openseamap.org')
  ring(837+(440-435)*948/374,299+(18-13)*948/374,110*948/374,48*948/374)
}
