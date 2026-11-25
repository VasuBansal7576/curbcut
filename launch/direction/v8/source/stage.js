import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const colors = { mist: '#E8E4F5', slate: '#5C4B64', damson: '#302039', orange: '#FF784A' }
const createCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h })
function texture(canvas) {
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  return map
}
function screenMaterial(canvas) {
  return new THREE.MeshBasicMaterial({ map: texture(canvas), toneMapped: false })
}
function plastic(color, roughness = .43) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: .06 })
}
function plane(parent, w, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(x, y, z)
  parent.add(mesh)
  return mesh
}
function outline(w, d, r) {
  const shape = new THREE.Shape(), x = w / 2, y = d / 2
  shape.moveTo(-x + r, -y)
  shape.lineTo(x - r, -y)
  shape.quadraticCurveTo(x, -y, x, -y + r)
  shape.lineTo(x, y - r)
  shape.quadraticCurveTo(x, y, x - r, y)
  shape.lineTo(-x + r, y)
  shape.quadraticCurveTo(-x, y, -x, y - r)
  shape.lineTo(-x, -y + r)
  shape.quadraticCurveTo(-x, -y, -x + r, -y)
  return shape
}
function slab(parent, w, d, height, radius, bevel, material, x, y, z) {
  const shape = outline(w - 2 * bevel, d - 2 * bevel, Math.max(.004, radius - bevel))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height - 2 * bevel, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 6, curveSegments: 8 })
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y + bevel, z)
  mesh.castShadow = mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
