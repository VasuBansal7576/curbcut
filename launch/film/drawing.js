const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d', {alpha:false})
const W = 1920, H = 1080
const {surface:cobalt,accent:lime,text:white,failure:coral,ink}=window.brandPalette
function channels(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function toned(a,b,n){
  const v=channels(b)
  return 'rgb('+channels(a).map((p,i)=>Math.round(p+(v[i]-p)*n)).join(',')+')'
}
function alpha(hex,n){return 'rgba('+channels(hex).join(',')+','+n+')'}
const ghost=alpha(white,.32)
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
function face(size,family='Tight',weight=800){
  ctx.letterSpacing=(family==='Tight'?-size*(size<80?.024:.044):family==='Instrument'?-size*.025:0)+'px'
  ctx.font=(family==='Instrument'?'italic ':'')+weight+' '+size+'px '+family
}
function print(text,x,y,size,color=white,family='Tight',weight=800,max=Infinity) {
  face(size,family,weight)
  ctx.fillStyle=color
  const width=ctx.measureText(text).width
  if(width>max)face(size*max/width,family,weight)
  ctx.fillText(text,x,y)
}
function mono(text,x,y,size=25,color=white) {print(text,x,y,size,color,'Mono',600)}
function disk(x,y,r,color,ry=r) {
  if (r<=0 || ry<=0) return
  ctx.beginPath();ctx.ellipse(x,y,r,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()
}
function ground(){rect(0,0,W,H,cobalt)}
function curbMark(x,y,scale=1,col=lime) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale)
  poly([[0,0],[33,0],[59,24],[89,24],[89,34],[54,34],[28,10],[0,10]],col)
  ctx.restore()
}
