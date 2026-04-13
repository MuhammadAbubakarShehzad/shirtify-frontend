const API_BASE = 'http://localhost:5000/api';
const SHIPPING_FEE = 100;

function getToken() {
    return localStorage.getItem('shirtifyToken');
}

async function fetchCart() {
    const token = getToken();
    if (!token) throw new Error('Login required to view cart');

    const res = await fetch(`${API_BASE}/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to get cart');
    }

    return res.json();
}

function renderCheckoutItems(cart) {
    const container = document.getElementById('checkout-cart-items');
    if (!container) return;

    if (!cart || !cart.items || cart.items.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        document.getElementById('subtotal').innerText = 'Rs 0.00';
        document.getElementById('tax').innerText = 'Rs 0.00';
        document.getElementById('final-total').innerText = `Rs ${SHIPPING_FEE.toFixed(2)}`;
        return;
    }

    const itemsHtml = cart.items.map(item => {
        const product = item.product || {};
        const title = product.title || 'Product';
        const price = product.price || 0;
        return `
            <div class="product-item">
                <img src="${product.imageUrl || 'https://via.placeholder.com/150'}" alt="${title}" class="thumb">
                <div class="details">
                    <h4>${title}</h4>
                    <p>Qty: ${item.quantity}</p>
                    <span class="price">Rs ${(price * item.quantity).toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = itemsHtml;

    const subtotal = cart.items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
    const tax = +(subtotal * 0.05).toFixed(2);
    const total = subtotal + SHIPPING_FEE + tax;

    document.getElementById('subtotal').innerText = `Rs ${subtotal.toFixed(2)}`;
    document.getElementById('tax').innerText = `Rs ${tax.toFixed(2)}`;
    document.getElementById('final-total').innerText = `Rs ${total.toFixed(2)}`;
}

async function loadCheckoutCart() {
    try {
        const cart = await fetchCart();
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