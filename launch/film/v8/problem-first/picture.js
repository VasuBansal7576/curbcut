async function previewAssets(){
  const plate='../plates/'
  assets.reading=await still(plate+'reader-on.png')
  for(const name of ['sharedFix','recordingLinks'])assets[name]=await still(directory+name+'.png')
}
function headingMark(copy,x,y){
  line(x,y-12,x+53,y-12,O,7)
  type(copy,x+72,y,35,575)
}
function isolatedExamples(t){
  const items=[['nav','About'],['arrow','Button'],['details','Details']]
  items.forEach(([name,caption],i)=>{
    const x=296+i*469,y=400+26*(1-pop(t,.11*i,.7)),w=365,h=198
    paper(x,y,w,h,25)
    if(i===0)g.drawImage(assets.nav,0,0,310,133,x+43,y+43,263,113)
    else if(i===1)draw(name,x+133,y+44,100,105)
    else{rr(x+26,y+23,w-52,h-46,17,D);g.drawImage(detailLayers[0],x+71,y+56,225,85)}
    src(['Keyboard menu','Screen-reader name','Text contrast'][i],x,y+h+64)
  })
}
function repairRule(t){
  const x=413,y=289,w=1094
  src('Stillroom  /  proposed fix',x,y-45)
  paper(x,y,w,493,28)
  type('Add to cart',x+70,y+108,69,635)
  src(document.documentElement.dataset.selector,x+70,y+162)
  line(x+68,y+213,x+w-68,y+213,edge)
  keyCaption('Tab','Reach the button.',x+72,y+306)
  const a=pop(t,.95,.4)
  g.save();g.globalAlpha=a;keyCaption('Enter','Activate it.',x+72,y+410+(1-a)*19);g.restore()
}
async function renderBeat(id,t){
  switch(id){
    case 'shop':await shopScene('shopIntro',Math.min(11,3+t*1.7),'Stillroom  /  keyboard');break
    case 'skip':await shopScene('shopBefore',Math.max(0,t-1.64),'Stillroom  /  keyboard');break
    case 'key':key(522,109,840,Math.sin(Math.PI*sat(t/.6))*.5,42);break
    case 'scale':number(t,false);break
    case 'mistakes':isolatedExamples(t);break
    case 'title':case 'end':
      key(240,173,770,0,32+17*Math.sin(t*.9));type('Curb Cut',1040,554,111,680)
      if(id==='end'&&t>=3.13)headingMark('Verified by Kane',1047,639)
      break
    case 'switch':switcher(t);break
    case 'keyboard':
      await shopScene('shopBefore',Math.max(0,t-1.05),'Kane recording  /  keyboard')
      if(t>=5.81)verdict('Failed',false,1540,49)
      break
    case 'mouse':{
      const s=.08+t*.74,im=await clip('mouseControl',s)
      nativeCard(im,130,172,1660,741,[195,399,614,274],'Kane recording  /  mouse')
      shopCaption(s<.88?'Click Add to cart.':'Field Headphones added to cart.','',130,990)
      if(s>1.1)verdict('Passed',true,1540,49)
      break
    }
    case 'cart':{
      const im=await clip('mouseControl',7.85+t*.5)
      nativeCard(im,258,201,1404,673,[409,250,462,221],'Kane recording  /  mouse')
      shopCaption('Field Headphones is in the cart.','',258,979);break
    }
    case 'rule':repairRule(t);break
    case 'replay':{
      const source=t<2.89?.65+t:6.25+t-2.89
      await shopScene('shopAfter',source,'Kane recording  /  keyboard with the fix')
      if(t>=2.89)verdict('Passed',true,1540,49)
      break
    }
    case 'share':{
      nativeCard(assets.sharedFix,420,244,1080,647,null,'Chrome extension  /  mass.edu')
      break
    }
    case 'wide':wide(t);break
    case 'closed':await proof(Math.min(7.93,t+2.9));break
    case 'opened':await proof(8+t);break
    case 'destination':{
      const im=await clip('destination',t)
      nativeCard(im,147,188,1626,708,[230,90,736,320],'Kane recording  /  mass.edu')
      keyCaption('Enter','About the Department of Higher Education',147,978);break
    }
    case 'unnamed':label(t,false);break
    case 'named':label(t+.72,true);break
    case 'reading':
      nativeCard(assets.reading,477,381,966,157,[180,1120,790,128],'Munich Airport  /  reading view')
      headingMark('Previous slide',479,652);break
    case 'contrast':contrast(Math.max(0,t-2.85));break
    case 'newsite':names(0);break
    case 'accuracy':case 'jev':
      names(id==='accuracy'?6:Math.max(0,t-1.15))
      headingMark('TypeSafe Jev',555,241)
      if(id==='accuracy')type('13 of 15 names correct',960,869,46,590,D,'center')
      break
    case 'inventory':{
      surface(true)
      const up=pop(t,.47,.42),x=316
      g.save();g.globalAlpha=up;type('105',x,679+(1-up)*24,367,640,M);g.restore()
      line(1001,420,1100,420,O,8);type('Live fixes',1000,529,77,590,M)
      if(t>=3.72){const a=pop(t,3.72,.36);g.save();g.globalAlpha=a;type('61 proven by Kane',1000,631+(1-a)*14,51,540,M);g.restore()}
      break
    }
    case 'owner':{
      owner(t)
      if(t>3.8){
        const a=pop(t,3.8,.4)
        g.save();g.globalAlpha=a
        draw('recordingLinks',466,704+(1-a)*12,677,71)
        g.restore()
      }
      break
    }
    case 'retireSite':await shopScene('retireShop',6+t,'Kane recording  /  extension fix off');break
    case 'retire':await terminal('retireTerm',6+t,'Terminal','Curb Cut retires the fix.',0);break
    default:throw Error('Unknown shot '+id)
  }
}
async function previewFrame(shot,frame,next){
  const t=(frame-shot[0])/30
  g.setTransform(canvas.width/1920,0,0,canvas.height/1080,0,0)
  surface();g.save()
  const amount=['shop','skip','keyboard','mouse','replay','retireSite','closed','opened','destination'].includes(shot[1])?.026:.057
  const zoom=1+amount*step(frame,shot[0],next-shot[0])
  g.translate(960,540);g.scale(zoom,zoom);g.translate(-960,-540)
  await renderBeat(shot[1],t)
  g.restore()
}
