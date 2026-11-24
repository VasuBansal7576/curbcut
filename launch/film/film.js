window.fontsReady=Promise.all(['italic 400 100px Instrument','810 80px Tight','600 40px Mono','600 54px Tight','700 46px Tight'].map(f=>document.fonts.load(f)))
function monochrome(img){
  const surface=document.createElement('canvas')
  surface.width=img.width;surface.height=img.height
  const g=surface.getContext('2d',{willReadFrequently:true})
  g.drawImage(img,0,0)
  const frame=g.getImageData(0,0,surface.width,surface.height),px=frame.data
  const linear=Array.from({length:256},(_,i)=>{const c=i/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4})
  const srgb=Array.from({length:65536},(_,i)=>{const c=i/65535;return Math.round(255*(c<=.0031308?12.92*c:1.055*(c**(1/2.4))-.055))})
  for(let i=0;i<px.length;i+=4){
    const r=px[i],g=px[i+1],b=px[i+2]
    const v=srgb[Math.round((.2126*linear[r]+.7152*linear[g]+.0722*linear[b])*65535)]
    px[i]=px[i+1]=px[i+2]=v
  }
  g.putImageData(frame,0,0)
  return surface
}
window.startShot=async(shot,plates={})=>{
  document.querySelector('video').hidden=true
  canvas.hidden=false
  for(const [key,a] of Object.entries(plates)){
    const img=new Image();img.src=a.imageUrl;await img.decode()
    a.img=(a.clip?.seconds||/^(reader-|jev-|popup-|owner-report)/.test(key))?img:monochrome(img)
  }
  window.current={shot,plates}
}
window.frame=(n,format='jpeg')=>{
  const {shot,plates}=window.current,t=n/30
  const b=shot.beats.findLast(beat=>beat.local<=t+1e-8)??shot.beats[0]
  const age=t-b.local
  const next=shot.beats[shot.beats.indexOf(b)+1]
  window.beatLength=Math.max(.1,(next?.local??(shot.frames??90)/30)-b.local)
  window.sourceScale=0
  ctx.save()
  paint(b.state,age,plates,b.asset)
  ctx.restore()
  return canvas.toDataURL('image/'+format,.977).split(',')[1]
}
