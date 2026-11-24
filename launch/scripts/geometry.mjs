import assert from 'node:assert/strict'

export async function geometry(page,rows){
  await page.evaluate(()=>{
    const draw=ctx.drawImage.bind(ctx)
    let images=[],scale=0
    ctx.drawImage=(image,...args)=>{
      const crop=args.length===8
      const [x,y,w,h]=crop?args.slice(4):args
      const [sw,sh]=crop?args.slice(2,4):[image.naturalWidth,image.naturalHeight]
      const transform=ctx.getTransform()
      const dx=(w??sw)*transform.a,dy=(h??sh)*transform.d
      const left=x*transform.a+transform.e,top=y*transform.d+transform.f
      images.push([left,top,left+dx,top+dy])
      scale=Math.max(scale,dx/sw,dy/sh)
      draw(image,...args)
    }
    canvas.toDataURL=()=>'data:,'
    function extent(boxes){
      const xs=[0,W,...boxes.flatMap(r=>[r[0],r[2]].map(x=>Math.max(0,Math.min(W,x))))].sort((a,b)=>a-b)
      let total=0
      for(let i=1;i<xs.length;i++){
        let bottom=0
        for(const [,y,,b] of boxes.filter(r=>r[0]<xs[i]&&r[2]>xs[i-1]).sort((a,b)=>a[1]-b[1])){
          const end=Math.min(H,b)
          total+=(xs[i]-xs[i-1])*Math.max(0,end-Math.max(bottom,y,0))
          bottom=Math.max(bottom,end)
        }
      }
      return total
    }
    window.auditShot=()=>{
      let min=1,max=0
      for(let f=0;f<window.current.shot.frames;f++){
        images=[];scale=0
        window.frame(f)
        if(window.pageShare===null)continue
        const visible=extent([...images,...overlays])-extent(overlays)
        min=Math.min(min,visible/(W*H));max=Math.max(max,scale)
      }
      return max?{minimum_real_footage_percent:Math.round(min*10000)/100,maximum_source_scale:+max.toFixed(5)}:null
    }
  })
  const report={}
  for(const {shot,scene,plates} of rows){
    await page.evaluate(a=>window.startShot(...a),[shot,scene,plates])
    const measured=await page.evaluate(()=>window.auditShot())
    if(measured)report[shot.id]=measured
  }
  for(const [id,m] of Object.entries(report)){
    assert.ok(m.maximum_source_scale<=1.25001,id+' '+JSON.stringify(m))
    assert.ok(m.minimum_real_footage_percent>=70,id+' '+JSON.stringify(m))
  }
  return report
}
