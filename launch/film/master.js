function rail(x,y,w,color=lime){roundBox(x,y,w,6,3,color)}
function typeFrame(lines,size,age,emphasis,sub=''){
  ground()
  const x=122+48*(1-at(age,0,.34))+32*travel(age)
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
  curbObject(1435-50*travel(age),808-68*travel(age),.72+.10*travel(age),age+1)
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
function travel(t){return smooth(t/window.beatLength)}
function hero(title,host,t,options={}){
  ground()
  const {x=90,y=193,w=1740,h=706,category='',status=''}=options
  print(title,x-5,144,105,white,'Tight',800,status?1000:1390)
  if(category){
    face(37,'Mono',600)
    print(category,x+w-ctx.measureText(category).width,137,37,lime,'Mono',600)
  }
  if(status){
    const col=status==='FAIL'?coral:lime
    roundBox(x+w-293,60,293,100,19,col)
    print(status,x+w-257,138,78,ink,'Mono',780)
  }
  browserFrame(x,y,w,h,host)
  return {x,y:y+74,w,h,p:travel(t)}
}
function menuShot(a,open,t){
  const v=hero(open?'Menu open.':'Menu closed.','mass.edu',t,{category:'Keyboard'})
  const target=a.letters.trigger.bounds
  const z=.72+.23*v.p
  const project=plate(a,v.x,v.y,v.w,v.h,0,target[1]-82+12*v.p,z)
  corners(project(target),open?lime:coral,t)
}
function readingShot(state,a,t){
  const spanish=state.startsWith('jev'),named=state==='reader-on'||state==='jev-on'
  const title=spanish?(state==='jev-off'?'An unfamiliar page.':state==='jev'?'Meet Jev.':'Buttons with names.'):(named?'Previous slide.':'Just “button.”')
  const v=hero(title,spanish?'meridiano.net  /  Reading view':'munich-airport.de  /  Reading view',t,{category:spanish?'Live naming':'Screen reader'})
  const row=a.targets[0],z=1.13+.11*v.p
  const project=plate(a,v.x,v.y,v.w,v.h,row.words[0]-(94-18*v.p)/z,row.rect[1]-row.rect[3]-(v.h/z-row.rect[3]*4)/2,z)
  for(const target of a.targets){
    const [x,y,w,h]=project(target.words)
    roundBox(x-24,y-11,w+48,h+22,12,alpha(named?cobalt:coral,.085))
    line(x,y+h+7,x+w*at(t+.15,0,.48),y+h+7,named?cobalt:coral,6)
  }
}
function contrastShot(a,ok,t){
  const v=hero(ok?'Made readable.':'Too faint.','extremeterrain.com',t,{category:'Low vision'})
  const [sx,sy,sw,sh]=a.rect,z=.34+.056*v.p
  const project=plate(a,v.x,v.y,v.w,v.h,sx+sw/2-v.w*.56/z,0,z)
  const [xx,yy,ww,hh]=project(a.rect)
  corners([xx,yy,ww,hh],white,t)
  const x=v.x+v.w*.48,y=v.y+212-20*v.p,w=765,h=310
  line(xx+ww/2,yy+hh+12,x+124,y,ink,9)
  line(xx+ww/2,yy+hh+12,x+124,y,white,4)
  ctx.save();ctx.shadowColor=alpha(ink,.36);ctx.shadowBlur=35;ctx.shadowOffsetY=14
  roundBox(x-5,y-5,w+10,h+10,21,white);ctx.restore()
  const shade=a.img.getContext('2d').getImageData(sx-2,sy+2,1,1).data[0]
  roundBox(x,y,w,h,17,'rgb('+[shade,shade,shade].join(',')+')')
  const detail=1.10+.14*v.p,dx=x+(w-sw*detail)/2,dy=y+(h-sh*detail)/2
  ctx.drawImage(a.img,sx,sy,sw,sh,dx,dy,sw*detail,sh*detail)
  window.sourceScale=Math.max(window.sourceScale,detail)
  corners([dx,dy,sw*detail,sh*detail],ok?lime:coral,t)
}
function kaneShot(a,state,t,detail){
  const fail=state==='failed',pass=state==='passed',movie=state==='record'
  const v=hero(movie?'That’s the proof.':pass?'Destination reached.':'Open About.','mass.edu  /  Kane replay',t,{x:172,w:1576,h:760,y:180,status:fail?'FAIL':pass?'PASS':''})
  if(movie){
    const [,,sw,sh]=a.clip.crop,idx=Math.min(29,Math.floor(t*12)),z=v.w/sw+.016*v.p
    const cropW=v.w/z,cropH=v.h/z
    ctx.drawImage(a.img,(idx%5)*sw+(sw-cropW)/2,Math.floor(idx/5)*sh+24,cropW,cropH,v.x,v.y,v.w,v.h)
    window.sourceScale=Math.max(window.sourceScale,z)
    const label=idx<a.clip.destinationFrame?'About → The DHE':'About the Department of Higher Education'
    face(54,'Tight',720)
    const boxWidth=ctx.measureText(label).width+100
    roundBox(v.x+45,v.y+v.h-142,boxWidth,98,13,ink)
    rect(v.x+65,v.y+v.h-118,7,52,lime)
    print(label,v.x+91,v.y+v.h-73,54,white,'Tight',720)
  }else{
    const rect=pass?[470,237,609,36]:[1086,87,78,30]
    const z=(pass?1.14:1.02)+(pass?.104:.22)*v.p
    const project=plate(a,v.x,v.y,v.w,v.h,rect[0]-(pass?200:870)/z,pass?88:18,z)
    const [x,y,w,h]=project(rect)
    corners([x,y,w,h],fail?coral:pass?lime:white,t)
    if(!pass){
      const xx=v.x+v.w*.47,yy=v.y+270-22*v.p,ww=366,hh=186
      line(x+w/2,y+h+12,xx+ww*.46,yy,white,5)
      roundBox(xx-7,yy-7,ww+14,hh+14,10,white)
      const box=detail.letters.trigger.bounds,k=1.08+.15*v.p
      const inner=plate(detail,xx,yy,ww,hh,box[0]-(ww/k-box[2])/2,box[1]-(hh/k-box[3])/2,k)
      corners(inner(box),fail?coral:white,t)
    }
  }
  const track=v.y+v.h-10
  rect(v.x,track,v.w,10,ink)
  rect(v.x,track,v.w*(.08+.89*v.p),10,fail?coral:lime)
}
function popupShot(a,state,t){
  const proof=state==='popup-proof',inventory=state==='inventory'
  const title=inventory?'105 fixes live today.':proof?'See the proof.':state==='switch-off'?'Turn it on.':'Curb Cut is on.'
  const v=hero(title,'Curb Cut  /  Chrome extension',t,{category:proof?'Evidence':'Chrome extension'})
  const [sx,sy,sw,sh]=a.rect,p=v.p
  const z=inventory||proof?.91+.085*p:.896+.031*p,focus=sx+sw/2
  let top=61+22*p
  if(inventory)top=680+550*p
  if(proof)top=sy-225+60*p
  plate(a,v.x,v.y,v.w,v.h,focus-v.w/z/2,top,z)
}
function reportShot(a,t){
  const v=hero('For the site owner.','Curb Cut  /  Site report',t)
  const z=1.09+.055*v.p
  plate(a,v.x,v.y,v.w,v.h,35*v.p,32*v.p,z)
}
function populationShot(state,t){
  const p=travel(t),number=state==='percent',filled=Math.round(959*(number?.43*p:.43+.57*p))
  ground()
  print('95.9%',96,684,320,lime,'Tight',820,933)
  for(let n=0;n<1000;n++){
    const row=Math.floor(n/40),col=n%40
    disk(1097+col*17.1,265+row*18.5,n<filled?6.2:3.6,n<filled?lime:alpha(white,.43))
  }
  rect(124,782,1662,4,alpha(white,.4))
  if(!number)print('of the top million home pages have barriers.',124,903,68,white,'Tight',640)
}
function paint(state,age,assets,assetKey){
  const a=assets[assetKey]
  switch(state){
    case 'key':case 'same-key':
      ground()
      typeLines(state==='key'?['Press','Tab.']:['Same','keys.'],117,467,218,white,780,.83)
      keycap(1302,553+(state==='same-key'?62*Math.sin(Math.PI*travel(age)):0),1.37,age)
      break
    case 'switch-off':case 'switch-on':case 'inventory':case 'popup-proof':popupShot(a,state,age);break
    case 'key-hit':
      ground()
      keycap(977,547,2.12,age)
      break
    case 'closed':case 'opened':menuShot(a,state==='opened',age);break
    case 'millions':typeFrame(['For millions,','this is the web.'],166,age,'millions');break
    case 'mouse':ground();typeLines(['Mouse','only.'],114,481,201,white);pointerObject(1180-120*travel(age),286-76*travel(age),408+21*travel(age),age);break
    case 'anonymous':ground();typeLines(['No','name.'],114,481,201,white);blankTag(1360,518,1.1,age);break
    case 'faint-word':ground();print('Too',117,482,230,white);print('faint.',112,706,269,toned(ink,white,.56+.14*at(age,0,.9)));rail(132,783,248,coral);break
    case 'percent':case 'population':populationShot(state,age);break
    case 'years':ground();curbObject(1240,724,1.10,age,false);typeLines(['Years','to fix.'],105,466,209,white,754);break
    case 'cant-wait':typeFrame(['People','can’t wait.'],218,age,'wait');break
    case 'sign':brandStamp(age);break
    case 'brand':case 'now':case 'end':case 'end-line':case 'thumbnail':brandFrame(state,age);break
    case 'reader-off':case 'reader-on':case 'jev-off':case 'jev':case 'jev-on':readingShot(state,a,age);break
    case 'contrast-off':case 'contrast-on':contrastShot(a,state==='contrast-on',age);break
    case 'guess':typeFrame(['No guessing.'],224,age,'guessing');break
    case 'kane':ground();print('Kane',116,540,298,white);print('An AI tester.',126+68*(1-travel(age)),752,154,lime,'Tight',760);break
    case 'replay':case 'failed':case 'passed':case 'record':kaneShot(a,state,age,assets[a.magnifierSource]);break
    case 'quiet':typeFrame(['Unsure?','Stay quiet.'],192,age,'quiet');break
    case 'paper':typeFrame(['Pass it on.'],235,age,'on');break
    case 'report':reportShot(a,age);break
    case 'retire':ground();curbObject(1400,748,.82,age);typeLines(['One day,','it just works.'],110,470,151,white,1000,.92);break
    default:throw Error('Unknown picture '+state)
  }
}
