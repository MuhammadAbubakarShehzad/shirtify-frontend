const API_BASE = 'http://localhost:5000/api';
let currentProduct = null;

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'group product-card';
    card.dataset.id = product._id;
    card.dataset.name = product.title;
    card.dataset.price = product.price;
    card.dataset.desc = product.description || '';
    card.dataset.img = product.imageUrl || 'https://via.placeholder.com/400x500?text=No+Image';

    const imageUrl = product.imageUrl && product.imageUrl.trim() ? product.imageUrl : 'https://via.placeholder.com/400x500?text=No+Image';

    card.innerHTML = `
        <div class="aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden mb-5 relative">
            <img src="${imageUrl}" alt="${product.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        </div>
        <h3 class="text-xl font-medium text-slate-900 mb-2">${product.title}</h3>
        <div class="flex gap-2 mb-4">
            <div class="w-4 h-4 rounded-full bg-slate-900"></div>
            <div class="w-4 h-4 rounded-full bg-slate-500"></div>
            <div class="w-4 h-4 rounded-full bg-slate-300"></div>
        </div>
        <div class="flex items-center justify-between">
            <span class="font-medium text-lg">Rs ${product.price}</span>
            <button class="add-btn flex items-center gap-2 bg-[#94D5E0] hover:bg-[#7DDDEE] text-white px-4 py-1.5 rounded-full transition-all shadow-sm hover:shadow-md">
                <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                <span class="font-medium text-sm">Add</span>
            </button>
        </div>
    `;

    const addBtn = card.querySelector('.add-btn');
    addBtn.addEventListener('click', () => openProductModal(product));

    return card;
}

async function loadProducts() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    productGrid.innerHTML = '<p class="col-span-full text-center py-10 text-slate-500">Loading products...</p>';

    try {
        const res = await fetch(`${API_BASE}/products`);
        if (!res.ok) throw new Error('Failed to load products');

        const products = await res.json();
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

    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-content');
    const viewState = document.getElementById('modal-view-state');
    const successState = document.getElementById('modal-success-state');

    document.getElementById('modal-img').src = product.imageUrl || 'https://via.placeholder.com/400x500?text=No+Image';
    document.getElementById('modal-title').textContent = product.title;
    document.getElementById('modal-price').textContent = `Rs ${product.price}`;
    document.getElementById('modal-desc').textContent = product.description || 'No description available';
    document.getElementById('success-product-name').textContent = product.title;

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

function setupColorFilter() {
    const colorButtons = document.querySelectorAll('.mb-8 .grid button');
    const selectedColors = new Set();

    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const colorClass = btn.className.match(/bg-\w+-\d+/)?.[0];
            if (!colorClass) return;

            btn.classList.toggle('ring-slate-400');

            if (btn.classList.contains('ring-slate-400')) {
                selectedColors.add(colorClass);
            } else {
                selectedColors.delete(colorClass);
            }

            filterProductsByColor(selectedColors);
        });
    });
}

function filterProductsByColor(selectedColors) {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        if (selectedColors.size === 0) {
            card.style.display = '';
            return;
        }

        const dots = card.querySelectorAll('.flex.gap-2 > div');
        const hasMatch = Array.from(dots).some(dot => {
            const dotClass = Array.from(dot.classList).find(c => c.startsWith('bg-'));
            return dotClass && selectedColors.has(dotClass);
        });

        card.style.display = hasMatch ? '' : 'none';
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
    setupSizeButtons();
    setupColorFilter();
    await loadProducts();
});