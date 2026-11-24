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
  if(!window.current.shot.id.startsWith('teaser-')){
    plane([[473,90,96],[473,360,96],[473,360,height(473,360)]],'#777776',ink,2)
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
}
