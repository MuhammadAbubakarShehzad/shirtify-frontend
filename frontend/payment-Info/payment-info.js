const API_BASE = 'http://localhost:5000/api';
const SHIPPING_FEE = 100;

function getToken() {
    return localStorage.getItem('shirtifyToken');
}

async function fetchCart() {
    const token = getToken();
    if (!token) throw new Error('Please login to continue');

    const response = await fetch(`${API_BASE}/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Unable to fetch cart');
    }

    return response.json();
}

function renderCheckoutSummary(cart) {
    const container = document.getElementById('payment-cart-items');
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total-price');
    const payBtn = document.getElementById('payButton');

    if (!cart?.items?.length) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        subtotalEl.innerText = 'Rs 0.00';
        taxEl.innerText = 'Rs 0.00';
        totalEl.innerText = `Rs ${SHIPPING_FEE.toFixed(2)}`;
        payBtn.disabled = true;
        payBtn.innerText = 'Pay Rs 0.00';
        return;
    }

    const itemsHtml = cart.items.map(item => {
        const product = item.product || {};
        const name = product.title || 'Product';
        const price = product.price || 0;
        const qty = item.quantity;
        const img = product.imageUrl || 'https://via.placeholder.com/80';
        const lineTotal = price * qty;

        return `
            <div class="product-item">
                <img src="${img}" class="prod-img" alt="${name}">
                <div class="prod-details">
                    <h4>${name}</h4>
                    <p>Qty: ${qty}</p>
                    <span class="price">Rs ${lineTotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = itemsHtml;

    const subtotal = cart.items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);
    const tax = +(subtotal * 0.05).toFixed(2);
    const total = subtotal + SHIPPING_FEE + tax;

    subtotalEl.innerText = `Rs ${subtotal.toFixed(2)}`;
    taxEl.innerText = `Rs ${tax.toFixed(2)}`;
    totalEl.innerText = `Rs ${total.toFixed(2)}`;
    payBtn.innerText = `Pay Rs ${total.toFixed(2)}`;
    payBtn.disabled = false;
}

async function loadPaymentDetails() {
    try {
        const cart = await fetchCart();
        renderCheckoutSummary(cart);
    } catch (err) {
        console.error(err);
        document.getElementById('payment-cart-items').innerHTML = `<p>${err.message}</p>`;
    }
}

document.getElementById('payButton').addEventListener('click', async () => {
    const payBtn = document.getElementById('payButton');
    payBtn.innerText = 'Processing...';
    payBtn.style.opacity = '0.7';

    // Fetch cart and store first item image and price for confirmation screen
    try {
        const cart = await fetchCart();
        if (cart.items && cart.items.length > 0) {
            const first = cart.items[0];
            const img = first.product?.imageUrl || '';
            const price = first.product?.price || 0;
            localStorage.setItem('orderImage', img);
            localStorage.setItem('orderPrice', price);
        }
    } catch (e) {
        // fallback: clear
        localStorage.removeItem('orderImage');
        localStorage.removeItem('orderPrice');
    }

    setTimeout(() => {
        alert('Payment Successful! Your order has been placed.');
        window.location.href = '../orderconformation/orderconfirmation.html';
    }, 1500);
});

function showForm(method) {
    document.getElementById('bankForm').style.display = 'none';
    document.getElementById('easypaisaForm').style.display = 'none';
    document.getElementById('jazzcashForm').style.display = 'none';

    if (method === 'bank') {
        document.getElementById('bankForm').style.display = 'block';
    } else if (method === 'easypaisa') {
        document.getElementById('easypaisaForm').style.display = 'block';
    } else if (method === 'jazzcash') {
        document.getElementById('jazzcashForm').style.display = 'block';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadPaymentDetails();
});
