// Shirtify API Service
// This service handles all communication with the backend REST API
// Replaces localStorage-based data management with real HTTP requests

var API_BASE_URL = window.API_BASE_URL || (() => {
    const savedApiBase = localStorage.getItem('shirtifyApiBase');
    if (savedApiBase && savedApiBase.startsWith('http') && savedApiBase !== 'null' && savedApiBase !== 'undefined') {
        return savedApiBase;
    }
    if (window.location.protocol.startsWith('http')) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
            return 'http://localhost:5000/api';
        }
        return 'https://backend-production-e03d.up.railway.app/api';
    }
    return 'http://localhost:5000/api';
})();
window.API_BASE_URL = API_BASE_URL;

// API Service Object (Exposed Globally)
window.ShirtifyAPI = {
    // Authentication token management
    token: null,
    currentUser: null,
    
    init() {
        // Load token from localStorage if exists
        this.token = localStorage.getItem('shirtify_token');
        const userData = localStorage.getItem('shirtify_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    },

    // Helper method to make API requests
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add auth token if available
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers,
        };

        // Add timeout (30 seconds for heavy ML requests)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        config.signal = controller.signal;

        // Check for Demo Mode flag
        const isDemoMode = localStorage.getItem('shirtify_demo_mode') === 'true';

        try {
            // In Demo Mode, simulate network delay then return mock data
            if (isDemoMode) {
                await new Promise(r => setTimeout(r, 600)); // Simulate 600ms latency
                return this.handleMockRequest(endpoint, options);
            }

            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            const data = await response.json();

            if (!response.ok) {
                // Handle Token Expiry / Unauthorized Access
                if (response.status === 401) {
                    console.warn('Unauthorized access. Redirecting to login...');
                    this.logout();
                    window.location.href = 'login.html';
                    return { success: false, error: 'Session expired' };
                }
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            // If request fails (e.g. backend down) AND we aren't already in strict demo mode,
            // we could optionally fallback or just let the caller handle it.
            // For now, re-throw so the UI knows it failed.
            throw error;
        }
    },

    // MOCK DATA HANDLER
    handleMockRequest(endpoint, options) {
        console.log(`[Demo Mode] Mocking request to: ${endpoint}`);

        // Mock Products
        if (endpoint.includes('/products/stats')) {
            return {
                success: true,
                data: { totalProducts: 12, totalValue: 45000, lowStock: 2 }
            };
        }

        if (endpoint.includes('/products') && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
            return {
                success: true,
                data: [
                    { _id: '1', name: 'Premium Blank Tee', price: 25, category: 'Casual', stock: 50, sales: 120, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=60' },
                    { _id: '2', name: 'Urban Streetwear', price: 30, category: 'Graphic', stock: 35, sales: 85, image: 'https://images.unsplash.com/photo-1503342217505-b0815a046baf?auto=format&fit=crop&w=500&q=60' },
                    { _id: '3', name: 'Classic Polo', price: 35, category: 'Formal', stock: 40, sales: 95, image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=500&q=60' },
                    { _id: '4', name: 'Sports Tee', price: 28, category: 'Sports', stock: 5, sales: 110, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=500&q=60' },
                    { _id: '5', name: 'Vintage Print', price: 32, category: 'Graphic', stock: 25, sales: 65, image: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&w=500&q=60' }
                ]
            };
        }

        // Mock Orders
        if (endpoint.includes('/orders/stats')) {
            return {
                success: true,
                data: { totalOrders: 156, totalRevenue: 54200, pendingOrders: 12, completedOrders: 140 }
            };
        }

        if (endpoint.includes('/orders') && !endpoint.includes('analytics')) {
            return {
                success: true,
                data: [
                    { _id: 'ORD-001', orderNumber: 'ORD-7829', customer: { name: 'John Doe', city: 'New York' }, totalAmount: 85, status: 'delivered', paymentMethod: 'card', createdAt: new Date().toISOString() },
                    { _id: 'ORD-002', orderNumber: 'ORD-7830', customer: { name: 'Sarah Smith', city: 'London' }, totalAmount: 45, status: 'processing', paymentMethod: 'paypal', createdAt: new Date(Date.now() - 86400000).toISOString() },
                    { _id: 'ORD-003', orderNumber: 'ORD-7831', customer: { name: 'Mike Ross', city: 'Toronto' }, totalAmount: 120, status: 'pending', paymentMethod: 'cod', createdAt: new Date(Date.now() - 172800000).toISOString() },
                    { _id: 'ORD-004', orderNumber: 'ORD-7832', customer: { name: 'Jessica Pearson', city: 'Chicago' }, totalAmount: 250, status: 'shipped', paymentMethod: 'card', createdAt: new Date(Date.now() - 259200000).toISOString() }
                ]
            };
        }

        // Mock Analytics
        if (endpoint.includes('/analytics')) {
            return {
                success: true,
                data: {
                    timeline: [
                        { date: 'Jan', revenue: 4000, units: 150 },
                        { date: 'Feb', revenue: 3500, units: 120 },
                        { date: 'Mar', revenue: 5000, units: 180 },
                        { date: 'Apr', revenue: 6200, units: 220 },
                        { date: 'May', revenue: 5800, units: 200 },
                        { date: 'Jun', revenue: 7500, units: 250 }
                    ],
                    products: [
                        { name: 'Premium Blank Tee', revenue: 1500, units: 60, trend: '+12%' },
                        { name: 'Urban Streetwear', revenue: 1200, units: 40, trend: '+8%' },
                        { name: 'Sports Tee', revenue: 900, units: 32, trend: '-5%' }
                    ]
                }
            };
        }

        // Mock Auth
        if (endpoint === '/auth/me') {
            return {
                success: true,
                data: JSON.parse(localStorage.getItem('shirtify_user')) || { _id: 'demo', name: 'Demo Admin', email: 'demo@example.com', role: 'admin' }
            };
        }

        if (endpoint === '/auth/users') {
            return {
                success: true,
                data: [
                    { _id: 'u1', name: 'Alice Customer', email: 'alice@test.com', role: 'user', isActive: true },
                    { _id: 'u2', name: 'Bob Shopper', email: 'bob@test.com', role: 'user', isActive: true }
                ]
            };
        }

        // Default success for other actions (create/update/delete)
        return { success: true, data: { _id: 'mock_id_' + Date.now(), ...JSON.parse(options.body || '{}') } };
    },

    // ==================== AUTHENTICATION ====================

    async login(email, password) {
        try {
            const data = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            if (data.success) {
                this.token = data.data.token;
                this.currentUser = data.data;
                localStorage.setItem('shirtify_token', this.token);
                localStorage.setItem('shirtify_user', JSON.stringify(this.currentUser));
            }

            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async register(name, email, password, role = 'admin') {
        try {
            const data = await this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, role }),
            });

            if (data.success) {
                this.token = data.data.token;
                this.currentUser = data.data;
                localStorage.setItem('shirtify_token', this.token);
                localStorage.setItem('shirtify_user', JSON.stringify(this.currentUser));
            }

            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getCurrentUser() {
        try {
            const data = await this.request('/auth/me');
            if (data.success) {
                this.currentUser = data.data;
                localStorage.setItem('shirtify_user', JSON.stringify(this.currentUser));
            }
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('shirtify_token');
        localStorage.removeItem('shirtify_user');
    },

    isAuthenticated() {
        return this.token !== null && this.currentUser !== null;
    },

    async getAllUsers() {
        try {
            const data = await this.request('/users');
            return data;
        } catch (error) {
            return { success: false, error: error.message, data: [] };
        }
    },

    async getAllMockShirts() {
        try {
            const data = await this.request('/mockshirts');
            return data;
        } catch (error) {
            return { success: false, error: error.message, data: [] };
        }
    },

    async createMockShirt(mockShirtData) {
        try {
            const data = await this.request('/mockshirts', {
                method: 'POST',
                body: JSON.stringify(mockShirtData),
            });
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async deleteMockShirt(id) {
        try {
            const data = await this.request(`/mockshirts/${id}`, {
                method: 'DELETE',
            });
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getAllFeedback() {
        try {
            const data = await this.request('/feedback');
            return data;
        } catch (error) {
            return { success: false, error: error.message, data: [] };
        }
    },

    // ==================== PRODUCTS ====================

    async getAllProducts(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (filters.category) queryParams.append('category', filters.category);
            if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
            if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.sort) queryParams.append('sort', filters.sort);

            const queryString = queryParams.toString();
            const endpoint = queryString ? `/products?${queryString}` : '/products';

            const data = await this.request(endpoint);
            return data;
        } catch (error) {
            console.error('Error fetching products:', error);
            return { success: false, error: error.message, data: [] };
        }
    },

    async getProductById(id) {
        try {
            const data = await this.request(`/products/${id}`);
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async createProduct(productData) {
        try {
            const data = await this.request('/products', {
                method: 'POST',
                body: JSON.stringify(productData),
            });
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async updateProduct(id, updates) {
        try {
            const data = await this.request(`/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async deleteProduct(id) {
        try {
            const data = await this.request(`/products/${id}`, {
                method: 'DELETE',
            });
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getProductStats() {
        try {
            const data = await this.request('/products/stats');
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // ==================== ORDERS ====================

    async getAllOrders(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.sort) queryParams.append('sort', filters.sort);

            const queryString = queryParams.toString();
            const endpoint = queryString ? `/orders?${queryString}` : '/orders';

            const data = await this.request(endpoint);
            return data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            return { success: false, error: error.message, data: [] };
        }
    },

    async getOrderById(id) {
        try {
            const data = await this.request(`/orders/${id}`);
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async createOrder(orderData) {
        try {
            const data = await this.request('/orders', {
                method: 'POST',
                body: JSON.stringify(orderData),
            });
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async updateOrder(id, updates) {
        try {
            const data = await this.request(`/orders/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async deleteOrder(id) {
        try {
            const data = await this.request(`/orders/${id}`, {
                method: 'DELETE',
            });
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getOrderStats() {
        try {
            const data = await this.request('/orders/stats');
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getAllOrdersAdmin() {
        try {
            const data = await this.request('/orders/admin/all');
            return data;
        } catch (error) {
            console.error('Error fetching all orders from admin endpoint:', error);
            return { success: false, error: error.message, orders: [] };
        }
    },

    async getOrderStatsAdmin() {
        try {
            const data = await this.request('/orders/admin/stats');
            return data;
        } catch (error) {
            console.error('Error fetching order stats from admin endpoint:', error);
            return { success: false, error: error.message };
        }
    },

    async getAnalytics(period = 12) {
        try {
            const data = await this.request(`/orders/analytics?period=${period}`);
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Sales Analytics (NEW)
    async getSalesAnalytics(startDate, endDate, interval = 'daily') {
        try {
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('startDate', startDate);
            if (endDate) queryParams.append('endDate', endDate);
            if (interval) queryParams.append('interval', interval);

            const queryString = queryParams.toString();
            const endpoint = queryString ? `/admin/sales-analytics?${queryString}` : '/admin/sales-analytics';

            const data = await this.request(endpoint);
            return data;
        } catch (error) {
            console.error('Error fetching sales analytics:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== PROPHET ML SERVICE ====================

    async getProphetForecast(period = 6, days = 120, source = 'mock') {
        try {
            const data = await this.request(`/ml/predict?period=${period}&days=${days}&source=${source}`);
            return data;
        } catch (error) {
            console.error('Error fetching Prophet forecast:', error);
            return { success: false, error: error.message };
        }
    },

    async getProphetDistribution(period = 6, source = 'mock') {
        try {
            const data = await this.request(`/ml/distribution?period=${period}&source=${source}`);
            return data;
        } catch (error) {
            console.error('Error fetching Prophet distribution:', error);
            return { success: false, error: error.message };
        }
    },

    async getProphetProducts(period = 6, source = 'mock') {
        try {
            const data = await this.request(`/ml/products?period=${period}&source=${source}`);
            return data;
        } catch (error) {
            console.error('Error fetching Prophet products:', error);
            return { success: false, error: error.message };
        }
    },

    async forecastFromCSV(csvText, horizon = 4) {
        try {
            const data = await this.request('/ml/forecast-from-csv', {
                method: 'POST',
                body: JSON.stringify({ csvText, horizon })
            });
            return data;
        } catch (error) {
            console.error('Error doing CSV forecast:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== UTILITY FUNCTIONS ====================

    // Check API health
    async checkHealth() {
        try {
            const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Health Check Failed:', error);
            return { success: false, error: 'Backend server is not running' };
        }
    },
};

// Initialize on load
ShirtifyAPI.init();

// Backward compatibility wrapper for existing code
// This maintains the same interface as the old ShirtifyData object
const ShirtifyStore = {
    products: [],
    orders: [],
    users: [], // Added users array
    currentUser: null,
    analyticsData: {
        dates: ['Oct 2023', 'Nov 2023', 'Dec 2023', 'Jan 2024', 'Feb 2024', 'Mar 2024',
            'Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024'],
        units: [420, 385, 450, 380, 425, 480, 510, 565, 620, 640, 595, 580],
        revenue: [1050000, 962500, 1125000, 950000, 1062500, 1200000,
            1275000, 1412500, 1550000, 1600000, 1487500, 1450000],
        products: [
            { name: 'Casual Round Neck', category: 'Casual', size: 'M', color: 'Black', units: 1250, revenue: 3125000, price: 2500, trend: '+15%' },
            { name: 'Casual V-Neck', category: 'Casual', size: 'L', color: 'White', units: 980, revenue: 2450000, price: 2500, trend: '+12%' },
            { name: 'Sports Performance', category: 'Sports', size: 'L', color: 'Blue', units: 850, revenue: 2550000, price: 3000, trend: '+22%' },
            { name: 'Graphic Print Urban', category: 'Graphic', size: 'M', color: 'Multi', units: 780, revenue: 2340000, price: 3000, trend: '+18%' },
            { name: 'Formal Polo', category: 'Formal', size: 'M', color: 'Navy', units: 720, revenue: 2520000, price: 3500, trend: '+8%' },
        ]
    },

    // Initialize - load data from API
    async init() {
        try {
            const productsResponse = await ShirtifyAPI.getAllProducts();
            if (productsResponse.success) {
                // Map products to the format expected by the dashboard
                this.products = (productsResponse.data || []).map(product => ({
                    id: product._id,
                    designName: product.name,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    image: product.image.startsWith('http') ? product.image : '../' + product.image,
                    category: product.category,
                    stock: product.stock !== undefined ? product.stock : 50,
                    stockBadge: product.stock === 0 ? 'Out of Stock' : (product.stock < 10 ? 'Low Stock' : 'In Stock'),
                    stockBadgeClass: product.stock === 0 ? 'bg-red-100 text-red-700 border-red-200' : (product.stock < 10 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'),
                    featured: product.featured || false,
                    isCustom: product.isCustom || false
                }));
            }

            const ordersResponse = await ShirtifyAPI.getAllOrders();
            if (ordersResponse.success) {
                // Map orders to the format expected by the dashboard
                this.orders = (ordersResponse.data || []).map(order => {
                    const customerName = order.customer ? (typeof order.customer === 'string' ? order.customer : (order.customer.name || "Customer")) :
                        (order.shippingAddress ? order.shippingAddress.fullName : "Guest");

                    const location = order.customer && order.customer.city ? order.customer.city :
                        (order.shippingAddress ? order.shippingAddress.city : "Unknown");

                    const itemsSummary = Array.isArray(order.items) ?
                        `${order.items.length} item${order.items.length !== 1 ? 's' : ''} (${order.items.map(i => i.name || (i.product ? i.product.name : 'Product')).join(', ')})` :
                        (order.items || "No items");

                    const statusBadgeClass = {
                        'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
                        'Processing': 'bg-blue-100 text-blue-700 border-blue-200',
                        'Shipped': 'bg-purple-100 text-purple-700 border-purple-200',
                        'Delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        'Cancelled': 'bg-red-100 text-red-700 border-red-200',
                        'pending': 'bg-amber-100 text-amber-700 border-amber-200',
                        'processing': 'bg-blue-100 text-blue-700 border-blue-200',
                        'shipped': 'bg-purple-100 text-purple-700 border-purple-200',
                        'delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    };

                    const paymentBadgeClass = {
                        'cash-on-delivery': 'bg-gray-100 text-gray-700 border-gray-200',
                        'jazzcash': 'bg-red-100 text-red-700 border-red-200',
                        'easypaisa': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        'bank-transfer': 'bg-blue-100 text-blue-700 border-blue-200',
                        'card': 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    };

                    const status = order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Pending';

                    return {
                        id: order.orderNumber || order._id.toString().slice(-8).toUpperCase(),
                        realId: order._id,
                        customer: customerName,
                        location: location,
                        items: itemsSummary.length > 35 ? itemsSummary.substring(0, 32) + '...' : itemsSummary,
                        amount: order.totalAmount || order.totalPrice || 0,
                        payment: order.paymentMethod || 'COD',
                        paymentBadge: paymentBadgeClass[order.paymentMethod] || 'bg-gray-100 text-gray-700 border-gray-200',
                        status: status,
                        statusBadge: statusBadgeClass[order.status] || 'bg-gray-100 text-gray-700 border-gray-200',
                        orderDate: order.createdAt
                    };
                });
            }

            // Load users
            const usersResponse = await ShirtifyAPI.getAllUsers();
            if (usersResponse.success) {
                this.users = (usersResponse.data || []).map(user => ({
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role || 'User',
                    status: 'Active',
                    lastActive: 'Online'
                }));
            }

            // Load analytics
            const analyticsResponse = await ShirtifyAPI.getAnalytics();
            if (analyticsResponse.success && analyticsResponse.data) {
                const { timeline, products } = analyticsResponse.data;

                if (timeline && timeline.length > 0) {
                    this.analyticsData.dates = timeline.map(item => item.date);
                    this.analyticsData.units = timeline.map(item => item.units);
                    this.analyticsData.revenue = timeline.map(item => item.revenue);
                }

                if (products) {
                    this.analyticsData.products = products;
                }
            }

            this.currentUser = ShirtifyAPI.currentUser;
        } catch (error) {
            console.error('Error initializing data:', error);
        }
    },

    // Authentication
    async authenticateUser(email, password) {
        const result = await ShirtifyAPI.login(email, password);
        if (result.success) {
            this.currentUser = result.data;
            return { success: true, user: result.data };
        }
        return { success: false, message: result.error };
    },

    logoutUser() {
        ShirtifyAPI.logout();
        this.currentUser = null;
    },

    isAuthenticated() {
        return ShirtifyAPI.isAuthenticated();
    },

    getCurrentUser() {
        return ShirtifyAPI.currentUser;
    },

    // Product management
    async addProduct(product) {
        const result = await ShirtifyAPI.createProduct(product);
        if (result.success) {
            this.products.push(result.data);
        }
        return result.data;
    },

    async updateProduct(productId, updates) {
        const result = await ShirtifyAPI.updateProduct(productId, updates);
        if (result.success) {
            const index = this.products.findIndex(p => p._id === productId);
            if (index !== -1) {
                this.products[index] = result.data;
            }
        }
        return result.data;
    },

    async deleteProduct(productId) {
        const result = await ShirtifyAPI.deleteProduct(productId);
        if (result.success) {
            this.products = this.products.filter(p => p._id !== productId);
        }
        return result.success;
    },

    // Order management
    async addOrder(order) {
        const result = await ShirtifyAPI.createOrder(order);
        if (result.success) {
            this.orders.push(result.data);
        }
        return result.data;
    },

    async updateOrderStatus(orderId, newStatus) {
        const result = await ShirtifyAPI.updateOrder(orderId, { status: newStatus });
        if (result.success) {
            const index = this.orders.findIndex(o => o._id === orderId);
            if (index !== -1) {
                this.orders[index] = result.data;
            }
        }
        return result.data;
    },

    // Analytics
    async getKPIs() {
        const statsResponse = await ShirtifyAPI.getProductStats();
        const orderStatsResponse = await ShirtifyAPI.getOrderStats();

        if (statsResponse.success && orderStatsResponse.success) {
            return {
                totalProducts: statsResponse.data.totalProducts,
                totalOrders: orderStatsResponse.data.totalOrders,
                totalSales: orderStatsResponse.data.totalRevenue,
                totalCustomers: this.orders.length, // Simplified
            };
        }

        return {
            totalProducts: this.products.length,
            totalOrders: this.orders.length,
            totalSales: 0,
            totalCustomers: 0,
        };
    },

    getFilteredProducts(filters = {}) {
        // Client-side filtering for now
        let filtered = [...this.products];

        if (filters.color) {
            filtered = filtered.filter(p => p.colors && p.colors.includes(filters.color));
        }

        if (filters.size) {
            filtered = filtered.filter(p => p.sizes && p.sizes.includes(filters.size));
        }

        if (filters.minPrice) {
            filtered = filtered.filter(p => p.price >= filters.minPrice);
        }

        if (filters.maxPrice) {
            filtered = filtered.filter(p => p.price <= filters.maxPrice);
        }

        if (filters.category) {
            filtered = filtered.filter(p => p.category === filters.category);
        }

        return filtered;
    },
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShirtifyAPI, ShirtifyStore };
}
