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

const SHIPPING_FEE = 100;

function getToken() {
    return localStorage.getItem('shirtifyToken');
}

async function fetchCart() {
    const token = getToken();
    if (!token) throw new Error('Login required to view cart');

    const res = await apiFetch('/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to get cart');
    }

    const payload = await res.json();
    return payload && payload.data ? payload.data : payload;
}

function renderCheckoutItems(cart) {
    const container = document.getElementById('checkout-cart-items');
    if (!container) return;

    let itemsHtml = '';
    let subtotal = 0;

    // Render server cart items
    if (cart && cart.items && cart.items.length > 0) {
        itemsHtml += cart.items.map(item => {
            const product = item.product || {};
            const title = product.title || 'Product';
            const price = product.price || 0;
            subtotal += price * item.quantity;
            const fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8">No Image</text></svg>';
            return `
                <div class="product-item">
                    <img src="${product.imageUrl || fallbackImage}" alt="${title}" class="thumb">
                    <div class="details">
                        <h4>${title}</h4>
                        <p>Qty: ${item.quantity}</p>
                        <span class="price">Rs ${(price * item.quantity).toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render custom designs from localStorage
    const customCart = JSON.parse(localStorage.getItem('customCart') || '[]');
    if (customCart.length > 0) {
        itemsHtml += customCart.map(item => {
            const price = item.price || 0;
            subtotal += price;
            const fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8">No Image</text></svg>';
            return `
                <div class="product-item">
                    <img src="${item.image || fallbackImage}" alt="Custom Design" class="thumb">
                    <div class="details">
                        <h4>${item.name || 'Custom Design'}</h4>
                        <p>Shirt: ${item.shirt || 'Custom'}</p>
                        <p>Size: ${item.size || 'N/A'}</p>
                        <span class="price">Rs ${price.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // If no items, show empty message
    if (!itemsHtml) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        document.getElementById('subtotal').innerText = 'Rs 0.00';
        document.getElementById('tax').innerText = 'Rs 0.00';
        document.getElementById('final-total').innerText = `Rs ${SHIPPING_FEE.toFixed(2)}`;
        return;
    }

    container.innerHTML = itemsHtml;

    const tax = +(subtotal * 0.05).toFixed(2);
    const total = subtotal + SHIPPING_FEE + tax;

    document.getElementById('subtotal').innerText = `Rs ${subtotal.toFixed(2)}`;
    document.getElementById('tax').innerText = `Rs ${tax.toFixed(2)}`;
    document.getElementById('final-total').innerText = `Rs ${total.toFixed(2)}`;
}

async function loadCheckoutCart() {
    try {
        const customCart = JSON.parse(localStorage.getItem('customCart') || '[]');
        
        // Try to fetch server cart, but don't fail if there's an error
        let cart = { items: [] };
        try {
            cart = await fetchCart();
        } catch (err) {
            console.warn('Could not fetch server cart, showing only custom designs:', err);
        }

        // Always render with combined items
        renderCheckoutItems(cart);
    } catch (err) {
        console.error(err);
        document.getElementById('checkout-cart-items').innerHTML = `<p>${err.message}</p>`;
    }
}

function setFormSubmit() {
    document.getElementById('shippingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = document.querySelector('.btn-continue');
        btn.textContent = 'Processing...';
        btn.style.opacity = '0.7';

        setTimeout(() => {
            alert('Shipping details saved! Moving to Payment...');
            window.location.href = '../payment-Info/payment-info.html';
        }, 1000);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    loadCheckoutCart();
    setFormSubmit();
});