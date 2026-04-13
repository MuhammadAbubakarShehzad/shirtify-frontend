
const API_BASE = 'http://localhost:5000/api';

function viewOrder(orderId) {
    // Redirect to order details page (implement if needed)
    // window.location.href = `order-details.html?id=${orderId}`;
    alert('Order details for: ' + orderId);
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
            i.product && i.product.image ? `<img src="${i.product.image}" alt="Shirt">` : ''
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
                    <span class="price">Rs ${order.total.toFixed(2)}</span>
                </div>
                <span class="arrow">›</span>
            </div>
        </div>
        `;
    });
}

async function fetchOrders() {
    const token = localStorage.getItem('shirtifyToken');
    if (!token) {
        document.getElementById('orders-list').innerHTML = '<p>Please log in to view your orders.</p>';
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch orders');
        const orders = await res.json();
        renderOrders(orders);
    } catch (err) {
        document.getElementById('orders-list').innerHTML = '<p>Error loading orders.</p>';
        console.error(err);
    }
}

window.addEventListener('DOMContentLoaded', fetchOrders);