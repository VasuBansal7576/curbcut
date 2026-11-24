const byId=id=>document.getElementById(id)
const specimen=new URL(location.href).searchParams.get('specimen')
for(const panel of document.querySelectorAll('[data-specimen]')) panel.hidden=Boolean(specimen && panel.dataset.specimen!==specimen)

byId('guide-toggle').addEventListener('click',()=>byId('guide-menu').classList.toggle('show'))

function carousel(container,slide,previous,next,activeClass) {
  const slides=[...container.querySelectorAll(slide)]
  let active=0
  function move(delta) {
    active=(active+delta+slides.length)%slides.length
    for(const [index,node] of slides.entries()) {
      node.hidden=index!==active
      node.classList.toggle(activeClass,index===active)
      if(node.hasAttribute('aria-hidden')) node.setAttribute('aria-hidden',String(index!==active))
    }
  }
  container.querySelector(previous).addEventListener('click',()=>move(-1))
  container.querySelector(next).addEventListener('click',()=>move(1))
}

carousel(byId('slick'),'.slick-slide','.slick-prev','.slick-next','slick-current')
carousel(byId('swiper'),'.swiper-slide','.swiper-button-prev','.swiper-button-next','swiper-slide-active')

const order=byId('order-toggle'),options=byId('order-options')
order.addEventListener('click',()=>{options.hidden=!options.hidden})
for(const option of options.children) option.addEventListener('click',()=>{
  order.textContent=option.textContent
  options.hidden=true
})

if(specimen==='cookie') byId('cookie-notice').hidden=false
byId('cookie-dismiss').addEventListener('click',()=>byId('cookie-notice').remove())
byId('newsletter-open').addEventListener('click',()=>{byId('newsletter-modal').hidden=false})
byId('newsletter-dismiss').addEventListener('click',()=>{byId('newsletter-modal').hidden=true})

const mega=byId('mega-owner'),links=byId('mega-links')
mega.addEventListener('mouseenter',()=>{links.hidden=false})
mega.addEventListener('mouseleave',()=>{links.hidden=true})
