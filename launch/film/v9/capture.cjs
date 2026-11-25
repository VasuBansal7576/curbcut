const fs=require('fs')
const path=require('path')
const os=require('os')
const {pathToFileURL}=require('url')
const root=path.resolve(__dirname,'../../..')
const {chromium}=require('playwright')
const work=process.env.FILM_CACHE
if(!work)throw Error('Set FILM_CACHE to a working directory.')
const url=s=>pathToFileURL(s).href
const icon=url(path.join(root,'extension/icons/icon48.png'))
const font=url(path.join(root,'site/assets/fonts/inter-tight.woff2'))
const iconpaths={
  back:'M18 12H5m7-7-7 7 7 7',
  forward:'M6 12h13m-7-7 7 7-7 7',
  reload:'M19.4 9a7.5 7.5 0 1 0 .1 6M19.7 3.5V9h-5.6',
  new:'M12 5v14M5 12h14',
  close:'m6 6 12 12M18 6 6 18',
  star:'m12 3 2.8 6 6.7.6-5 4.5 1.5 6.6-6-3.4-6 3.4 1.5-6.6-5-4.5 6.7-.6z',
  tune:'M4 7h4m5 0h7M4 17h8m5 0h3 M13 7a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M17 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0',
  puzzle:'M4 5h5a3 3 0 1 1 6 0h4v5a3 3 0 1 1 0 6v4h-6a2.7 2.7 0 1 0-5.4 0H4v-6a2.7 2.7 0 1 0 0-5.4z',
  globe:'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0M3 12h18M12 3c5 4 5 14 0 18-5-4-5-14 0-18',
  menu:'M12 4v.8m0 6.8v.8m0 6.8v.8',
  user:'M19 20c-1-6-13-6-14 0m11-12a4 4 0 1 1-8 0 4 4 0 1 1 8 0',
  info:'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0M12 10v6m0-10v.5'
}
function glyph(id,size=22){return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(id==='menu'?3.2:1.65)+'" stroke-linecap="round" stroke-linejoin="round"><path d="'+iconpaths[id]+'"/></svg>'}
const tag=(cls,body)=>'<div class="'+cls+'">'+body+'</div>'
const pos=(cls,x,y,w,h,body,extra='')=>'<div class="'+cls+'" style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;'+extra+'">'+body+'</div>'
const img=(src,style='')=>'<img alt="" draggable="false" src="'+src+'" style="'+style+'">'
function chrome(name,site,active=false){
 const tabIcon=glyph('globe',18)
 const tab=tag('tab',tabIcon+'<span>'+name+'</span>'+glyph('close',14))
 const strip=tag('strip',tag('traffic','<i></i><i></i><i></i>')+tab+tag('plus',glyph('new',18)))
 const address=tag('address',tag('site-settings',glyph(name==='Stillroom Supply'?'info':'tune',17))+'<span>'+site+'</span>'+glyph('star',20))
 return strip+tag('tools',glyph('back')+glyph('forward')+glyph('reload')+address+tag(active?'pin active':'pin',img(icon))+glyph('puzzle')+tag('pipe','')+tag('profile',glyph('user',17))+glyph('menu',19))
}
function key(x,y,w,depression){
 const asset=(n)=>url(path.join(root,'site/assets/tab',n+'.webp'))
 const layers=['foot','spring','cap'].map(n=>img(asset(n),'position:absolute;left:0;width:100%;top:'+(n==='cap'?w*(.205+depression*.035):n==='spring'?w*(.044+depression*.015):0)+'px;filter:url(#'+(n==='cap'?'capmat':'metal')+')')).join('')
 return pos('key-object',x,y,w,w*.95,tag('floor','')+layers)
}
function windowBox(cls,x,y,w,h,name,address,body,active=false){
 return pos('window '+cls,x,y,w,h,chrome(name,address,active)+tag('view',body))
}
const filter='<svg width="0" height="0" style="position:absolute"><defs><filter id="capmat" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>'+['R','G','B'].map(c=>'<feFunc'+c+' type="table" tableValues=".10 .16 .32 .65 .81 .89 .94 .97 .985 .995 1"/>').join('')+'</feComponentTransfer></filter><filter id="metal" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer>'+['R','G','B'].map(c=>'<feFunc'+c+' type="table" tableValues=".06 .19 .30 .39 .48 .57 .67 .76 .84 .91 .97"/>').join('')+'</feComponentTransfer></filter></defs></svg>'
const style=`
@font-face{font-family:Tight;src:url('${font}');font-weight:100 900}
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#fff;color:#171719;font-family:Tight,Arial,sans-serif}div{position:relative}svg{flex:none}.frame{position:absolute;inset:0;overflow:hidden}
.window,.key-object,.floor{position:absolute}
.window{background:white;border:1px solid #bebfc0;border-radius:17px;box-shadow:0 3px 5px -3px #0003,0 15px 28px -14px #0003,0 48px 72px -46px #0005;overflow:hidden}
.strip{height:47px;background:linear-gradient(#ebeced,#e9eaeb);display:flex;align-items:flex-end;gap:8px;padding-left:18px;font:16px -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#343638}
.traffic{display:flex;gap:8px;align-items:center;height:47px;padding-right:15px}.traffic i{width:12px;height:12px;border-radius:50%;background:#c4c5c7;border:1px solid #bbbdbf}
.tab{display:flex;align-items:center;gap:12px;border-radius:13px 13px 0 0;background:#fff;height:38px;width:282px;padding:0 14px;isolation:isolate}
.tab:before,.tab:after{content:"";position:absolute;bottom:0;background:transparent;width:10px;height:10px}.tab:before{left:-10px;border-radius:0 0 9px 0;box-shadow:5px 3px 0 1px white}.tab:after{right:-10px;border-radius:0 0 0 9px;box-shadow:-5px 3px 0 1px white}.tab span{flex:1;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.plus{height:38px;width:40px;display:grid;place-items:center}
.tools{height:54px;padding:0 18px;display:flex;gap:18px;align-items:center;border-bottom:1px solid #dadbdd;color:#45474a;background:#fff}.tools>svg:nth-child(2){color:#b3b3b5}
.address{height:36px;flex:1;background:#f1f2f3;border-radius:24px;display:flex;gap:12px;align-items:center;padding:0 14px 0 6px;font:16px -apple-system,BlinkMacSystemFont,Arial,sans-serif}.address span{flex:1;color:#343638}.site-settings{width:26px;height:26px;border-radius:50%;background:#fff;display:grid;place-items:center}
.pin,.profile{width:31px;height:31px;display:grid;place-items:center;flex:none}.pin img{width:23px;height:23px;border-radius:5px}.pin.active{outline:2px solid var(--accent);outline-offset:2px;border-radius:7px}.profile{width:27px;height:27px;border-radius:50%;background:#eff0f1;color:#626366}.pipe{height:21px;width:1px;background:#dadbdd;margin:0 -4px}
.view{position:absolute;top:101px;bottom:0;left:0;right:0;overflow:hidden}.focus{border:4px solid var(--ring,var(--accent));border-radius:7px;box-shadow:0 0 0 2px white;pointer-events:none}
.floor{left:13%;top:72%;width:74%;height:20%;border-radius:50%;filter:blur(19px);background:radial-gradient(ellipse at center,#0004,transparent 70%);transform:rotate(10deg)}
.key-object{filter:drop-shadow(0 4px 4px #0001)}

.terminal .strip{align-items:center;justify-content:center;color:#444;font-weight:550;font-size:20px;letter-spacing:.1px;border-bottom:1px solid #d1d1d1}
.terminal .traffic{position:absolute;left:18px;top:0}
`
const frames={
  opening:[382,93,1320,691], main:[293,108,1332,775], wide:[170,85,1580,804],
  side:[842,139,950,731], terminal:[222,157,1476,669]
}
const shopSite=['Stillroom Supply','127.0.0.1:4391/fixtures/shop/']
const massSite=['Massachusetts Department of Higher Education','mass.edu']
const mapSite=['OpenSeaMap','map.openseamap.org']
const shells={
  opening:['opening',...shopSite], shop:['wide',...shopSite], shopSide:['side',...shopSite],
  mass:['main',...massSite], massSide:['side',...massSite], map:['main',...mapSite], mapSide:['side',...mapSite],
  munich:['main','Munich Airport','munich-airport.de'], jev:['main','Meridiano','meridiano.net'],
  contrast:['main','ExtremeTerrain','extremeterrain.com'], check:['terminal','curbcut — zsh'],
  gate:['terminal','Claude Code — Stop hook'], retire:['terminal','curbcut — zsh']
}
async function nativeShop(browser){
  const sharp=await browser.newContext({viewport:{width:1280,height:810},deviceScaleFactor:1.5})
  const shop=await sharp.newPage(), positions={}
  const address=url(path.join(root,'fixtures/shop/index.html'))
  async function capture(name,low=false){
    await shop.evaluate(()=>scrollTo(0,0))
    const box=await shop.evaluate(low=>{
      const focus=document.activeElement.getBoundingClientRect(),target=document.querySelector('.catalog')
      const y=low?Math.round(document.querySelector('.product-copy').getBoundingClientRect().y)-30:target.offsetTop+14
      return {y,rect:[focus.x-40,focus.y-y,focus.width,focus.height]}
    },low)
    await shop.screenshot({path:path.join(work,'native-'+name+'.png'),fullPage:true,clip:{x:40,y:box.y,width:1200,height:536}})
    positions[name]=box.rect
  }
  try {
    await shop.goto(address)
    await shop.locator('#search').focus()
    await capture('search')
    await shop.keyboard.press('Tab')
    await capture('button')
    await shop.keyboard.press('Tab')
    if(!await shop.locator('[data-product=speaker] button').evaluate(b=>b===document.activeElement))throw Error('Unpatched keyboard failed to reproduce the skip')
    await capture('skipped')
    await shop.goto(address+'?fixed=1')
    await shop.locator('#search-form button').focus()
    await shop.keyboard.press('Tab')
    if(!await shop.locator('[data-product=headphones] button').evaluate(b=>b===document.activeElement))throw Error('Repaired keyboard missed the headphones')
    await capture('reached',true)
    await shop.keyboard.press('Enter')
    if(await shop.locator('#cart-status').textContent()!=='Field Headphones added to cart.')throw Error('Missing cart confirmation')
    await capture('added',true)
    fs.writeFileSync(path.join(work,'native.json'),JSON.stringify(positions))
  }finally{await sharp.close()}
}
async function main(){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'curbcut-blue-'))
  const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',viewport:{width:1920,height:1080},args:['--mute-audio','--allow-file-access-from-files']})
  try {
    await nativeShop(context.browser())
    const page=context.pages()[0],file=path.join(work,'shell.html')
    async function open(body,css=''){
      fs.writeFileSync(file,'<!doctype html><meta charset="utf-8"><style>'+style+css+'</style>'+body)
      await page.goto(url(file))
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()))})
    }
    for(const [id,[size,name,address]] of Object.entries(shells)){
      const [x,y,w,h]=frames[size]
      const body=size==='terminal'?pos('window terminal',x,y,w,h,tag('strip',tag('traffic','<i></i><i></i><i></i>')+name)):windowBox('',x,y,w,h,name,address,'')
      await open(body)
      await page.screenshot({path:path.join(work,'shell-'+id+'.png')})
    }
    for(let i=0;i<=8;i++){
      await open(filter+key(0,0,500,i/8),'html,body{background:transparent!important}')
      const assetsReady=await page.locator('.key-object img').count()
      if(assetsReady!==3)throw Error('Tab layers missing')
      await page.screenshot({omitBackground:true,path:path.join(work,'key-'+i+'.png'),clip:{x:0,y:0,width:500,height:500}})
    }
    fs.writeFileSync(path.join(work,'shells.json'),JSON.stringify(Object.fromEntries(Object.entries(shells).map(([id,[size]])=>[id,frames[size]]))))
  } finally{await context.close();fs.rmSync(profile,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1})
