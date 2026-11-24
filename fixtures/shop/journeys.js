const find=id=>document.getElementById(id)
const listen=(id,action)=>find(id).addEventListener('click',action)
const toggle=id=>{find(id).hidden=!find(id).hidden}

find('brands-trigger').addEventListener('mouseenter',()=>{find('brands-links').hidden=false})
listen('returns-trigger',()=>toggle('returns-panel'))
listen('return-window',()=>{find('return-answer').hidden=false})
listen('headphones-slide',()=>{find('speaker-card').hidden=true})
listen('speaker-slide',()=>{find('speaker-card').hidden=false})
listen('delivery-trigger',()=>{find('delivery-status').textContent='Information open';find('delivery-modal').hidden=false})
listen('delivery-close',()=>{
  find('delivery-modal').hidden=true
  find('delivery-status').textContent='Information closed'
  find('delivery-trigger').focus()
})
listen('sort-trigger',()=>toggle('sort-options'))
listen('featured-option',()=>{
  find('sort-result').textContent='Featured first'
  find('sort-options').hidden=true
})
listen('price-option',()=>{
  find('sort-result').textContent='Porch Speaker first, $64'
  find('sort-options').hidden=true
})
listen('filter-trigger',()=>toggle('filters'))
listen('filter-speakers',()=>{find('filter-result').textContent='One result: Porch Speaker'})
