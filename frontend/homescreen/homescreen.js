const SAME_ORIGIN_API_BASE = (window.location.protocol.startsWith('http') && window.location.host)
  ? `${window.location.protocol}//${window.location.host}/api`
  : null;
const LOCAL_API_BASE = 'http://localhost:5000/api';

const API_BASE_CANDIDATES = Array.from(new Set(
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '5000')
    ? [LOCAL_API_BASE, SAME_ORIGIN_API_BASE]
    : [SAME_ORIGIN_API_BASE, LOCAL_API_BASE]
)).filter(Boolean);

let resolvedApiBase = null;

async function apiFetch(path, options = {}) {
  const bases = resolvedApiBase
    ? [resolvedApiBase, ...API_BASE_CANDIDATES.filter(base => base !== resolvedApiBase)]
    : API_BASE_CANDIDATES;

  let lastError = null;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, options);
      if (res.ok) {
        resolvedApiBase = base;
        return res;
      }

      // If same-origin API is missing (e.g. frontend on :5500), try the next candidate.
      if (res.status === 404) {
        lastError = new Error(`API endpoint not found at ${base}${path}`);
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Unable to reach API');
}
let selectedProduct = null;
const modal = document.getElementById('product-modal');

function initFooter() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function createProductCard(product) {
  const productTitle = product.title || product.name || 'Untitled Product';
  const productImage = product.imageUrl || product.image || 'https://via.placeholder.com/350x420?text=No+Image';
  const productPrice = product.price ?? 0;

  const card = document.createElement('div');
  card.className = 'group product-card';
  card.dataset.id = product._id;
  card.dataset.name = productTitle;
  card.dataset.price = productPrice;
  card.dataset.desc = product.description || '';
  card.dataset.img = productImage;

  card.innerHTML = `
    <div class="product-img-container">
      <img src="${card.dataset.img}" alt="${productTitle}" />
    </div>
    <h4 class="product-title">${productTitle}</h4>
    <div class="swatches">
      <div class="swatch bg-black"></div>
      <div class="swatch bg-white"></div>
      <div class="swatch bg-blue"></div>
    </div>
    <div class="product-footer">
      <span class="price">Rs ${productPrice}</span>
      <button class="add-btn" type="button">
        <i class="fas fa-shopping-cart"></i> Add
      </button>
    </div>
  `;

  const addBtn = card.querySelector('.add-btn');
  addBtn.addEventListener('click', () => openProductModal(product));

  return card;
}

async function loadHomeProducts() {
  const grid = document.getElementById('home-product-grid');
  if (!grid) return;
  grid.innerHTML = '<p class="text-center w-full py-10">Loading products...</p>';

  try {
    const res = await apiFetch('/products');
    if (!res.ok) throw new Error('Products fetch failed');

    const payload = await res.json();
    const products = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
    const topThree = products.slice(0, 3);

    grid.innerHTML = '';

    if (topThree.length === 0) {
      grid.innerHTML = '<p class="text-center w-full py-10">No products available.</p>';
      return;
    }

    topThree.forEach(product => grid.appendChild(createProductCard(product)));
    if (typeof lucide !== 'undefined') lucide.createIcons();

  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="text-center w-full py-10 text-red-500">Unable to load products</p>';
  }
}

function openProductModal(product) {
  const productTitle = product.title || product.name || 'Untitled Product';
  const productImage = product.imageUrl || product.image || 'https://via.placeholder.com/350x420?text=No+Image';
  const productPrice = product.price ?? 0;

  selectedProduct = product;
  document.getElementById('modal-title').innerText = productTitle;
  document.getElementById('modal-price').innerText = 'Rs ' + productPrice;
  document.getElementById('modal-desc').innerText = product.description || 'No description';
  document.getElementById('modal-img').src = productImage;

  document.querySelectorAll('.size-opt').forEach(btn => btn.classList.remove('active-size'));
  const defaultButton = document.querySelector('.size-opt[data-size="S"]');
  if (defaultButton) defaultButton.classList.add('active-size');

  selectedProduct.size = 'S';

  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

function setupSizeButtons() {
  document.querySelectorAll('.size-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-opt').forEach(b => b.classList.remove('active-size'));
      btn.classList.add('active-size');
      if (selectedProduct) selectedProduct.size = btn.dataset.size;
    });
  });
}

async function addToCart(productId, quantity = 1) {
  const token = localStorage.getItem('shirtifyToken');
  if (!token) {
    alert('Please login before adding to cart');
    return;
  }

  const res = await apiFetch('/cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ productId, quantity })
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Could not add to cart');
  }

  return res.json();
}

async function addToCartConfirm() {
  if (!selectedProduct) {
    alert('No product selected');
    return;
  }

  try {
    await addToCart(selectedProduct._id, 1);
    const productTitle = selectedProduct.title || selectedProduct.name || 'Product';
    alert(`${productTitle} (${selectedProduct.size || 'S'}) added to cart`);
    closeModal();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Unable to add to cart');
  }
}

// Load once ready
window.addEventListener('DOMContentLoaded', () => {
  initFooter();
  setupSizeButtons();
  loadHomeProducts();
});