function label(parent, text, width, depth, x, y, z, color, weight = 550, align = 'center') {
  const canvas = createCanvas(1024, Math.round(1024 * depth / width))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.font = weight + ' ' + canvas.height * .74 + 'px SourceMono'
  ctx.fillText(text, align === 'left' ? 0 : canvas.width / 2, canvas.height * .5)
  return plane(parent, width, depth, new THREE.MeshBasicMaterial({ map: texture(canvas), transparent: true, depthWrite: false, toneMapped: false }), x, y, z)
}
function grade(image, crop, accent = false, enabledSwitch = false) {
  const [x, y, w, h] = crop, canvas = createCanvas(w, h), ctx = canvas.getContext('2d')
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h)
  const pixels = ctx.getImageData(0, 0, w, h), a = pixels.data
  const ramp = [[48,32,57],[92,75,100],[143,129,153],[191,182,204],[232,228,245]]
  for (let i = 0; i < a.length; i += 4) {
    const [r,g,b] = [a[i],a[i+1],a[i+2]]
    const headerPixel = Math.floor(i / 4 / w) < 297
    const px = i / 4 % w, py = Math.floor(i / 4 / w)
    const switchFill = enabledSwitch && px >= 1076 && px < 1280 && py > 450 && py < 585 && r < 100
    const isAccent = switchFill || accent && ((headerPixel && r>g*1.12 && g>b*1.5 && r>145) || (r>g*1.6 && b>g*1.18 && r>160 && image.width===1560))
    const v = Math.min(3.999,4*(.2126*r+.7152*g+.0722*b)/255), j = Math.floor(v), u = v-j
    for(let c=0;c<3;c++) a[i+c] = isAccent ? [255,120,74][c] : ramp[j][c]*(1-u)+ramp[j+1][c]*u
  }
  ctx.putImageData(pixels,0,0)
  return canvas
}
function occlusion() {
  const c = createCanvas(320,320), ctx=c.getContext('2d')
  const grad=ctx.createRadialGradient(160,160,15,160,160,156)
  grad.addColorStop(0,'rgba(38,14,65,.63)')
  grad.addColorStop(.58,'rgba(40,20,65,.28)')
  grad.addColorStop(1,'rgba(40,20,65,0)')
  ctx.fillStyle=grad;ctx.fillRect(0,0,320,320)
  return new THREE.MeshBasicMaterial({map:texture(c),transparent:true,depthWrite:false,toneMapped:false})
}
async function main(tl, playhead){
  document.fonts.add(await new FontFace('SourceMono','url(assets/source-mono.woff2)').load())
  const names=['switch-off','switch-on','jev-on','meridiano']
  const images=Object.fromEntries(await Promise.all(names.map(async name=>{
    const img=new Image();img.src='assets/'+name+(name==='meridiano'?'.jpg':'.png')
    await img.decode();return [name,img]
  })))
  const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true,alpha:false})
  renderer.setSize(1920,1080,false);renderer.shadowMap.enabled=true
  renderer.shadowMap.type=THREE.PCFSoftShadowMap
  renderer.outputColorSpace=THREE.SRGBColorSpace
  const scene=new THREE.Scene()
  scene.background=new THREE.Color(colors.mist)
  const pmrem=new THREE.PMREMGenerator(renderer)
  scene.environment=pmrem.fromScene(new RoomEnvironment(),.03).texture
  scene.environmentIntensity=.33
  const sun=new THREE.DirectionalLight('#fff6eb',1.42)
  sun.position.set(-9,12,-8);sun.castShadow=true
  Object.assign(sun.shadow.camera,{left:-20,right:20,top:17,bottom:-17,near:.1,far:60})
  sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.018;sun.shadow.bias=-.00015
  sun.shadow.radius=3;scene.add(sun)
  scene.add(new THREE.HemisphereLight('#f9f2ff','#765687',.64))
  const stage=new THREE.Group();scene.add(stage)
  const inner=plastic(colors.slate), lip=plastic(colors.mist), shadow=occlusion()
  const ground=new THREE.MeshBasicMaterial({color:colors.mist})
  plane(stage,150,150,ground,0,-.37,0)
  plane(stage,13.2,7.4,shadow,4.0,-.359,-.2)
  plane(stage,7.1,3.0,shadow,-4.2,-.351,1.9)
  const keyLayers=[]
  for(const [index,name] of ['foot','spring','cap'].entries()){
    const img=new Image();img.src='assets/'+name+'.webp';await img.decode()
    const map=new THREE.Texture(img);map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true
    const material=new THREE.SpriteMaterial({map,transparent:true,depthTest:false,depthWrite:false,toneMapped:false})
    const part=new THREE.Sprite(material)
    part.scale.set(6.7,6.7*10/11,1)
    part.position.set(-4.55,.83,.17)
    part.renderOrder=10+index
    stage.add(part);keyLayers.push(part)
  }
  slab(stage,12.2,6.86,.36,.34,.11,inner,3.8,.25,-.42)
  slab(stage,12.04,6.70,.39,.31,.11,lip,3.8,.35,-.42)
  slab(stage,11.58,5.96,.12,.13,.045,plastic(colors.slate),3.8,.70,-.27)
  const siteW=11.34,siteD=5.79
  const takes=window.recording
  for(const take of Object.values(takes)){
    for(const frame of take.frames){
      const img=new Image();img.src='assets/'+frame.src
      await img.decode()
      frame.material=screenMaterial(grade(img,[0,0,img.width,img.height],true))
    }
  }
  function recordedView(take,seconds){
    const sourceTime=seconds+take.keyMs/1000
    return (take.frames.findLast(frame=>frame.time<=sourceTime)||take.frames[0]).material
  }
  const site=plane(stage,siteW,siteD,takes.closed.frames[0].material,3.8,.828,-.27)
  const massLabel=label(stage,'mass.edu',3.5,.32,.11,.752,-3.56,colors.slate,620,'left')
  const meridianoLabel=label(stage,'meridiano.net',3.6,.32,.11,.752,-3.56,colors.slate,620,'left')
  const detail=new THREE.Group();stage.add(detail)
  slab(detail,8.48,4.12,.29,.26,.085,inner,0,.02,0)
  slab(detail,8.44,4.08,.30,.24,.095,lip,0,.17,0)
  const pOff=screenMaterial(grade(images['switch-off'],[0,0,1560,712],true))
  const pOn=screenMaterial(grade(images['switch-on'],[0,0,1560,712],true,true))
  const popup=plane(detail,8.05,3.675,pOff,0,.475,0)
  const reader=screenMaterial(grade(images['jev-on'],[196,1110,1150,355]))
  const meridiano=screenMaterial(grade(images.meridiano,[290,0,2300,1175]))
  const camera=new THREE.PerspectiveCamera(33,16/9,.1,120)
  const smooth=x=>Math.max(0,Math.min(1,x))**2*(3-2*Math.max(0,Math.min(1,x)))
  const ease=(t,a,b)=>smooth((t-a)/(b-a))
  function aim(x,z,dist,azimuth,tilt,y=.6){
    const a=THREE.MathUtils.degToRad(azimuth),b=THREE.MathUtils.degToRad(tilt)
    const dir=new THREE.Vector3(Math.sin(a)*Math.sin(b),Math.cos(b),Math.cos(a)*Math.sin(b))
    camera.position.set(x,y,z).addScaledVector(dir,dist);camera.up.set(0,0,-1);camera.lookAt(x,y,z)
  }
  function press(t,at){return ease(t,at-.085,at+.035)*(1-ease(t,at+.13,at+.30))-.12*ease(t,at+.26,at+.32)*(1-ease(t,at+.32,at+.43))}
  function draw(t,style=false){
    const close=t>=.9333 && t<3
    const sw=t>=3 && t<5.1666
    const outcome=t>=6.1666 && t<8.5
    const ending=t>=8.5
    const travel=press(t,.4)+press(t,5.50)
    keyLayers[2].center.y=.50+.21*travel
    keyLayers[1].center.y=.50+.07*travel
    keyLayers.forEach(part=>{part.visible=!style && !sw && !outcome && !close})
    site.material=style?meridiano:(t>=5.1666?recordedView(takes.repaired,t-5.50):recordedView(takes.closed,t-.4))
    detail.visible=sw||style
    massLabel.visible=!style;meridianoLabel.visible=style
    popup.material=style?reader:(t>=3.9?pOn:pOff)
    const lift=sw?ease(t,3,3.45):0
    detail.scale.setScalar(sw?.83+.17*lift:1)
    detail.position.set(sw?.16+.9*(1-lift):1.4,sw?.83+.88*lift:1.25,-.8)
    detail.rotation.set(sw?.025+.16*(1-lift):.025,sw?-.06-.11*(1-lift):0,0)
    if(style){
      detail.scale.set(1,1,.72)
      popup.scale.y=1
      detail.position.set(.30,1.15,1.38)
      aim(.65,-.38,11.2,-9,18)
    }else if(sw){
      aim(.11,-.66,10.20-.79*ease(t,3,3.6)-.25*ease(t,3.6,5.15),-13+7*ease(t,3,3.8),22-12*ease(t,3,3.8),2.05)
    }else if(close||outcome){
      const u=outcome?ease(t,6.1666,7.15):ease(t,.9333,1.57)
      aim(.25+.25*u,-.91+.30*u,7.75-.57*u,-18+6*u,22-8*u,.80)
    }else if(ending){
      const u=ease(t,8.5,10);aim(.02+.32*u,-.3+.15*u,16.5+1.1*u,-8+3*u,25+2*u,.6)
    }else{
      const u=t<3?ease(t,0,.9):ease(t,5.1666,6.15)
      aim(-1.28+.12*u,-.12-.08*u,13.0-.7*u,-12+4*u,28-2*u,.72)
    }
    renderer.render(scene,camera)
  }
  window.drawTime=draw
  window.frameAt=t=>{tl.time(t,true);draw(t)}
  window.futureFrame=()=>draw(0,true)
  draw(playhead.seconds)
  window.stageReady=true
}
window.prepareStage=main
