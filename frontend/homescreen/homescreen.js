const API_BASE = 'http://localhost:5000/api';
let selectedProduct = null;
const modal = document.getElementById('product-modal');

function initFooter() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'group product-card';
  card.dataset.id = product._id;
  card.dataset.name = product.title;
  card.dataset.price = product.price;
  card.dataset.desc = product.description || '';
  card.dataset.img = product.imageUrl || 'https://via.placeholder.com/350x420?text=No+Image';

  card.innerHTML = `
    <div class="product-img-container">
      <img src="${card.dataset.img}" alt="${product.title}" />
    </div>
    <h4 class="product-title">${product.title}</h4>
    <div class="swatches">
      <div class="swatch bg-black"></div>
      <div class="swatch bg-white"></div>
      <div class="swatch bg-blue"></div>
    </div>
    <div class="product-footer">
      <span class="price">Rs ${product.price}</span>
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
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('Products fetch failed');

    const products = await res.json();
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
  selectedProduct = product;
  document.getElementById('modal-title').innerText = product.title;
  document.getElementById('modal-price').innerText = 'Rs ' + product.price;
  document.getElementById('modal-desc').innerText = product.description || 'No description';
  document.getElementById('modal-img').src = product.imageUrl || 'https://via.placeholder.com/350x420?text=No+Image';

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

  const res = await fetch(`${API_BASE}/cart`, {
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
    alert(`${selectedProduct.title} (${selectedProduct.size || 'S'}) added to cart`);
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
