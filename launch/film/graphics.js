function roundBox(x,y,w,h,r,color){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill()
}
function gradient(x,y,X,Y,stops){
  const g=ctx.createLinearGradient(x,y,X,Y)
  for(const [p,c] of stops)g.addColorStop(p,c)
  return g
}
function label(text,x,y,size=30,color=lime){mono(text,x,y,size,color)}
function typeLines(lines,x,y,size,color=white,width=1700,leading=.86,emphasis=''){
  const runs=lines.map(line=>line.split(/( +)/).map(word=>({word,italic:!!emphasis&&word.toLowerCase().replace(/[^a-z]/g,'')===emphasis})))
  const measure=(part,px)=>{face(px,part.italic?'Instrument':'Tight',part.italic?400:810);return part.word.trim()?ctx.measureText(part.word).width:px*.25}
  const maximum=Math.max(...runs.map(row=>row.reduce((sum,p)=>sum+measure(p,size),0)))
  const px=Math.min(size,size*width/maximum)
  for(const [i,row] of runs.entries()){
    let left=x
    for(const part of row){
      const advance=measure(part,px)
      ctx.fillStyle=color;ctx.fillText(part.word,left,y+i*px*leading);left+=advance
    }
  }
}
function keycap(x,y,k,t,legend='Tab'){
  const press=10*Math.exp(-6*t)*Math.sin(t*22)
  ctx.save();ctx.translate(x,y);ctx.scale(k,k);ctx.rotate(-.12);ctx.transform(1,0,-.22,.88,0,0)
  ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=48;ctx.shadowOffsetY=47
  roundBox(-305,-170,610,370,42,ink);ctx.shadowColor='transparent'
  for(let i=52;i>=0;i-=2){
    const shade=.1+(52-i)*.004
    roundBox(-300,-184+i+press,600,354,41,toned(ink,white,shade))
  }
  roundBox(-300,-184+press,600,354,42,gradient(0,-184,0,170,[[0,white],[.06,toned(white,cobalt,.06)],[.8,toned(white,cobalt,.13)],[1,toned(white,cobalt,.34)]]))
  roundBox(-283,-170+press,566,318,31,gradient(-245,-150,235,125,[[0,white],[1,toned(white,cobalt,.065)]]))
  ctx.translate(0,press)
  print(legend,-232,84,126,ink,'Tight',740)
  line(102,-64,202,-64,cobalt,13);poly([[169,-98],[206,-64],[169,-30]],null,cobalt,13);line(226,-108,226,-23,cobalt,12)
  ctx.restore()
}
function curbObject(x,y,k,t,opened=true){
  const turn=.04*Math.sin(t*.9)
  const project=(u,v,h)=>[x+k*(u+v*(.68+turn)),y+k*(v*-.55+u*.14-h)]
  const shape=(pts,color)=>poly(pts.map(p=>project(...p)),color)
  const h=126, sl=opened?smooth(t/.82):0, shoulder=-52+sl*246
  const profile=[[-400,h],[-55,h],[shoulder,20],[335,20]]
  ctx.save()
  ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=42*k;ctx.shadowOffsetY=46*k
  shape([[-412,-8,-22],[348,-8,-22],[348,270,-22],[-412,270,-22]],ink);ctx.shadowColor='transparent'
  for(let i=0;i<profile.length-1;i++){
    const [u,z]=profile[i],[v,w]=profile[i+1]
    shape([[u,0,z],[v,0,w],[v,0,-25],[u,0,-25]],i===1?toned(ink,cobalt,.74):toned(ink,cobalt,.42))
    shape([[u,0,z],[v,0,w],[v,260,w],[u,260,z]],i===1?(opened?lime:toned(cobalt,white,.68)):white)
  }
  ctx.restore()
}
function brandLock(x,y,k,color){
  curbMark(x,y-60*k,1.9*k,color)
  print('Curb Cut',x+202*k,y+3*k,128*k,color)
}
function pointerObject(x,y,k,t){
  const points=[[0,0],[.08,1.06],[.35,.79],[.58,1.20],[.77,1.10],[.54,.71],[.90,.63]]
  ctx.save();ctx.translate(x+30*(1-at(t,0,.55)),y);ctx.rotate(-.22+.12*at(t,0,.52));ctx.scale(k,k)
  ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=.14;ctx.shadowOffsetY=.14
  poly(points,ink);ctx.shadowColor='transparent'
  for(let j=15;j>=0;j--)poly(points.map(([a,b])=>[a+j*.003,b+j*.004]),j?toned(ink,lime,.4):lime)
  ctx.restore()
}
function blankTag(x,y,k,t){
  ctx.save();ctx.translate(x,y+22*(1-at(t,0,.5)));ctx.rotate(-.1-.06*at(t,0,.5));ctx.scale(k,k)
  const outline=[[-310,-137],[235,-137],[337,-37],[337,38],[235,137],[-310,137]]
  for(let i=18;i>=0;i--)poly(outline.map(([u,v])=>[u,v+i]),i?toned(ink,white,.28):white)
  disk(244,0,22,ink)
  ctx.fillStyle=ink;ctx.fillRect(-250,-4,256,12)
  ctx.restore()
}
function brandStamp(t){
  ground()
  curbMark(127,174,1.45,lime)
  print('Curb Cut',285,226,65,white)
  typeLines(['Get Curb Cut','for Chrome.'],116,513,184,white,1650,.93,'chrome')
  print('github.com/VasuBansal7576/curbcut',128,914,51,lime,'Mono',650,1640)
}
