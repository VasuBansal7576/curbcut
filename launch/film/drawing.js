const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d', {alpha:false})
const W = 1920, H = 1080
const ink = '#111214', yellow = '#FFCE1F', white = '#F4F1EA', red = '#E8372C'
const ghost = 'rgba(244,241,234,.32)'
const clamp = n => Math.max(0, Math.min(1, n))
const ease = n => 1 - (1 - clamp(n)) ** 3
const smooth = n => clamp(n) ** 2 * (3 - 2 * clamp(n))
const mix = (a,b,f) => a+(b-a)*f
const at = (t,start,length=.42) => ease((t-start)/length)
function rect(x,y,w,h,color) {
  ctx.fillStyle=color
  ctx.fillRect(x,y,w,h)
}
function poly(points, fill, stroke, lineWidth=2) {
  ctx.beginPath()
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y))
  if(fill) {ctx.closePath();ctx.fillStyle=fill;ctx.fill()}
  if(stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}
}
function line(x,y,X,Y,color,width=2) {poly([[x,y],[X,Y]],null,color,width)}
function cut(x,y,w,h,draw) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x,y,w,h)
  ctx.clip()
  draw()
  ctx.restore()
}
function face(size, family='Highway', weight=400) {ctx.font=weight+' '+size+'px '+family}
function print(text,x,y,size,color=white,family='Highway',weight=400,max=Infinity) {
  face(size,family,weight)
  ctx.fillStyle=color
  ctx.fillText(text,x,y,Math.min(max,ctx.measureText(text).width+.1))
}
function mono(text,x,y,size=25,color=white) {print(text,x,y,size,color,'Mono',600)}
function disk(x,y,r,color,ry=r) {
  if (r<=0 || ry<=0) return
  ctx.beginPath();ctx.ellipse(x,y,r,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()
}
function traced(points,t,color,width=5) {
  const segments=points.slice(1).map(([x,y],i)=>Math.hypot(x-points[i][0],y-points[i][1]))
  const len=segments.reduce((a,b)=>a+b,0)
  ctx.save()
  ctx.setLineDash([len,len+1])
  ctx.lineDashOffset=(1-clamp(t))*len
  poly(points,null,color,width)
  ctx.restore()
}
function arrow(x,y,size,color=yellow) {
  poly([[x,y+size*.29],[x+size*.52,y+size*.29],[x+size*.52,y],[x+size,y+size*.46],
    [x+size*.52,y+size*.92],[x+size*.52,y+size*.63],[x,y+size*.63]],color)
}
function stripes(x,y,w,h,phase=0) {
  cut(x,y,w,h,()=>{
    rect(x,y,w,h,white)
    for(let u=-2*h+phase%90;u<w+h;u+=90)
      poly([[x+u,y+h],[x+u+44,y+h],[x+u+44+h,y],[x+u+h,y]],red)
  })
}
function domes(x,y,cols,rows,space,t,r=space*.27) {
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const pop=at(t,(i+j*.65)*.035,.32)
    disk(x+i*space,y+j*space,r*pop,yellow)
    if(pop>.1)disk(x+i*space-1.2,y+j*space-1.7,r*.37*pop,ink)
  }
}
function texture() {
  const tile=document.createElement('canvas')
  tile.width=tile.height=384
  const pen=tile.getContext('2d')
  let n=4959
  const random=()=>((n=(Math.imul(1664525,n)+1013904223)>>>0)/4294967296)
  pen.fillStyle=ink;pen.fillRect(0,0,384,384)
  for(let i=0;i<19000;i++){
    const shade=random()
    pen.fillStyle=shade<.48?'rgba(0,0,0,.38)':'rgba(244,241,234,'+(.008+random()*.036)+')'
    const x=random()*384,y=random()*384
    pen.fillRect(x,y,.6+random()*2.7,.6+random()*1.8)
  }
  return ctx.createPattern(tile,'repeat')
}
const asphalt=texture()
function ground() {rect(0,0,W,H,asphalt)}
function curbMark(x,y,scale=1,col=yellow) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale)
  poly([[0,0],[33,0],[59,24],[89,24],[89,34],[54,34],[28,10],[0,10]],col)
  ctx.restore()
}
function band(shot,t) {
  const cue=shot.cues.find(c=>c.start<=t && t<c.end)
  rect(0,976,W,104,ink)
  cover(0,976,W,104)
  if(!cue)return
  face(54,'Overpass',600)
  const groups=[[]]
  for(const word of cue.words){
    let group=groups.at(-1)
    const proposed=[...group,word].map(v=>v[0]).join(' ')
    if(group.length && ctx.measureText(proposed).width>1780){group=[];groups.push(group)}
    group.push(word)
  }
  const active=groups.findLast(g=>g[0][1]<=t)??groups[0]
  const width=ctx.measureText(active.map(g=>g[0]).join(' ')).width
  let x=(W-width)/2
  const selected=active.findLast(v=>v[1]<=t)
  for(const item of active){
    const [text,start]=item
    const color=item===selected && shot.highlights.includes(start)?yellow:white
    print(text,x,1048,54,color,'Overpass',600)
    x+=ctx.measureText(text+' ').width
  }
}
