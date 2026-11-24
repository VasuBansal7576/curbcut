function composedParent(element) {
  return element.assignedSlot ?? element.parentElement ?? element.getRootNode().host
}

function clipInset(value, box) {
  const match=value.match(/^inset\(([^)]+)\)$/)
  if(!match) return null
  const values=match[1].split(/\s+round\s+/)[0].trim().split(/\s+/)
  if(!values.every(part=>/^-?[\d.]+(?:px|%)?$/.test(part))) return null
  const [top,right=top,bottom=top,left=right]=values
  const inset=(part,size)=>parseFloat(part)*(part.endsWith('%')?size/100:1)
  return {left:box.left+inset(left,box.width),right:box.right-inset(right,box.width),
    top:box.top+inset(top,box.height),bottom:box.bottom-inset(bottom,box.height)}
}

export function keyboardVisibility(element) {
  if(!element?.checkVisibility?.({visibilityProperty:true,contentVisibilityAuto:true})) return 'no visible box'
  const view=element.ownerDocument.defaultView
  const rectangles=[...element.getClientRects()].filter(rect=>rect.width>0 && rect.height>0)
  if(!rectangles.length) return 'zero size'
  const clip={left:0,top:0,right:view.innerWidth,bottom:view.innerHeight}
  function intersect(rect,x=true,y=true) {
    if(x) {clip.left=Math.max(clip.left,rect.left);clip.right=Math.min(clip.right,rect.right)}
    if(y) {clip.top=Math.max(clip.top,rect.top);clip.bottom=Math.min(clip.bottom,rect.bottom)}
  }
  let opacity=1
  for(let node=element;node;node=composedParent(node)) {
    if(node.matches('[inert],[aria-hidden=true i]')) return 'hidden from interaction'
    const style=view.getComputedStyle(node)
    opacity*=Number(style.opacity)
    if(opacity<0.1) return 'opacity below 0.1'
    if(style.display==='contents') continue
    const box=node.getBoundingClientRect()
    if(node!==element && node!==element.ownerDocument.documentElement && node!==element.ownerDocument.body &&
      (style.overflowX!=='visible' || style.overflowY!=='visible')) {
      const scaleX=node.offsetWidth?box.width/node.offsetWidth:1
      const scaleY=node.offsetHeight?box.height/node.offsetHeight:1
      const left=box.left+node.clientLeft*scaleX,top=box.top+node.clientTop*scaleY
      intersect({left,top,right:left+node.clientWidth*scaleX,bottom:top+node.clientHeight*scaleY},
        style.overflowX!=='visible',style.overflowY!=='visible')
    }
    const inset=clipInset(style.clipPath,box)
    if(inset) intersect(inset)
    if(/^(?:circle|ellipse)\(0(?:px|%)?(?:\s|\))/.test(style.clipPath)) return 'clipped'
    const legacy=style.clip.match(/^rect\((.*)\)$/)?.[1].split(/,\s*/)
    if(legacy && ['absolute','fixed'].includes(style.position)) {
      const [top,right,bottom,left]=legacy.map(value=>parseFloat(value))
      intersect({left:box.left+(left||0),top:box.top+(top||0),
        right:Number.isFinite(right)?box.left+right:box.right,bottom:Number.isFinite(bottom)?box.top+bottom:box.bottom})
    }
  }
  if(!rectangles.some(rect=>Math.min(rect.right,clip.right)>Math.max(rect.left,clip.left) &&
    Math.min(rect.bottom,clip.bottom)>Math.max(rect.top,clip.top))) return 'clipped or off-screen'
  return null
}

export function widthEvidence(element,{text=false}={}) {
  const document=element.ownerDocument
  const view=document.defaultView
  const outer=element.getBoundingClientRect()
  const lines=[]
  function clipping(node) {
    let left=0,right=view.innerWidth
    for(let parent=node;parent && parent!==document.body;parent=parent.parentElement) {
      if(view.getComputedStyle(parent).overflowX==='visible') continue
      const bounds=parent.getBoundingClientRect()
      left=Math.max(left,bounds.left+parent.clientLeft)
      right=Math.min(right,bounds.left+parent.clientLeft+parent.clientWidth)
    }
    return {left,right}
  }
  function add(rectangles,clip) {
    for(const rect of rectangles) if(rect.width>0) {
      lines.push({left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,clipLeft:clip.left,clipRight:clip.right})
    }
  }
  if(text) {
    const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT)
    const range=document.createRange()
    for(let node=walker.nextNode();node;node=walker.nextNode()) {
      const text=node.textContent
      if(!text.trim()) continue
      const clip=clipping(node.parentElement)
      range.selectNodeContents(node)
      const rectangles=[...range.getClientRects()]
      if(rectangles.every(rect=>rect.left>=clip.left-1 && rect.right<=clip.right+1)) {
        add(rectangles,clip)
      } else {
        for(const word of text.matchAll(/\S+/g)) {
          range.setStart(node,word.index)
          range.setEnd(node,word.index+word[0].length)
          add(range.getClientRects(),clip)
        }
      }
    }
  } else add([outer],clipping(element.parentElement))
  return {
    left:Math.min(...lines.map(rect=>rect.left)),right:Math.max(...lines.map(rect=>rect.right)),
    width:view.innerWidth,scrollX:view.scrollX,clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,
    inView:lines.some(rect=>rect.bottom>0 && rect.top<view.innerHeight),
    fits:lines.length>0 && outer.width>0 && lines.every(rect=>rect.left>=rect.clipLeft-1 && rect.right<=rect.clipRight+1) &&
      (text || !element.clientWidth || element.scrollWidth<=element.clientWidth+1) && Math.abs(view.scrollX)<=1
  }
}

function exactPassage(selector,quote) {
  const matches=[...document.querySelectorAll(selector)].filter(node=>
    node.getClientRects().length && node.textContent.replace(/\s+/g,' ').trim().includes(quote))
  return matches.length===1?matches[0]:null
}

export function observePassage(selector,quote,report) {
  let previous='',scheduled=false
  const sample=()=>{
    scheduled=false
    const target=exactPassage(selector,quote)
    if(!target) return
    const geometry=widthEvidence(target,{text:true})
    if(!geometry.inView) return
    const key=JSON.stringify([geometry.left,geometry.right,geometry.width,geometry.fits,geometry.scrollX])
    if(key===previous) return
    previous=key
    report('passage',target,{geometry})
  }
  const schedule=()=>{
    if(scheduled) return
    scheduled=true
    requestAnimationFrame(sample)
  }
  document.addEventListener('DOMContentLoaded',schedule,{once:true})
  window.addEventListener('load',schedule,{once:true})
  window.addEventListener('scroll',schedule,true)
  window.addEventListener('resize',schedule)
  schedule()
}
