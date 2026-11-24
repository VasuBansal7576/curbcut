const query = new URLSearchParams(location.search);
const fixed = query.has('fixed') ? query.get('fixed') === '1' : (document.documentElement.hasAttribute('data-native-repair') || localStorage.getItem('stillroom-native-fix') === '1');
const select = (selector) => document.querySelector(selector);
const fixToggle = select('#native-fix');

document.body.classList.toggle('native-fixed', fixed);
fixToggle.checked = fixed;
fixToggle.addEventListener('change', () => {
  localStorage.setItem('stillroom-native-fix', fixToggle.checked ? '1' : '0');
  query.set('fixed', fixToggle.checked ? '1' : '0');
  location.search = query.toString();
});

if (fixed) {
  select('#search-label').hidden = false;
  const original = select('div.add-to-cart');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = original.className;
  button.textContent = original.textContent;
  original.replaceWith(button);
}

const products = [...document.querySelectorAll('.product')];
const search = select('#search');
select('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const term = search.value.trim().toLowerCase();
  for (const product of products) {
    product.hidden = !product.querySelector('h3').textContent.toLowerCase().includes(term);
  }
  const count = products.filter((product) => !product.hidden).length;
  select('#search-status').textContent = count === 1 ? '1 product found.' : `${count} products found.`;
});

const cart = select('#cart');
const cartDialog = select('#cart-dialog');
const cartItems = select('#cart-items');
let itemCount = 0;
cart.addEventListener('click', () => cartDialog.showModal());

for (const product of products) {
  product.querySelector('.add-to-cart, [data-add]').addEventListener('click', () => {
    const name = product.querySelector('h3').textContent;
    const item = document.createElement('li');
    item.textContent = name;
    cartItems.append(item);
    itemCount += 1;
    cart.textContent = `Cart (${itemCount})`;
    select('#cart-status').textContent = `${name} added to cart.`;
  });
}

const shippingDialog = select('#shipping-dialog');
const shipping = select('#shipping');
const closeShipping = select('#close-shipping');
shipping.addEventListener('click', () => shippingDialog.showModal());
closeShipping.addEventListener('click', () => shippingDialog.close());

shippingDialog.addEventListener('keydown', (event) => {
  if (!fixed && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
  }
});
shippingDialog.addEventListener('cancel', (event) => {
  if (!fixed) event.preventDefault();
});

const reserve = select('#start-reservation');
const reservationStatus = select('#reservation-status');
const shopError = select('#shop-error');
reserve.dataset.timeout = fixed ? '300000' : '5000';
let reservationTimer;
reserve.addEventListener('click', () => {
  clearTimeout(reservationTimer);
  shopError.hidden = true;
  reservationStatus.textContent = 'Cart reservation active.';
  reservationTimer = setTimeout(() => {
    reservationStatus.textContent = '';
    shopError.hidden = false;
    shopError.textContent = 'Your cart reservation expired. Start a new reservation to continue.';
  }, Number(reserve.dataset.timeout));
});
