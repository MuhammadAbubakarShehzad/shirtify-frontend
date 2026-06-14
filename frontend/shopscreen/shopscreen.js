const SAME_ORIGIN_API_BASE = (window.location.protocol.startsWith('http') && window.location.host)
    ? `${window.location.protocol}//${window.location.host}/api`
    : null;
const LOCAL_API_BASE = 'http://localhost:5000/api';
const PROD_API_BASE = 'https://backend-production-e03d.up.railway.app/api';

let savedApiBase = localStorage.getItem('shirtifyApiBase');
if (savedApiBase === 'null' || savedApiBase === 'undefined' || (savedApiBase && !savedApiBase.startsWith('http'))) {
    localStorage.removeItem('shirtifyApiBase');
    savedApiBase = null;
}
const CONFIG_API_BASE = window.API_BASE_URL || savedApiBase;

const API_BASE_CANDIDATES = Array.from(new Set(
    ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '5000')
        ? [LOCAL_API_BASE, CONFIG_API_BASE, SAME_ORIGIN_API_BASE, PROD_API_BASE]
        : [CONFIG_API_BASE, PROD_API_BASE, SAME_ORIGIN_API_BASE, LOCAL_API_BASE]
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
let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let selectedPrice = null;

function createProductCard(product) {
    const productTitle = product.title || product.name || 'Untitled Product';
    const fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%2394a3b8">No Image</text></svg>';
    const productImage = product.imageUrl || product.image || fallbackImage;
    const productPrice = product.price ?? 0;
    const productStock = Number(product.stock ?? 0);
    const isOutOfStock = productStock <= 0;

    const card = document.createElement('div');
    card.className = 'group product-card';
    card.dataset.id = product._id;
    card.dataset.name = productTitle;
    card.dataset.price = productPrice;
    card.dataset.desc = product.description || '';
    card.dataset.img = productImage;

    const imageUrl = productImage && String(productImage).trim() ? productImage : fallbackImage;

    card.innerHTML = `
        <div class="aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden mb-5 relative">
            <img src="${imageUrl}" alt="${productTitle}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            ${isOutOfStock ? '<span class="absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white">Out of stock</span>' : ''}
        </div>
        <h3 class="text-xl font-medium text-slate-900 mb-2">${productTitle}</h3>
        <div class="flex gap-2 mb-4">
            <div class="w-4 h-4 rounded-full bg-slate-900"></div>
            <div class="w-4 h-4 rounded-full bg-slate-500"></div>
            <div class="w-4 h-4 rounded-full bg-slate-300"></div>
        </div>
        <div class="flex items-center justify-between">
            <span class="font-medium text-lg">Rs ${productPrice}</span>
            <button class="add-btn flex items-center gap-2 ${isOutOfStock ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#94D5E0] hover:bg-[#7DDDEE]'} text-white px-4 py-1.5 rounded-full transition-all shadow-sm hover:shadow-md" ${isOutOfStock ? 'disabled' : ''}>
                <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                <span class="font-medium text-sm">${isOutOfStock ? 'Sold out' : 'Add'}</span>
            </button>
        </div>
    `;

    const addBtn = card.querySelector('.add-btn');
    addBtn.addEventListener('click', () => {
        if (!isOutOfStock) openProductModal(product);
    });

    return card;
}

async function loadProducts(color = null, size = null, price = null) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    productGrid.innerHTML = '<p class="col-span-full text-center py-10 text-slate-500">Loading products...</p>';

    try {
        let path = '/products';
        const params = [];
        if (color) params.push(`colour=${encodeURIComponent(color)}`);
        if (size) params.push(`size=${encodeURIComponent(size)}`);
        if (price && /^\d+-\d+$/.test(price)) {
            const [min, max] = price.split('-');
            params.push(`minPrice=${min}`);
            params.push(`maxPrice=${max}`);
        }
        if (params.length) path += `?${params.join('&')}`;
        const res = await apiFetch(path);
        if (!res.ok) throw new Error('Failed to load products');

        const payload = await res.json();
        const products = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
        if (!Array.isArray(products) || products.length === 0) {
            productGrid.innerHTML = '<p class="col-span-full text-center py-10 text-slate-500">No products available.</p>';
            return;
        }

        productGrid.innerHTML = '';
        products.forEach(product => {
            productGrid.appendChild(createProductCard(product));
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error(err);
        productGrid.innerHTML = '<p class="col-span-full text-center py-10 text-red-500">Unable to load products. Try again later.</p>';
    }
}

function openProductModal(product) {
    currentProduct = product;

    const productTitle = product.title || product.name || 'Untitled Product';
    const fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%2394a3b8">No Image</text></svg>';
    const productImage = product.imageUrl || product.image || fallbackImage;
    const productPrice = product.price ?? 0;
    const productStock = Number(product.stock ?? 0);
    const isOutOfStock = productStock <= 0;

    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-content');
    const viewState = document.getElementById('modal-view-state');
    const successState = document.getElementById('modal-success-state');

    document.getElementById('modal-img').src = productImage;
    document.getElementById('modal-title').textContent = productTitle;
    document.getElementById('modal-price').textContent = `Rs ${productPrice}`;
    document.getElementById('modal-desc').textContent = product.description || 'No description available';
    document.getElementById('success-product-name').textContent = productTitle;
    const stockLine = document.getElementById('product-stock-line');
    if (stockLine) {
        stockLine.textContent = isOutOfStock ? 'Out of stock' : '';
        stockLine.className = `mt-2 text-sm ${isOutOfStock ? 'text-red-500' : 'hidden'}`;
    }

    const confirmButton = document.getElementById('confirm-add-to-cart');
    if (confirmButton) {
        confirmButton.disabled = isOutOfStock;
        const confirmLabel = confirmButton.querySelector('span');
        if (confirmLabel) {
            confirmLabel.textContent = isOutOfStock ? 'Sold out' : 'Add to Cart';
        }
    }

    viewState.classList.remove('hidden');
    successState.classList.add('hidden');
    successState.classList.remove('flex');

    const sizeButtons = document.querySelectorAll('.size-opt');
    sizeButtons.forEach(b => {
        b.classList.remove('bg-sky-50', 'border-sky-400', 'text-sky-500');
        if (b.dataset.size === 'M') {
            b.classList.add('bg-sky-50', 'border-sky-400', 'text-sky-500');
        }
    });

    modal.classList.remove('modal-hidden');
    modal.classList.add('modal-visible');

    setTimeout(() => {
        modalContent.classList.remove('scale-out');
        modalContent.classList.add('scale-in');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.classList.remove('scale-in');
    modalContent.classList.add('scale-out');

    setTimeout(() => {
        modal.classList.remove('modal-visible');
        modal.classList.add('modal-hidden');
    }, 300);
}

async function addToCart(productId, quantity = 1) {
    const token = localStorage.getItem('shirtifyToken');
    if (!token) {
        alert('Please login first to add items to cart.');
        return;
    }

    try {
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
            throw new Error(data.message || 'Failed to add to cart');
        }

        return await res.json();
    } catch (err) {
        console.error(err);
        alert(err.message || 'Could not add to cart');
        throw err;
    }
}

async function addToCartConfirm() {
    const viewState = document.getElementById('modal-view-state');
    const successState = document.getElementById('modal-success-state');

    try {
        if (!currentProduct) throw new Error('No product selected');

        if (Number(currentProduct.stock ?? 0) <= 0) {
            throw new Error('This product is out of stock');
        }

        await addToCart(currentProduct._id, 1);

        viewState.style.opacity = '0';

        setTimeout(() => {
            viewState.classList.add('hidden');
            successState.classList.remove('hidden');
            successState.classList.add('flex');

            void successState.offsetWidth;
            successState.style.opacity = '0';
            successState.style.transition = 'opacity 0.3s ease';
            successState.style.opacity = '1';

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 200);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Could not add to cart');
    }
}

function setupSizeButtons() {
    const sizeButtons = document.querySelectorAll('.size-opt');
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeButtons.forEach(b => b.classList.remove('bg-sky-50', 'border-sky-400', 'text-sky-500'));
            btn.classList.add('bg-sky-50', 'border-sky-400', 'text-sky-500');
        });
    });
}

