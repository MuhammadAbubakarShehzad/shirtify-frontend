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

function viewOrder(orderId) {
    // Navigate to the same page with an `id` query param so we can show details
    const base = window.location.pathname.replace(/\/[^/]*$/, '');
    // Ensure we keep same folder and file
    window.location.href = `${base}/orderinfo.html?id=${encodeURIComponent(orderId)}`;
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function renderOrderDetails(order) {
    const container = document.getElementById('orders-list');
    if (!container) return;
    if (!order) {
        container.innerHTML = '<p>Order not found.</p>';
        return;
    }

    const itemsHtml = (order.items || []).map(item => {
        const prod = item.product || {};
        const name = prod.title || prod.name || 'Product';
        const img = prod.imageUrl || prod.image || '';
        const qty = item.quantity || 1;
        const price = Number(prod.price || prod.unitPrice || 0) * qty;
        return `
            <div class="order-item">
                <img src="${img}" alt="${name}" class="item-thumb">
                <div class="item-meta">
                    <h4>${name}</h4>
                    <p>Qty: ${qty}</p>
                    <p>Rs ${price.toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');

    const date = order.createdAt ? new Date(order.createdAt).toLocaleString() : '';
    const total = Number(order.totalAmount ?? order.total ?? 0).toFixed(2);

    container.innerHTML = `
        <div class="order-detail-card">
            <div class="order-header">
                <h2>Order #${(order._id || order.id || '').slice(-8).toUpperCase()}</h2>
                <div class="order-meta">Status: ${order.status || 'N/A'} • ${date}</div>
            </div>
            <div class="order-items">${itemsHtml}</div>
            <div class="order-summary">
                <div>Total: <strong>Rs ${total}</strong></div>
            </div>
            <div style="margin-top:12px;"><button onclick="window.location.href='orderinfo.html'">← Back to Orders</button></div>
        </div>
    `;
}

function getBadgeClass(status) {
    switch (status) {
        case 'pending': return 'badge pending';
        case 'confirmed': return 'badge confirmed';
        case 'shipped': return 'badge shipped';
        case 'delivered': return 'badge delivered';
        case 'cancelled': return 'badge cancelled';
        default: return 'badge';
    }
}

function renderOrders(orders) {
    const ordersList = document.getElementById('orders-list');
    ordersList.innerHTML = '';
    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<p>No orders found.</p>';
        return;
    }
    orders.forEach(order => {
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const date = new Date(order.createdAt).toLocaleDateString();
        const badgeClass = getBadgeClass(order.status);
        const productImgs = order.items.slice(0, 3).map(i =>
            i.product && (i.product.imageUrl || i.product.image) ? `<img src="${i.product.imageUrl || i.product.image}" alt="Shirt" class="preview-thumb">` : ''
        ).join('');
        ordersList.innerHTML += `
        <div class="order-card" onclick="viewOrder('${order._id}')">
            <div class="order-content">
                <div class="product-preview">
                    ${productImgs}
                </div>
                <div class="order-info">
                    <div class="info-header">
                        <span class="order-num">Order #${order._id.slice(-8).toUpperCase()}</span>
                        <span class="${badgeClass}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    </div>
                    <p class="date">${date}</p>
                    <p class="item-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</p>
                </div>
            </div>
            <div class="order-total">
                <div class="total-text">
                    <span class="label">Total</span>
                    <span class="price">Rs ${Number(order.totalAmount ?? order.total ?? 0).toFixed(2)}</span>
                </div>
                <span class="arrow">›</span>
            </div>
        </div>
        `;
    });
}

// Image modal (lightbox) helpers
function createImageModal() {
    if (document.getElementById('image-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.style.position = 'fixed';
    modal.style.left = 0;
    modal.style.top = 0;
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 9999;
    modal.style.cursor = 'zoom-out';

    const img = document.createElement('img');
    img.id = 'image-modal-img';
    img.style.maxWidth = '95%';
    img.style.maxHeight = '95%';
    img.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    img.style.borderRadius = '6px';

    modal.appendChild(img);
    modal.addEventListener('click', hideImageModal);
    document.body.appendChild(modal);
}

function showImageModal(src) {
    createImageModal();
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-img');
    if (!modal || !img) return;
    img.src = src;
    modal.style.display = 'flex';
}

function hideImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) modal.style.display = 'none';
}

// Delegate clicks on thumbnails to open modal
document.addEventListener('click', function (e) {
    const t = e.target;
    if (!t) return;
    if (t.classList && (t.classList.contains('preview-thumb') || t.classList.contains('item-thumb'))) {
        e.stopPropagation();
        e.preventDefault();
        showImageModal(t.src || t.getAttribute('data-src'));
    }
});

async function fetchOrders() {
    const token = localStorage.getItem('shirtifyToken');
    if (!token) {
        document.getElementById('orders-list').innerHTML = '<p>Please log in to view your orders.</p>';
        return;
    }

    // If an order id is present in the URL, fetch and render that single order
    const orderId = getQueryParam('id');
    if (orderId) {
        try {
            const res = await apiFetch(`/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch order details');
            const payload = await res.json();
            const order = payload && (payload.data || payload.order) ? (payload.data || payload.order) : payload;
            renderOrderDetails(order);
            return;
        } catch (err) {
            document.getElementById('orders-list').innerHTML = '<p>Error loading order details.</p>';
            console.error(err);
            return;
        }
    }

    try {
        const res = await apiFetch('/orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch orders');
        const payload = await res.json();
        const orders = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
        renderOrders(orders);
    } catch (err) {
        document.getElementById('orders-list').innerHTML = '<p>Error loading orders.</p>';
        console.error(err);
    }
}

window.addEventListener('DOMContentLoaded', fetchOrders);