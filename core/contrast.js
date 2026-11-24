const white=[255,255,255,1]
const transparent=[0,0,0,0]
const normalText=value=>value.trim().replace(/\s+/g,' ')

export function rgb(css) {
  if(/^#[\da-f]{6}$/i.test(css)) return [1,3,5].map(i=>parseInt(css.slice(i,i+2),16)).concat(1)
  const match=/^rgba?\(([^)]+)\)$/.exec(css)
  if(!match) return null
  const values=match[1].split(/[,/\s]+/).map(Number)
  if(![3,4].includes(values.length) || values.some(value=>!Number.isFinite(value))) return null
  return [values[0],values[1],values[2],values[3]??1]
}

function over(top,bottom) {
  const alpha=top[3]+bottom[3]*(1-top[3])
  if(!alpha) return transparent
  return [0,1,2].map(i=>(top[i]*top[3]+bottom[i]*bottom[3]*(1-top[3]))/alpha).concat(alpha)
}

function paint(model,foreground,background) {
  return model.layers.reduce((inside,{fill,opacity},index)=>{
    const group=over(inside,index===0 && background?background:fill)
    return [...group.slice(0,3),group[3]*opacity]
  },foreground)
}

export function ratio(a,b) {
  const luminance=color=>[0.2126,0.7152,0.0722].reduce((total,weight,i)=>{
    const value=color[i]/255
    return total+weight*(value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4)
  },0)
  const left=luminance(a),right=luminance(b)
  return (Math.max(left,right)+0.05)/(Math.min(left,right)+0.05)
}

export function measureContrast(model,foreground=model.foreground,background) {
  const fg=over(paint(model,foreground,background),white)
  const bg=over(paint(model,transparent,background),white)
  return {ratio:ratio(fg,bg),foreground:fg.slice(0,3),background:bg.slice(0,3),threshold:model.threshold}
}

export function contrastModel(node,{simulation=false}={}) {
  const direct=[...node.childNodes].filter(child=>child.nodeType===3 && normalText(child.textContent))
  const text=normalText(direct.map(child=>child.textContent).join(' '))
  if(text.length<3 || text.length>240 || node.namespaceURI!=='http://www.w3.org/1999/xhtml' ||
    node.matches('script,style,textarea,select,input,option,video,canvas') || !node.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return null
  const range=document.createRange()
  range.selectNodeContents(direct[0])
  const viewport=[...range.getClientRects()].some(box=>{
    const x=(Math.max(0,box.left)+Math.min(innerWidth,box.right))/2
    const y=(Math.max(0,box.top)+Math.min(innerHeight,box.bottom))/2
    return box.width>0 && box.height>0 && x>=box.left && x<=box.right && y>=box.top && y<=box.bottom && document.elementFromPoint(x,y)===node
  })
  if(!viewport) return null
  const style=getComputedStyle(node)
  const foreground=rgb(style.webkitTextFillColor||style.color)
  if(!foreground || style.webkitTextFillColor!==style.color || style.textShadow!=='none' ||
    style.webkitTextStrokeWidth!=='0px' || style.backgroundClip.includes('text')) return null
  const layers=[]
  for(let parent=node;parent;parent=parent.parentElement) {
    const computed=getComputedStyle(parent)
    const canvasFilter=simulation && parent===document.documentElement && computed.filter==='grayscale(1) contrast(0.22)'
    if(computed.backgroundImage!=='none' || computed.mixBlendMode!=='normal' || computed.backgroundBlendMode!=='normal' ||
      (computed.filter!=='none' && !canvasFilter) || computed.backdropFilter!=='none' ||
      computed.boxShadow.includes('inset') || computed.maskImage!=='none') return null
    const fill=rgb(computed.backgroundColor)
    if(!fill) return null
    const opacity=Number(computed.opacity)
    if(parent===document.body && opacity!==1 && getComputedStyle(document.documentElement).backgroundColor==='rgba(0, 0, 0, 0)') return null
    for(const pseudo of ['::before','::after']) {
      const overlay=getComputedStyle(parent,pseudo)
      if(overlay.content!=='none' && overlay.content!=='normal' &&
        (overlay.position==='absolute' || overlay.position==='fixed')) return null
    }
    layers.push({fill,opacity})
  }
  const large=parseFloat(style.fontSize)>=24 || (parseFloat(style.fontSize)>=56/3 && Number(style.fontWeight)>=700)
  return {text,foreground,layers,threshold:large?3:4.5}
}

function shade(color,lightness) {
  const maximum=Math.max(...color.slice(0,3))/255
  const minimum=Math.min(...color.slice(0,3))/255
  const midpoint=(maximum+minimum)/2
  const chroma=maximum-minimum
  const saturation=chroma?chroma/(1-Math.abs(2*midpoint-1)):0
  const nextChroma=saturation*(1-Math.abs(2*lightness-1))
  return color.slice(0,3).map(channel=>Math.round(255*(lightness+(chroma?(channel/255-midpoint)*nextChroma/chroma:0)))).concat(1)
}

const swatches=color=>[...new Map(Array.from({length:513},(_,i)=>{
  const candidate=shade(color,i/512)
  return [candidate.join(','),candidate]
})).values()]
const distance=(a,b)=>a.slice(0,3).reduce((sum,channel,i)=>sum+(channel-b[i])**2,0)
const hex=color=>'#'+color.slice(0,3).map(channel=>channel.toString(16).padStart(2,'0')).join('')

export function contrastRepair(model) {
  const before=measureContrast(model)
  if(before.ratio>=model.threshold) return null
  const colors=swatches(model.foreground)
  const passes=(fg,bg)=>measureContrast(model,fg,bg).ratio>=model.threshold
  const first=colors.filter(fg=>passes(fg)).sort((a,b)=>distance(a,model.foreground)-distance(b,model.foreground))[0]
  if(first) return {color:hex(first)}
  let best
  for(const background of swatches(model.layers[0].fill[3]?model.layers[0].fill:before.background)) {
    for(const foreground of colors) {
      const cost=distance(foreground,model.foreground)+distance(background,before.background)
      if((!best || cost<best.cost) && passes(foreground,background)) best={foreground,background,cost}
    }
  }
  return best?{color:hex(best.foreground),'background-color':hex(best.background)}:null
}