function setupSizeFilter() {
    const sizeSelect = document.getElementById('size-filter');
    if (sizeSelect) {
        sizeSelect.addEventListener('change', async (e) => {
            const selectedValue = e.target.value;
            selectedSize = selectedValue === 'All Sizes' ? null : selectedValue;
            await loadProducts(selectedColor, selectedSize, selectedPrice);
        });
    }
}

function setupPriceFilter() {
    const priceSelect = document.getElementById('price-filter');
    if (priceSelect) {
        priceSelect.addEventListener('change', async (e) => {
            const val = e.target.value;
            if (val === 'all') {
                selectedPrice = null;
            } else if (/^\d+-\d+$/.test(val)) {
                selectedPrice = val;
            } else {
                selectedPrice = null;
            }
            await loadProducts(selectedColor, selectedSize, selectedPrice);
        });
    }
}

function setupColorFilter() {
    const colorButtons = document.querySelectorAll('.mb-8 .grid button');
    colorButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            colorButtons.forEach(b => b.classList.remove('ring-slate-400'));
            btn.classList.add('ring-slate-400');
            let color = btn.getAttribute('data-color');
            if (!color) {
                const colorClass = btn.className.match(/bg-(\w+)-\d+/);
                color = colorClass ? colorClass[1] : '';
            }
            selectedColor = color;
            await loadProducts(selectedColor, selectedSize, selectedPrice);
        });
    });
}

function initFooter() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Start
document.addEventListener('DOMContentLoaded', async () => {
    initFooter();
    setupSizeFilter();
    setupColorFilter();
    setupPriceFilter();
    await loadProducts();
});