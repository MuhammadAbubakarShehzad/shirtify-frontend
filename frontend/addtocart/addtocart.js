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

const shippingFee = 100;
let currentCart = null;

const getToken = () => localStorage.getItem('shirtifyToken');

const fetchCart = async () => {
    const token = getToken();
    if (!token) throw new Error('Login required to view cart');

    const res = await apiFetch('/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch cart');
    }

    const payload = await res.json();
    return payload && payload.data ? payload.data : payload;
};

const updateCartToServer = async (items) => {
    const token = getToken();
    if (!token) throw new Error('Login required to update cart');

    const res = await apiFetch('/cart', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items })
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update cart');
    }

    const payload = await res.json();
    return payload && payload.data ? payload.data : payload;
};

const deleteCartItem = async (productId) => {
    const token = getToken();
    if (!token) throw new Error('Login required to remove item');

    const res = await apiFetch(`/cart/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to remove item');
    }

    const payload = await res.json();
    return payload && payload.data ? payload.data : payload;
};

function renderCart() {
    const cartList = document.getElementById('cart-list');
    let html = '';

    // Render server cart items
    if (currentCart && currentCart.items && currentCart.items.length > 0) {
        html += currentCart.items.map(item => {
            const product = item.product || {};
            const title = product.title || 'Product';
            const price = product.price || 0;
            const fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8">No Image</text></svg>';
            const img = product.imageUrl || fallbackImage;
            return `
                <div class="cart-item" data-id="${product._id}">
                    <img src="${img}" alt="${title}">
                    <div class="item-details">
                        <h4>${title}</h4>
                        <p>RS ${price.toFixed(2)}</p>
                    </div>
                    <div class="quantity-controls">
                        <button class="qty-btn" onclick="updateQty('${product._id}', 1)">+</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQty('${product._id}', -1)">-</button>
                    </div>
                    <button class="remove-btn" onclick="removeItem('${product._id}')">Remove</button>
                </div>
            `;
        }).join('');
    }

    // Render custom designs from localStorage
    const customCart = JSON.parse(localStorage.getItem('customCart') || '[]');
    if (customCart.length > 0) {
        html += customCart.map((item, idx) => {
            return `
                <div class="cart-item custom-design" data-custom-idx="${idx}">
                    <img src="${item.image}" alt="Custom Design">
                    <div class="item-details">
                        <h4>${item.name || 'Custom Design'}</h4>
                        <p>Shirt: ${item.shirt || ''}</p>
                        <p>Size: ${item.size || ''}</p>
                        <p>RS ${item.price ? item.price.toFixed(2) : '0.00'}</p>
                    </div>
                    <button class="remove-btn" onclick="removeCustomItem(${idx})">Remove</button>
                </div>
            `;
        }).join('');
    }

    if (!html) {
        html = '<p class="empty-cart">Your cart is empty.</p>';
    }
    cartList.innerHTML = html;
    updateTotals();
}
// Remove custom design from localStorage cart
window.removeCustomItem = function(idx) {
    let customCart = JSON.parse(localStorage.getItem('customCart') || '[]');
    customCart.splice(idx, 1);
    localStorage.setItem('customCart', JSON.stringify(customCart));
    renderCart();
}

function updateTotals() {
    const subtotal = currentCart.items.reduce((acc, item) => {
        const price = item.product?.price || 0;
        return acc + price * item.quantity;
    }, 0);
    const total = subtotal + shippingFee;

    document.getElementById('subtotal').innerText = `RS ${subtotal.toFixed(2)}`;
    document.getElementById('grand-total').innerText = `RS ${total.toFixed(2)}`;
}

window.updateQty = async (productId, change) => {
    if (!currentCart || !currentCart.items) return;

    const index = currentCart.items.findIndex(item => item.product?._id === productId);
    if (index < 0) return;

    currentCart.items[index].quantity += change;
    if (currentCart.items[index].quantity < 1) currentCart.items[index].quantity = 1;

    const updateItems = currentCart.items.map(item => ({ product: item.product._id, quantity: item.quantity }));
    await updateCartToServer(updateItems);

    currentCart = await fetchCart();
    renderCart();
};

window.removeItem = async (productId) => {
    try {
        await deleteCartItem(productId);
        currentCart = await fetchCart();
        renderCart();
    } catch (err) {
        console.error(err);
        alert(err.message || 'Could not remove item');
    }
};

const loadCart = async () => {
    try {
        currentCart = await fetchCart();
        renderCart();
    } catch (err) {
        const cartList = document.getElementById('cart-list');
        cartList.innerHTML = `<p class="empty-cart">${err.message}</p>`;
        document.getElementById('subtotal').innerText = 'RS 0.00';
        document.getElementById('grand-total').innerText = `RS ${shippingFee.toFixed(2)}`;
    }
};

loadCart();