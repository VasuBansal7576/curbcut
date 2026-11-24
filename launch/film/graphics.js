function pavement(t,closing=false) {
  const progress=clamp((t+.035)/.86)
  const s=1.13+.035*smooth(t/5.8)
  const p=(x,y,z)=>[1200+(x*.9-y*.76)*s,350+(x*.27+y*.49-z)*s]
  const height=(x,y)=>96-(x>=180&&x<=473?96*progress*clamp((y-90)/270):0)
  const plane=(points,fill,stroke,width=2)=>poly(points.map(([x,y,z])=>p(x,y,z)),fill,stroke,width)
  const deck=(x1,x2,y1,y2,h,fill)=>plane([[x1,y1,h(x1,y1)],[x2,y1,h(x2,y1)],[x2,y2,h(x2,y2)],[x1,y2,h(x1,y2)]],fill,ink,3)
  const high=()=>96
  for(let x=355;x<1050;x+=90) {
    const v=((t*24)%42)
    plane([[x,410+v,0],[x+42,410+v,0],[x+42,582+v,0],[x,582+v,0]],'rgba(244,241,234,.84)')
  }
  for(const [a,b,h] of [[0,180,high],[180,473,height],[473,720,high]]) {
    plane([[a,360,h(a,360)],[b,360,h(b,360)],[b,360,0],[a,360,0]],'rgba(244,241,234,.43)',ink,3)
  }
  deck(0,720,0,90,high,white)
  deck(0,180,90,360,high,white)
  if(progress>0)plane([[180,90,96],[180,360,96],[180,360,height(180,360)]],white,ink,3)
  deck(180,473,90,360,height,yellow)
  deck(473,720,90,360,high,white)
  plane([[473,90,96],[473,360,96],[473,360,height(473,360)]],'#777776',ink,2)
  for(const x of [90,315,600])plane([[x,0,96],[x,90,96]],null,ink,2)
  for(const x of [90,600])plane([[x,90,96],[x,360,96]],null,ink,2)
  for(const y of [170,260]) {
    plane([[0,y,96],[180,y,96]],null,ink,2)
    plane([[473,y,96],[720,y,96]],null,ink,2)
  }
  for(let j=0;j<5;j++)for(let i=0;i<9;i++){
    const x=195+32*i,y=235+23*j
    const [u,v]=p(x,y,height(x,y))
    const f=.24+.76*at(t,1+.06*i+.045*j,.45)
    disk(u,v,6.6,ink,4.3)
    disk(u-1.7,v-3.9*f,4.6,yellow,2.7)
  }
  const a=p(0,360,96),b=p(180,360,96),d=p(473,360,height(473,360)),e=p(473,360,96)
  traced([a,b,p(180,360,height(180,360)),d,e,p(720,360,96)],at(t,0,1.75),ink,5)
  const span=240*progress
  const cross=[[1035,772],[1272-span*.45,772],[1272+span*.55,843],[1672,843]]
  traced(cross,at(t,0,1.25),yellow,9)

}
function identity(shot,t) {
  const isClose=shot.id!=='title'
  print('CURB',66,410,338)
  print('CUT',66,688,338,yellow)
  pavement(t,isClose)
  print(isClose?'Verified by Kane.':'Fixing the web for people it shuts out.',78,826,isClose?66:57,white,'Overpass',650,1020)
  if(shot.id==='thumbnail')mono('43 KANE-VERIFIED FIXES LIVE',80,912,42,yellow)
}
function scaleGraphic(shot,t) {
  const start=onset(shot,'count'), end=onset(shot,'percent')
  const filled=t>=end?959:Math.floor(959*clamp((t-start)/(end-start)))
  mono('WEBAIM MILLION  /  2026',76,104,42,yellow)
  const value=t<start?'How often?':(filled/10).toFixed(1)+'%'
  print(value,62,491,t<start?170:245,white,'Highway',400,815)
  print('of top home pages',75,626,88)
  print('fail basic checks.',75,722,88)
  mono('1,000,000 home pages',78,866,42)
  ctx.save();ctx.translate(928+20*t/(shot.frames/30),162+14*t/(shot.frames/30))
  for(let j=0;j<25;j++)for(let i=0;i<40;i++){
    const x=i*22,y=j*28
    poly([[x,y],[x+8,y],[x+14,y+6],[x+18,y+6],[x+18,y+13],[x+11,y+13],[x+5,y+7],[x,y+7]],j*40+i<filled?red:white)
  }
  ctx.restore()
}
function rulesGraphic(shot,state,t,scene){
  const active=state==='focusRule'?'makeFocusable':state==='enterRule'?'bindEnterToClick':null
  const title=active==='makeFocusable'?'Make it reachable.':active?'Let Enter press it.':'Write a fix.'
  if(state)laneMark(2,80,74,t)
  print(title,68,362,186)
  if(!state||state==='lane2'){
    print('Kane’s failure',84,628,106);arrow(795,537,108)
    print('Agent’s repair',1040,628,106,yellow)
  } else {
    mono('div.add-to-cart',82,456,48,yellow)
    scene.shopRules.forEach((rule,i)=>{
      const y=505+i*95,on=rule.action===active
      if(on)rect(76,y,1570,80,yellow)
      mono('{ "action": "'+rule.action+'"'+(rule.value?', "value": "'+rule.value+'"':'')+' }',98,y+56,42,on?ink:white)
    })
  }
  paintLine(t)
}
function paintLine(t){
  const length=145+120*(1+Math.sin(t*.95))
  rect(79,156,length,12,yellow)
}
function resultsGraphic(state,t){
  mono('HELD-OUT TEST  /  LOCAL PLAYWRIGHT',78,103,46,yellow)
  const stages=['sample','barriers','fixed','hardCount','menusCount','panelsCount','tabsCount','modalsCount']
  const active=stages.indexOf(state)
  const cols=[[72,'2,050','sites attempted'],[743,'142','barriers found'],[1375,'99','fixed locally']]
  for(const [i,[x,value,label]] of cols.entries()){
    if(i>active)continue
    const travel=12*Math.sin(t*.63+i*.9)
    print(value,x+travel,426,221,i===2?yellow:white)
    print(label,x+travel+4,502,66)
    if(i<2 && i<active)arrow(x+(i===0?544:474),310,90)
  }
  if(active<0)print('Code frozen.',68+8*Math.sin(t),447,193)
  if(active>=3){
    for(let i=0;i<89;i++){
      const x=85+(i%30)*22,y=552+Math.floor(i/30)*27
      if(i<51)disk(x,y,8+1.5*Math.sin(t*2-i*.13),yellow)
      else {ctx.strokeStyle=white;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke()}
    }
    print('51 of 89 hard journeys',816,632,99,yellow)
    const categories=[['Hover menus','31 / 43'],['Disclosures','11 / 20'],['Tabs / carousels','5 / 14'],['Modal dialogs','3 / 11'],['Listboxes','1 / 1']]
    for(const [i,[label,count]] of categories.entries()){
      const x=80+i*345,selected=i===active-4
      if(selected)rect(x,691,328,135,yellow)
      print(count,x+13,760,72,selected?ink:yellow)
      print(label,x+13,807,41,selected?ink:white,'Overpass',680)
    }
  }
  print('Frozen repair code · randomly sampled Tranco sites · fixes measured locally',79,915,42,white,'Overpass',650)
  paintLine(t)
}
function shippedGraphic(state,t){
  mono('EXTENSION RELEASE',78,105,46,yellow)
  if(state==='shipped'||state==='published'){
    print('43',58,685,606,yellow)
    print('Kane-verified',751,468,164)
    print(state==='published'?'fixes live.':'fixes.',751,641,164)
    domes(788,748,13,2,45,t+.3,13)
  }else{
    print(state==='gate'?'Kane proves it.':'Before a fix ships.',68,518,198)
    print('The same journey must pass.',81,666,78,white,'Overpass',650)
  }
  paintLine(t)
}
