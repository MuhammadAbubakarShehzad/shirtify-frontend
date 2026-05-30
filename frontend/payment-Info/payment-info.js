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
let checkoutState = {
    cart: null,
    total: 0
};

function getToken() {
    return localStorage.getItem('shirtifyToken');
}

function getOnlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function setFeedback(message, type = 'info') {
    const feedback = document.getElementById('payment-feedback');
    if (!feedback) return;

    feedback.textContent = message || '';
    feedback.className = `payment-feedback ${type}`.trim();
}

async function fetchCart() {
    const token = getToken();
    if (!token) throw new Error('Please login to continue');

    const response = await apiFetch('/cart', {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Unable to fetch cart');
    }

    const payload = await response.json();
    return payload && payload.data ? payload.data : payload;
}

function renderCheckoutSummary(cart) {
    const container = document.getElementById('payment-cart-items');
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total-price');
    const payBtn = document.getElementById('payButton');

    let itemsHtml = '';
    let subtotal = 0;

    // Render server cart items
    if (cart?.items?.length > 0) {
        itemsHtml += cart.items.map((item) => {
            const product = item.product || {};
            const name = product.title || 'Product';
            const price = product.price || 0;
            const qty = item.quantity;
            const img = product.imageUrl || 'https://via.placeholder.com/80';
            const lineTotal = price * qty;
            subtotal += lineTotal;

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
    }

    // Render custom designs from localStorage
    const customCart = JSON.parse(localStorage.getItem('customCart') || '[]');
    if (customCart.length > 0) {
        itemsHtml += customCart.map((item) => {
            const name = item.name || 'Custom Design';
            const price = item.price || 0;
            const img = item.image || 'https://via.placeholder.com/80';
            subtotal += price;

            return `
                <div class="product-item">
                    <img src="${img}" class="prod-img" alt="${name}">
                    <div class="prod-details">
                        <h4>${name}</h4>
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
        subtotalEl.innerText = 'Rs 0.00';
        taxEl.innerText = 'Rs 0.00';
        totalEl.innerText = `Rs ${SHIPPING_FEE.toFixed(2)}`;
        checkoutState = { cart: cart || null, total: 0 };
        payBtn.disabled = true;
        payBtn.innerText = 'Pay Rs 0.00';
        return;
    }

    container.innerHTML = itemsHtml;

    const tax = +(subtotal * 0.05).toFixed(2);
    const total = subtotal + SHIPPING_FEE + tax;
    checkoutState = { cart, total };

    subtotalEl.innerText = `Rs ${subtotal.toFixed(2)}`;
    taxEl.innerText = `Rs ${tax.toFixed(2)}`;
    totalEl.innerText = `Rs ${total.toFixed(2)}`;
    payBtn.innerText = `Pay Rs ${total.toFixed(2)}`;
    payBtn.disabled = false;
}

async function loadPaymentDetails() {
    try {
        // Try to fetch server cart, but don't fail if there's an error
        let cart = { items: [] };
        try {
            cart = await fetchCart();
        } catch (err) {
            console.warn('Could not fetch server cart, showing only custom designs:', err);
        }

        // Always render with combined items (server + custom)
        renderCheckoutSummary(cart);
    } catch (err) {
        console.error(err);
        document.getElementById('payment-cart-items').innerHTML = `<p>${err.message}</p>`;
        setFeedback(err.message, 'error');
    }
}

function getSelectedPaymentMethod() {
    const selected = document.querySelector('input[name="payment"]:checked');
    return selected ? selected.value : null;
}

function buildPaymentPayload() {
    const paymentMethod = getSelectedPaymentMethod();
    const amount = Number(checkoutState.total || 0);

    if (!amount) {
        throw new Error('Your cart is empty. Add items before payment.');
    }

    if (!paymentMethod) {
        throw new Error('Please select a payment method.');
    }

    const payload = {
        amount,
        currency: 'PKR',
        paymentMethod
    };

    if (paymentMethod === 'bank') {
        const accountTitle = document.getElementById('bankAccountTitle')?.value?.trim() || '';
        const bankName = document.getElementById('bankName')?.value?.trim() || '';
        const ibanOrAccountNumber = document.getElementById('bankAccountNumber')?.value?.trim() || '';

        if (!accountTitle || !bankName || !ibanOrAccountNumber) {
            throw new Error('Please enter bank transfer details before continuing.');
        }

        payload.accountTitle = accountTitle;
        payload.bankName = bankName;
        payload.ibanOrAccountNumber = ibanOrAccountNumber;
        payload.payerName = accountTitle;
    }

    if (paymentMethod === 'easypaisa') {
        const mobile = getOnlyDigits(document.getElementById('easypaisaMobile')?.value || '');
        const accountName = document.getElementById('easypaisaAccountName')?.value?.trim() || '';

        if (mobile.length < 11 || !accountName) {
            throw new Error('Please enter a valid Easypaisa mobile number and account name.');
        }

        payload.mobileNumber = mobile;
        payload.payerName = accountName;
    }

    if (paymentMethod === 'jazzcash') {
        const mobile = getOnlyDigits(document.getElementById('jazzcashMobile')?.value || '');
        const cnicLast6 = getOnlyDigits(document.getElementById('jazzcashCnic')?.value || '');

        if (mobile.length < 11 || cnicLast6.length !== 6) {
            throw new Error('Please enter a valid JazzCash mobile number and exactly 6 CNIC digits.');
        }

        payload.mobileNumber = mobile;
        payload.cnicLast6 = cnicLast6;
    }

    return payload;
}

async function initiatePayment(payload) {
    const token = getToken();
    if (!token) throw new Error('Please login to continue');

    const response = await apiFetch('/payment-gateway/initiate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Unable to initiate payment');
    }

    return data;
}

async function cacheOrderPreview() {
    const cart = await fetchCart();
    if (!cart.items?.length) return;

    const first = cart.items[0];
    localStorage.setItem('orderImage', first.product?.imageUrl || '');
    localStorage.setItem('orderPrice', first.product?.price || 0);
}

function proceedAfterPayment(result) {
    const paymentId = result?.payment?._id || '';
    localStorage.setItem('lastPaymentId', paymentId);
    setFeedback(result.message || 'Payment request created.', result.status === 'success' ? 'success' : 'info');
    alert(result.message || 'Payment request created successfully.');
    window.location.href = '../orderconformation/orderconfirmation.html';
}

document.getElementById('payButton').addEventListener('click', async () => {
    const payBtn = document.getElementById('payButton');
    const originalText = payBtn.innerText;
    payBtn.innerText = 'Processing...';
    payBtn.style.opacity = '0.7';
    payBtn.disabled = true;
    setFeedback('');

    try {
        const payload = buildPaymentPayload();
        const result = await initiatePayment(payload);
        await cacheOrderPreview();
        proceedAfterPayment(result);
    } catch (error) {
        console.error(error);
        setFeedback(error.message || 'Payment failed. Please try again.', 'error');
        alert(error.message || 'Payment failed. Please try again.');
        localStorage.removeItem('orderImage');
        localStorage.removeItem('orderPrice');
        localStorage.removeItem('lastPaymentId');
    } finally {
        payBtn.innerText = originalText;
        payBtn.style.opacity = '1';
        payBtn.disabled = false;
    }
});

function showForm(method) {
    document.getElementById('bankForm').style.display = 'none';
    document.getElementById('easypaisaForm').style.display = 'none';
    document.getElementById('jazzcashForm').style.display = 'none';

    if (method === 'bank') {
        document.getElementById('bankForm').style.display = 'block';
        setFeedback('Bank transfer creates a pending payment record for later verification.', 'info');
    } else if (method === 'easypaisa') {
        document.getElementById('easypaisaForm').style.display = 'block';
        setFeedback('Easypaisa requires merchant onboarding. Mock mode can still be used for development.', 'info');
    } else if (method === 'jazzcash') {
        document.getElementById('jazzcashForm').style.display = 'block';
        setFeedback('JazzCash requests are now sent to the backend gateway route.', 'info');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadPaymentDetails();
    showForm(getSelectedPaymentMethod() || 'bank');
});
