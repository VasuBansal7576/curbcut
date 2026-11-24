const pageTop=96, pageBottom=976
const chapter={
 shopping:'Keyboard journey',skip:'Keyboard journey',test:'01  /  Test',control:'01  /  Control',
 rules:'02  /  Write',prove:'03  /  Prove',share:'04  /  Share','mass-off':'Mass.edu','mass-on':'Mass.edu',
 names:'Munich Airport',contrast:'ExtremeTerrain',jev:'Meridiano',owner:'Site owner'
}
function masthead(shot,s,a,beat,age){
  const stage=chapter[shot.id]
  const title=beat?s.headline:shot.id.startsWith('mass-')?'Keyboard navigation':stage
  const source=a.run?'KANE  /  '+a.run.slice(0,8)+'  /  STEP '+a.step:
    shot.id==='contrast'?'LOCAL PROOF  /  WCAG AA':shot.id==='jev'?'EXPERIMENTAL  /  TYPESAFE JEV':
    shot.id==='owner'?'CURB CUT  /  EXTENSION':shot.id==='names'?'CHROMIUM  /  READING VIEW':'CHROMIUM  /  EXTENSION'
  rect(0,0,W,pageTop,ink);cover(0,0,W,pageTop)
  curbMark(38,32,.83)
  print(title,140,66,58,white)
  face(26,'Mono',600)
  const label=[stage.toUpperCase(),source].join('   ·   ')
  mono(label,W-42-ctx.measureText(label).width,59,26,yellow)
  rect(0,92,W,4,'#383a3a')
  rect(0,92,130+620*at(age,0,1.25),4,s.fail?red:yellow)
}
function anchor(s,a){
  const r=focusRect(s,a)
  if(!r)return [a.img.width*.5,a.img.height*.46]
  return [r[0]+Math.min(r[2]/2,360),r[1]+r[3]/2]
}
function camera(s,a,shot,t){
  const ratio=Math.min(1,t/(shot.frames/30))
  const [cx,cy]=anchor(s,a)
  const zoom=s.asset.startsWith('reader-')?.84+.10*smooth(ratio):s.meter?.88+.13*smooth(ratio):
    s.asset==='owner-report'?.78+.045*smooth(ratio):s.focus?1.14+.105*smooth(ratio):1.005+.075*smooth(ratio)
  const width=a.img.width*zoom,height=a.img.height*zoom
  const ax=s.meter?800:shot.id==='names'||shot.id==='jev'?450:720
  const x=s.asset==='munich-off'?0:Math.min(0,Math.max(W-width,ax-cx*zoom))
  const y=s.asset==='munich-off'?pageTop:Math.min(pageTop,Math.max(pageBottom-height,pageTop+397-cy*zoom))
  return {x,y,z:zoom}
}
function project(r,c){return [c.x+r[0]*c.z,c.y+r[1]*c.z,r[2]*c.z,r[3]*c.z]}
function keyline(r,age,bad=false){
  const [x,y,w,h]=r
  const points=[[x-4,y-3],[x+w+4,y-3],[x+w+4,y+h+3],[x-4,y+h+3],[x-4,y-3]]
  const progress=.14+.86*at(age,0,.34)
  traced(points,progress,ink,9);traced(points,progress,bad?red:yellow,5)
  cover(x-8,y-7,w+16,10);cover(x-8,y+h-3,w+16,10)
  cover(x-8,y,10,h);cover(x+w-2,y,10,h)
}
function notation(s,r,age){
  if(!s.callout)return
  const [x,y,w,h]=r
  face(38,'Overpass',700)
  const labelWidth=ctx.measureText(s.callout).width+44
  const leftSide=s.cross && x>labelWidth+84
  const start=leftSide?x-5:Math.max(18,Math.min(W-72,x+w+5)),centre=Math.max(146,Math.min(899,y+h*.5))
  const left=leftSide?start-labelWidth-55:Math.min(W-labelWidth-36,start+72),top=Math.max(146,Math.min(850,centre-79))
  const end=leftSide?left+labelWidth:left
  line(start,centre,end,top+36,ink,8);line(start,centre,end,top+36,yellow,3)
  cover(Math.min(start,end),Math.min(centre,top+36)-4,Math.max(6,Math.abs(end-start)),Math.abs(centre-top-36)+8)
  rect(left,top,labelWidth,66,ink);cover(left,top,labelWidth,66)
  rect(left,top,5,66,s.fail?red:yellow)
  print(s.callout,left+22,top+45,38,white,'Overpass',700)
}
function proofStamp(text,x,y,bad=false){
  face(32,'Mono',600)
  const width=ctx.measureText(text).width+34
  rect(x,y,width,49,bad?red:yellow);cover(x,y,width,49)
  mono(text,x+17,y+35,32,ink)
}
function meter(s,assets,age){
  const a=assets[s.asset],x=1045,y=365,w=730,h=284
  rect(x,y,w,h,ink);cover(x,y,w,h)
  mono('TEXT CONTRAST   /   WCAG AA',x+30,y+49,28,white)
  print(a.measurement.ratio.toFixed(2)+':1',x+24,y+164,139,yellow)
  mono(s.fail?'BELOW AA':'MEETS AA',x+433,y+143,32,white)
  const axis=v=>x+38+(v-4.30)/.30*(w-76)
  const base=y+209
  line(axis(4.30),base,axis(4.60),base,'#717270',3)
  for(let i=0;i<=30;i++){
    const px=axis(4.30+i*.01)
    line(px,base,px,base+(i%5?8:15),white,2)
  }
  const value=s.asset==='contrast-off'||s.pass?a.measurement.ratio:mix(assets['contrast-off']?.measurement.ratio??4.386958,a.measurement.ratio,at(age,0,.48))
  const tx=axis(4.50)
  line(tx,base-23,tx,base+20,white,3)
  poly([[axis(value),base-2],[axis(value)-8,base-17],[axis(value)+8,base-17]],yellow)
  mono('4.30',x+33,y+265,25);mono('AA 4.50',tx-55,y+265,25,yellow);mono('4.60',x+w-93,y+265,25)
}
function panelOverPage(img){
  const z=.365,w=img.width*z,h=img.height*z,x=W-w-70,y=350
  rect(x-4,y-4,w+8,h+8,ink);cover(x-4,y-4,w+8,h+8)
  ctx.drawImage(img,x,y,w,h)
}
function ownerPage(s,assets,t,age){
  const a=assets['owner-report'],hasPanel=!!s.panel
  const x=hasPanel?675:0, z=hasPanel?.49:.79+.032*smooth(age/2)
  const y=hasPanel?pageTop:s.headline==='Source change'?pageBottom-a.img.height*z+63*(1-smooth(age/2)):pageBottom-a.img.height*z
  rect(0,pageTop,W,pageBottom-pageTop,'#f4f1ea')
  ctx.drawImage(a.img,x,y,a.img.width*z,a.img.height*z)
  if(hasPanel){
    const img=assets[s.panel].img
    const scale=675/img.width
    const w=img.width*scale,h=img.height*scale
    rect(0,pageTop,674,pageBottom-pageTop,ink)
    ctx.drawImage(img,0,s.panel==='popup-multiple-fixes'?pageTop-23*at(age,0,1):pageTop-125-64*at(age,0,1.3),w,h)
    line(674,pageTop,674,pageBottom,yellow,5)
    cover(0,pageTop,(674-w)/2,pageBottom-pageTop);cover((674+w)/2,pageTop,(674-w)/2,pageBottom-pageTop)
  }else{
    const rectSource=s.focus?a.rect:[160,1498,800,201]
    keyline([x+rectSource[0]*z,y+rectSource[1]*z,Math.min(rectSource[2],1680)*z,rectSource[3]*z],age)
  }
}
function jevPage(shot,s,a,beat,t,study){
  const namesAt=shot.cues[0].words.find(([word])=>word==='names')[1]
  const z=(2/3)*(1+.037*t/(shot.frames/30)+.026*smooth((t-namesAt)/1.2))
  const c={x:-(a.img.width*z-W)*.22,y:pageTop-(a.img.height*z-(pageBottom-pageTop))*.44,z}
  ctx.drawImage(a.img,c.x,c.y,a.img.width*z,a.img.height*z)
  const named=s.asset==='jev-on'
  for(const target of a.targets){
    const [x,y,w,h]=project(target.rect,c)
    const accent=named?yellow:red
    rect(x-17,y+19,7,h-38,accent);cover(x-17,y+19,7,h-38)
    if(beat?.state==='pair'||named){
      const label=named?Math.round(target.confidence*100)+'% CONFIDENCE':'NO NAME'
      face(28,'Mono',600)
      const width=ctx.measureText(label).width+36,left=Math.min(W-56,x+w)-width,top=y+(h-48)/2
      rect(left,top,width,48,accent);cover(left,top,width,48)
      mono(label,left+18,top+34,28,ink)
    }
  }
  if(s.precision){
    const [correct,total]=study.names,x=1230,y=683,w=620,h=211
    rect(x,y,w,h,ink);cover(x,y,w,h)
    mono('EXPERIMENTAL  /  REAL SITES',x+24,y+41,25,yellow)
    print(correct+' of '+total,x+23,y+134,102,white)
    print('applied names correct',x+26,y+182,36,yellow,'Overpass',600)
  }
}
function footage(shot,s,previous,assets,beat,t,age,scene){
  const a=assets[s.asset]
  if(s.nav){
    ctx.save();ctx.translate(0,83);navigation(s,assets,t,age);ctx.restore()
    if(window.navProof){
      for(const word of [...window.navProof.lettering,...(window.navProof.kane?[window.navProof.kane]:[])])word.region[1]+=83
    }
  }else if(shot.id==='jev')jevPage(shot,s,a,beat,t,scene.study)
  else if(s.owner)ownerPage(s,assets,t,age)
  else{
    const target=camera(s,a,shot,t)
    const prior=previous && assets[previous.asset]
    let c=target
    if(beat && prior && prior.img.width===a.img.width && prior.img.height===a.img.height){
      const from=camera(previous,prior,shot,t),f=smooth(age/.62)
      c={x:mix(from.x,target.x,f),y:mix(from.y,target.y,f),z:mix(from.z,target.z,f)}
    }
    if(s.cross)c.y=Math.min(c.y,pageBottom-31-(s.focus[1]+s.focus[3])*c.z)
    ctx.drawImage(a.img,c.x,c.y,a.img.width*c.z,a.img.height*c.z)
    if(s.cross)keyline(project(s.cross,c),age,true)
    const raw=focusRect(s,a)
    if(raw){
      const r=project(raw,c)
      if(a.words){
        const words=project(a.words,c)
        keyline(words,age,s.fail)
        proofStamp(s.fail?'FAIL':'PASS',words[0]+words[2]+13,words[1]+(words[3]-49)/2,s.fail)
      }else keyline(r,age,s.fail)
      if(s.meter)meter(s,assets,age)
      else if(shot.id==='names'){
        if(s.callout && !a.words){
          const px=Math.min(1410,Math.max(970,r[0]+Math.min(r[2],815)+75)),py=Math.max(213,Math.min(746,r[1]-33))
          face(56,'Highway');const w=ctx.measureText(s.callout).width+50
          rect(px,py,w,83,ink);cover(px,py,w,83);print(s.callout,px+25,py+61,56,white)
          if(s.pass||s.fail)proofStamp(s.fail?'FAIL':'PASS',px,py+83,s.fail)
        }
      }else notation(s,r,age)
    }else if(s.fail && beat)proofStamp('FAIL  /  TARGET ABSENT',1084,466,true)
    if(s.rule){
      const x=1030,y=294,w=740,h=288
      rect(x,y,w,h,ink);cover(x,y,w,h)
      mono('div.add-to-cart',x+25,y+44,29,yellow)
      scene.shopRules.forEach((r,i)=>mono(r.action+(r.value?'  '+r.value:''),x+27,y+98+i*54,31,white))
    }
    if(s.panel)panelOverPage(assets[s.panel].img)
  }
  masthead(shot,s,a,beat,age)
}
function readout(shot,key,d){
  const integer=n=>n.toLocaleString('en-US')
  const view=(value,caption,legend,counts,detail)=>({value,caption,legend,counts,detail})
  const local=shot.id==='results'
  const map={
    count:view('2026','WebAIM Million','HOME PAGES',[0,1000],'One million home pages tested'),
    percent:view('95.9%','had detectable failures','HOME PAGES',[959,1000],'959 in every 1,000 home pages'),
    sixTypes:view('6 types','of common failures','DETECTED ERRORS',[96,100],'96% of detected errors'),
    freeze:view('Code frozen','before the draw','V5 STUDY',null,'Previously unseen Tranco domains'),
    sample:view(integer(d.sites5),'previously unseen sites','V5 SAMPLE',[d.sites5,d.sites5],'Sites selected before testing'),
    fixed:view(d.local5.join(' / '),'barriers fixed locally','V5  /  LOCAL',d.local5,'Pointer control · baseline · repaired task'),
    hardCount:view(d.hard.join(' / '),'hard journeys fixed','MULTI-STEP TASKS',d.hard,'Menus · disclosures · tabs · dialogs · listboxes'),
    sample6:view(integer(d.sites6),'new sites scouted','V6 SAMPLE',[d.sites6,d.sites6],'Independent held-out cohort'),
    categories:view(String(d.categories),'additional failure types','V6 CATEGORIES',[5,5],'Contrast · alternatives · links · buttons · language'),
    fixed6:view(d.local6.join(' / '),'barriers fixed locally','V6  /  LOCAL',d.local6,'118 registered tasks across five categories'),
    samples:view('Kane','sampled replays','INDEPENDENT REPLAY',null,'Baseline, pointer control and repaired replay'),
    v5:view(d.kane5.join(' / '),'v5 sample verified','V5  /  KANE',d.kane5,'Random sample of locally repaired cases'),
    v6:view(d.kane6.join(' / '),'v6 sample verified','V6  /  KANE',d.kane6,'Five cases in each of three naming categories'),
    limits:view('Run ledger','records each outcome','V5  /  KANE',d.kane5,'11 verified · 3 failed · 6 inconclusive'),
    inventory:view(String(d.inventory),'fixes live in the extension','RELEASE INVENTORY',[d.inventory,d.inventory],'Audited rules in the extension bundle'),
    shipped:view(String(d.verified),'fixes proven by Kane','RELEASE INVENTORY',[d.verified,d.inventory],'61 Kane-verified · 44 with local proof')
  }
  return map[key]??view(shot.id==='scale'?'How often?':local?'Held out':shot.id==='six'?'Next cohort':'Proof','',shot.id==='scale'?'WEBAIM MILLION':'STUDY RESULTS',null,'')
}
function studyGraphic(shot,beat,t,age,d){
  const id=shot.id,v=readout(shot,beat?.state,d)
  const heading=id==='scale'?'ACCESSIBILITY ON THE WEB':id==='results'?'HELD-OUT STUDY   /   V5':id==='six'?'HELD-OUT STUDY   /   V6':'VERIFICATION'
  curbMark(75,72,.84);mono(heading,173,101,32,white)
  line(75,143,1845,143,'#666761',2)
  const drift=14*smooth(t/(shot.frames/30))
  mono(v.legend,83,271,36,yellow)
  const size=v.value.length>8?169:v.value.length>6?207:249
  print(v.value,72+drift,515,size,white,'Highway',400,1075)
  print(v.caption,83+drift,622,67,white,'Overpass',650,1050)
  print(v.detail,84,881,39,white,'Overpass',550,1730)
  const x=1170,y=242,w=654,h=483
  if(v.counts){
    const [num,den]=v.counts
    const cols=den>=2000?68:den>=400?40:den>65?15:den>20?10:den<=5?5:5
    const rows=Math.ceil(den/cols),sx=w/cols,sy=Math.min(h/rows,den<10?135:104)
    const top=y+(h-rows*sy)/2
    const fill=num*ease((age+.055)/.86)
    for(let i=0;i<den;i++){
      const left=x+i%cols*sx,ty=top+Math.floor(i/cols)*sy,sw=sx*.69,sh=Math.min(sy*.58,sw*1.15)
      rect(left,ty,sw,sh,'#424541')
      if(i<fill)rect(left,ty,sw*Math.min(1,fill-i),sh,id==='scale'&&beat?.state==='percent'?red:yellow)
    }
  }else{
    for(let i=0;i<12;i++){
      const iy=y+24+i*36
      const start=x+(i%3)*46
      line(start,iy,x+w,iy,'#3c403d',4)
      line(start,iy,start+(w-(i%3)*46)*at(age,.036*i,.72),iy,i===5||i===6?yellow:'#858781',i===5||i===6?12:4)
    }
  }
  const run=clamp(t/(shot.frames/30))
  line(80,766,1840,766,'#3b3d3a',5)
  line(80,766,80+1760*run,766,yellow,8)
  disk(80+1760*run,766,9,yellow)
}
function masterIdentity(shot,t,beat,d){
  const age=beat?t-beat.local:t
  if(!beat&&shot.id!=='thumbnail'){pavement(-.04);return}
  curbMark(76,80,.86)
  mono(shot.id==='title'?'BROWSER ACCESSIBILITY':'CURB CUT  /  ACCESSIBILITY',181,109,29,white)
  print('CURB',64,431,343,white)
  print('CUT',64,712,343,yellow)
  ctx.save();ctx.translate(162,30);ctx.scale(.87,.87);pavement(age);ctx.restore()
  const caption=shot.id==='thumbnail'?d.inventory+' fixes live  /  '+d.verified+' verified by Kane':
    shot.id==='close'?'Verified by Kane.':'Accessibility repairs, in your browser.'
  print(caption,80,870,53,white,'Overpass',650,1150)
  line(80,917,1840,917,'#3e403b',3)
  line(80,917,80+1760*at(age,0,2.3),917,yellow,6)
}
function masterFrame(shot,scene,assets,frame,format){
  const t=frame/30,i=shot.beats?.findLastIndex(b=>b.local<=t+1e-8)??-1
  const beat=shot.beats?.[i],age=beat?t-beat.local:t
  const identity=['title','close','thumbnail'].includes(shot.id)
  const product=Object.hasOwn(chapter,shot.id)
  if(identity)masterIdentity(shot,t,beat,scene.study)
  else if(product){
    const s=scene.states[beat?.state??scene.initial]
    const previous=scene.states[i>0?shot.beats[i-1].state:scene.initial]
    footage(shot,s,previous,assets,beat,t,age,scene)
  }else studyGraphic(shot,beat,t,age,scene.study)
  if(shot.id!=='thumbnail')band(shot,t)
  window.pageShare=product?coverage():null
  return canvas.toDataURL('image/'+format,.985).split(',')[1]
}
