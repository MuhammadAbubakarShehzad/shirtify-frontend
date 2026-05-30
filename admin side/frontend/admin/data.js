// Shared Data Store for Shirtify Admin Dashboard
// This file contains all shared business data and management functions
// Used across all screens: dashboard, products, predictions

const ShirtifyData = {
    // Core business data
    products: [],
    orders: [],
    userLogs: [],
    mockShirts: [],
    feedbacks: [],
    salesData: {},
    analytics: {},

    // User authentication data
    currentUser: null,
    users: [
        {
            id: 'user_001',
            email: 'admin@shirtify.pk',
            password: 'admin123',
            name: 'Admin Balaj',
            role: 'admin',
            lastLogin: null,
            isActive: true
        },
        {
            id: 'user_002',
            email: 'abubakar.shahzad@shirtify.pk',
            password: 'abubakar123',
            name: 'Abubakar Shahzad',
            role: 'manager',
            lastLogin: null,
            isActive: true
        },
        {
            id: 'user_003',
            email: 'adeen@shirtify.pk',
            password: 'adeen123',
            name: 'Adeen Siddique',
            role: 'editor',
            lastLogin: null,
            isActive: true
        }
    ],

    // Default data templates
    defaultProducts: [
        {
            id: 'prod_001',
            name: 'Urban Streetwear Graphic Tee',
            designName: 'Urban Streetwear Graphic Tee',
            printType: 'DTF',
            baseColor: 'Black',
            sizes: ['S', 'M', 'L', 'XL', 'XXL'],
            price: 2450,
            stockStatus: 'In Stock',
            stockBadge: 'In Stock',
            stockBadgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop',
            category: 'Graphic',
            description: 'Bold urban graphic design perfect for streetwear fashion. High-quality DTF print on premium cotton.',
            featured: true,
            createdAt: '2024-01-15T10:30:00Z'
        },
        {
            id: 'prod_002',
            name: 'Vintage Logo Hoodie',
            designName: 'Vintage Logo Hoodie',
            printType: 'Screen Print',
            baseColor: 'Navy',
            sizes: ['M', 'L', 'XL'],
            price: 4200,
            stockStatus: 'In Stock',
            stockBadge: 'In Stock',
            stockBadgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=100&h=100&fit=crop',
            category: 'Hoodie',
            description: 'Classic vintage logo design on premium cotton-poly blend hoodie. Perfect for casual wear.',
            featured: true,
            createdAt: '2024-01-18T11:20:00Z'
        },
        {
            id: 'prod_003',
            name: 'Minimalist White Tee',
            designName: 'Minimalist White Tee',
            printType: 'DTF',
            baseColor: 'White',
            sizes: ['S', 'M', 'L', 'XL'],
            price: 1800,
            stockStatus: 'Made to Order',
            stockBadge: 'Made to Order',
            stockBadgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
            image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=100&h=100&fit=crop',
            category: 'Basic',
            description: 'Clean minimalist design on high-quality white cotton tee. Versatile and timeless.',
            featured: false,
            createdAt: '2024-01-20T14:15:00Z'
        },
        {
            id: 'prod_004',
            name: 'Retro Sports Jersey',
            designName: 'Retro Sports Jersey',
            printType: 'Sublimation',
            baseColor: 'Green',
            sizes: ['M', 'L', 'XL'],
            price: 3800,
            stockStatus: 'Low Stock',
            stockBadge: 'Low Stock',
            stockBadgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
            image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=100&h=100&fit=crop',
            category: 'Sports',
            description: 'Retro-inspired sports jersey design with vibrant colors. Perfect for athletic wear.',
            featured: false,
            createdAt: '2024-01-22T16:45:00Z'
        },
        {
            id: 'prod_005',
            name: 'Abstract Art Print Tee',
            designName: 'Abstract Art Print Tee',
            printType: 'DTF',
            baseColor: 'Black',
            sizes: ['S', 'M', 'L', 'XL'],
            price: 2200,
            stockStatus: 'In Stock',
            stockBadge: 'In Stock',
            stockBadgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=100&h=100&fit=crop',
            category: 'Art',
            description: 'Unique abstract art print on premium cotton tee. Limited edition design.',
            featured: true,
            createdAt: '2024-01-25T09:45:00Z'
        },
        {
            id: 'prod_006',
            name: 'Classic Polo Shirt',
            designName: 'Classic Polo Shirt',
            printType: 'Embroidery',
            baseColor: 'White',
            sizes: ['M', 'L', 'XL'],
            price: 2900,
            stockStatus: 'In Stock',
            stockBadge: 'In Stock',
            stockBadgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=100&h=100&fit=crop',
            category: 'Formal',
            description: 'Classic embroidered polo shirt design. Perfect for semi-formal occasions.',
            featured: false,
            createdAt: '2024-01-28T13:30:00Z'
        }
    ],

    defaultOrders: [
        {
            id: 'ORD-7782',
            customer: 'Ahmed Raza',
            location: 'Lahore',
            items: '2x Urban Streetwear Graphic Tee (Black, L)',
            amount: 4900,
            payment: 'Paid (JazzCash)',
            paymentBadge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            status: 'Shipped',
            statusBadge: 'bg-purple-100 text-purple-700 border-purple-200',
            phone: '+923001234567',
            orderDate: '2024-11-29T10:30:00Z',
            items_detail: [
                { product_id: 'prod_001', quantity: 2, size: 'L', color: 'Black' }
            ]
        },
        {
            id: 'ORD-7781',
            customer: 'Fatima Sheikh',
            location: 'Karachi',
            items: '1x Vintage Logo Hoodie (Navy, M)',
            amount: 4200,
            payment: 'Paid (Bank Transfer)',
            paymentBadge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            status: 'Delivered',
            statusBadge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            phone: '+923007654321',
            orderDate: '2024-11-28T15:20:00Z',
            items_detail: [
                { product_id: 'prod_002', quantity: 1, size: 'M', color: 'Navy' }
            ]
        },
        {
            id: 'ORD-7780',
            customer: 'Hassan Ali',
            location: 'Islamabad',
            items: '1x Minimalist White Tee (M)',
            amount: 1800,
            payment: 'Pending (COD)',
            paymentBadge: 'bg-amber-100 text-amber-700 border-amber-200',
            status: 'Processing',
            statusBadge: 'bg-blue-100 text-blue-700 border-blue-200',
            phone: '+923009876543',
            orderDate: '2024-11-27T12:10:00Z',
            items_detail: [
                { product_id: 'prod_003', quantity: 1, size: 'M', color: 'White' }
            ]
        },
        {
            id: 'ORD-7779',
            customer: 'Zara Khan',
            location: 'Rawalpindi',
            items: '1x Retro Sports Jersey (L) + 1x Abstract Art Print Tee (M)',
            amount: 6000,
            payment: 'Paid (Easypaisa)',
            paymentBadge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            status: 'Shipped',
            statusBadge: 'bg-purple-100 text-purple-700 border-purple-200',
            phone: '+923005556667',
            orderDate: '2024-11-26T09:45:00Z',
            items_detail: [
                { product_id: 'prod_004', quantity: 1, size: 'L', color: 'Green' },
                { product_id: 'prod_005', quantity: 1, size: 'M', color: 'Black' }
            ]
        },
        {
            id: 'ORD-7778',
            customer: 'Omar Farooq',
            location: 'Faisalabad',
            items: '2x Classic Polo Shirt (XL)',
            amount: 5800,
            payment: 'Pending (COD)',
            paymentBadge: 'bg-amber-100 text-amber-700 border-amber-200',
            status: 'Pending',
            statusBadge: 'bg-amber-100 text-amber-700 border-amber-200',
            phone: '+923014447778',
            orderDate: '2024-11-25T14:30:00Z',
            items_detail: [
                { product_id: 'prod_006', quantity: 2, size: 'XL', color: 'White' }
            ]
        },
        {
            id: 'ORD-7777',
            customer: 'Ayesha Malik',
            location: 'Multan',
            items: '1x Urban Streetwear Graphic Tee (S) + 1x Vintage Logo Hoodie (S)',
            amount: 6650,
            payment: 'Paid (Credit Card)',
            paymentBadge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            status: 'Delivered',
            statusBadge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            phone: '+923022334455',
            orderDate: '2024-11-24T11:15:00Z',
            items_detail: [
                { product_id: 'prod_001', quantity: 1, size: 'S', color: 'Black' },
                { product_id: 'prod_002', quantity: 1, size: 'S', color: 'Navy' }
            ]
        }
    ],

    // Analytics and forecasting data
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
            { name: 'Casual Round Neck', category: 'Casual', size: 'XL', color: 'Gray', units: 650, revenue: 1625000, price: 2500, trend: '+10%' },
            { name: 'Sports Slim Fit', category: 'Sports', size: 'M', color: 'Red', units: 620, revenue: 1860000, price: 3000, trend: '+25%' },
            { name: 'Graphic Print Retro', category: 'Graphic', size: 'L', color: 'Black', units: 580, revenue: 1740000, price: 3000, trend: '+20%' },
            { name: 'Casual V-Neck', category: 'Casual', size: 'S', color: 'White', units: 540, revenue: 1350000, price: 2500, trend: '+5%' },
            { name: 'Formal Button Down', category: 'Formal', size: 'L', color: 'White', units: 480, revenue: 1680000, price: 3500, trend: '+7%' },
            { name: 'Sports Compression', category: 'Sports', size: 'M', color: 'Black', units: 450, revenue: 1350000, price: 3000, trend: '+30%' },
            { name: 'Casual Henley', category: 'Casual', size: 'M', color: 'Olive', units: 420, revenue: 1260000, price: 3000, trend: '+13%' },
            { name: 'Graphic Print Abstract', category: 'Graphic', size: 'XL', color: 'Yellow', units: 380, revenue: 1140000, price: 3000, trend: '+16%' },
            { name: 'Casual Pocket Tee', category: 'Casual', size: 'L', color: 'Maroon', units: 350, revenue: 875000, price: 2500, trend: '+9%' },
            { name: 'Formal Classic', category: 'Formal', size: 'M', color: 'Black', units: 320, revenue: 1120000, price: 3500, trend: '+6%' }
        ]
    },

    // UI configuration
    colorMap: {
        'Black': { bg: '#1f2937', name: 'Black' },
        'White': { bg: '#ffffff', name: 'White', border: '#e5e7eb' },
        'Olive': { bg: '#6b7280', name: 'Olive' },
        'Green': { bg: '#10b981', name: 'Green' },
        'Blue': { bg: '#3b82f6', name: 'Blue' },
        'Red': { bg: '#ef4444', name: 'Red' },
        'Gray': { bg: '#6b7280', name: 'Gray' },
        'Navy': { bg: '#1e40af', name: 'Navy' },
        'Multi': { bg: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)', name: 'Multi' },
        'Yellow': { bg: '#eab308', name: 'Yellow' },
        'Maroon': { bg: '#dc2626', name: 'Maroon' }
    },

    statusColors: {
        'pending': 'bg-amber-100 text-amber-700 border-amber-200',
        'confirmed': 'bg-blue-100 text-blue-700 border-blue-200',
        'processing': 'bg-blue-100 text-blue-700 border-blue-200',
        'shipped': 'bg-purple-100 text-purple-700 border-purple-200',
        'delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'cancelled': 'bg-red-100 text-red-700 border-red-200'
    },

    // Event system for real-time updates
    eventListeners: {},

    // Notification system
    notifications: [],

    // Activity feed data
    recentActivity: [
        {
            id: 'act_001',
            type: 'order',
            title: 'New order #ORD-7783 received',
            description: 'Customer: Ahmed Raza (Karachi) • Amount: Rs 3,500',
            time: '2 minutes ago',
            icon: 'shopping-bag',
            iconColor: 'emerald'
        },
        {
            id: 'act_002',
            type: 'product',
            title: 'Product "Urban Streetwear Graphic" updated',
            description: 'Stock replenished • New sizes added (XXL)',
            time: '15 minutes ago',
            icon: 'package',
            iconColor: 'blue'
        },
        {
            id: 'act_003',
            type: 'customer',
            title: 'New customer registered',
            description: 'Fatima Sheikh • Lahore • WhatsApp: +92 300 1234567',
            time: '1 hour ago',
            icon: 'user-plus',
            iconColor: 'amber'
        },
        {
            id: 'act_004',
            type: 'sales',
            title: 'Weekly sales report generated',
            description: 'Total: Rs 1,24,500 • Top seller: Heavy Tee (Black)',
            time: '2 hours ago',
            icon: 'trending-up',
            iconColor: 'purple'
        },
        {
            id: 'act_005',
            type: 'alert',
            title: 'Low stock alert',
            description: 'Premium Blank Tee (Olive, M) - Only 3 units remaining',
            time: '3 hours ago',
            icon: 'alert-circle',
            iconColor: 'red'
        }
    ],

    // Authentication functions
    async authenticateUser(email, password) {
        try {
            const normalizedEmail = String(email || '').trim().toLowerCase();
            const normalizedPassword = String(password || '');

            // Prefer the real backend auth flow so the dashboard receives a JWT
            // and can read live data from MongoDB.
            try {
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword })
                });

                const data = await response.json();

                if (response.ok && data && data.token) {
                    const allowedRoles = ['admin', 'manager', 'editor'];
                    if (!allowedRoles.includes(String(data.role || '').toLowerCase())) {
                        return { success: false, message: 'Access denied. Admin privileges required.' };
                    }

                    this.currentUser = {
                        id: data.id || data._id,
                        email: data.email,
                        name: data.name,
                        role: data.role,
                        lastLogin: new Date().toISOString()
                    };

                    localStorage.setItem('shirtify_token', data.token);
                    localStorage.setItem('shirtify_user', JSON.stringify(this.currentUser));
                    localStorage.removeItem('shirtify_demo_mode');
                    this.saveToStorage();
                    this.addActivity('auth', `User ${data.name} logged in`, `Role: ${data.role}`, 'log-in', 'blue');
                    return { success: true, user: this.currentUser };
                }

                // If the backend is reachable but credentials are rejected, stop here.
                if (response.status === 401 || response.status === 400) {
                    return { success: false, message: data.message || 'Invalid email or password' };
                }
            } catch (backendError) {
                console.warn('Backend login unavailable, trying local fallback:', backendError);
            }

            // Local fallback for demo/offline use.
            const demoUser = this.users.find((u) =>
                String(u.email || '').trim().toLowerCase() === normalizedEmail &&
                String(u.password || '') === normalizedPassword
            );
            if (demoUser && ['admin', 'manager', 'editor'].includes(demoUser.role)) {
                this.currentUser = {
                    id: demoUser.id,
                    email: demoUser.email,
                    name: demoUser.name,
                    role: demoUser.role,
                    lastLogin: new Date().toISOString()
                };
                localStorage.removeItem('shirtify_token');
                this.saveToStorage();
                this.addActivity('auth', `User ${demoUser.name} logged in`, `Role: ${demoUser.role}`, 'log-in', 'blue');
                return { success: true, user: this.currentUser };
            }

            return { success: false, message: 'Invalid email or password' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed' };
        }
    },

    logoutUser() {
        if (this.currentUser) {
            this.addActivity('auth', `User ${this.currentUser.name} logged out`, '', 'log-out', 'gray');
            this.currentUser = null;
            this.saveToStorage();
        }
    },

    isAuthenticated() {
        return this.currentUser !== null;
    },

    getCurrentUser() {
        return this.currentUser;
    },

    // Data management functions
    async init() {
        this.loadFromStorage();
        if (this.products.length === 0) {
            this.products = [...this.defaultProducts];
        }
        if (this.orders.length === 0) {
            this.orders = [...this.defaultOrders];
        }

        // Fetch real users for the logs timeline
        try {
            await this.fetchUsersFromAPI();
        } catch (error) {
            console.warn('Could not fetch users from API, using local user logs:', error);
            this.userLogs = this.users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.lastLogin || new Date().toISOString()
            }));
        }
        
        // Fetch real products from backend API
        try {
            await this.fetchProductsFromAPI();
        } catch (error) {
            console.warn('Could not fetch products from API, using default products:', error);
        }

        // Fetch real orders from backend API
        try {
            await this.fetchOrdersFromAPI();
        } catch (error) {
            console.warn('Could not fetch orders from API, using default orders:', error);
        }

        // Fetch mock shirts for management
        try {
            await this.fetchMockShirtsFromAPI();
        } catch (error) {
            console.warn('Could not fetch mock shirts from API:', error);
        }

        // Fetch feedback entries for review
        try {
            await this.fetchFeedbackFromAPI();
        } catch (error) {
            console.warn('Could not fetch feedback from API:', error);
        }
        
        // Dynamic stats update
        this.updateKPIs();

        // Run data consistency checks
        this.ensureDataConsistency();

        // Check for data integrity issues
        const integrityCheck = this.checkDataIntegrity();
        if (integrityCheck.hasIssues) {
            console.warn('Data integrity issues found:', integrityCheck.issues);
        }

        this.saveToStorage();
        return this;
    },

    async fetchUsersFromAPI() {
        try {
            if (typeof ShirtifyAPI !== 'undefined') {
                ShirtifyAPI.init();
                const response = await ShirtifyAPI.getAllUsers();
                const apiUsers = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];

                this.userLogs = apiUsers.map(user => ({
                    id: user._id || user.id || 'user_' + Math.random().toString(36).substr(2, 9),
                    name: user.name || 'Unknown User',
                    email: user.email || '',
                    role: user.role || 'user',
                    createdAt: user.createdAt || new Date().toISOString()
                }));

                console.log('Loaded ' + this.userLogs.length + ' users from API');
            }
        } catch (error) {
            console.error('Error in fetchUsersFromAPI:', error);
            throw error;
        }
    },

    async fetchProductsFromAPI() {
        try {
            if (typeof ShirtifyAPI !== 'undefined') {
                ShirtifyAPI.init();
                const response = await ShirtifyAPI.getAllProducts();

                const apiProducts = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];

                this.products = apiProducts.map(product => this.normalizeProduct(product));
                this.analyticsData.totalProducts = this.products.length;
                console.log('Loaded ' + this.products.length + ' products from API');
            }
        } catch (error) {
            console.error('Error in fetchProductsFromAPI:', error);
            throw error;
        }
    },

    normalizeProduct(product) {
        const sizeValue = product.size || product.sizes || '';
        const normalizedSizes = Array.isArray(sizeValue)
            ? sizeValue
            : String(sizeValue || '')
                .split(',')
                .map(size => size.trim())
                .filter(Boolean);

        const stock = product.stock !== undefined ? product.stock : 0;
        
        // Determine stock status based on stock quantity
        let stockBadge, stockBadgeClass;
        if (stock === 0) {
            stockBadge = 'Out of Stock';
            stockBadgeClass = 'bg-red-100 text-red-700 border-red-200';
        } else if (stock < 5) {
            stockBadge = 'Low Stock';
            stockBadgeClass = 'bg-amber-100 text-amber-700 border-amber-200';
        } else {
            stockBadge = 'In Stock';
            stockBadgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        }

        return {
            id: product._id || product.id || 'prod_' + Math.random().toString(36).substr(2, 9),
            _id: product._id || product.id,
            name: product.name || product.title || 'Unnamed Product',
            designName: product.name || product.title || 'Unnamed Product',
            description: product.description || '',
            price: Number(product.price || 0),
            image: product.image || product.imageUrl || '',
            category: product.category || 'General',
            baseColor: product.baseColor || product.colour || '',
            sizes: normalizedSizes,
            stock: stock,
            stockStatus: stockBadge,
            stockBadge: stockBadge,
            stockBadgeClass: stockBadgeClass,
            featured: Boolean(product.featured),
            isCustom: Boolean(product.isCustom),
            createdAt: product.createdAt || new Date().toISOString()
        };
    },

    async fetchOrdersFromAPI() {
        try {
            // Initialize ShirtifyAPI if needed
            if (typeof ShirtifyAPI !== 'undefined') {
                ShirtifyAPI.init();
                const response = await ShirtifyAPI.getAllOrdersAdmin();
                
                const apiOrders = Array.isArray(response.orders)
                    ? response.orders
                    : Array.isArray(response?.data?.orders)
                        ? response.data.orders
                        : Array.isArray(response?.data)
                            ? response.data
                            : [];

                // Transform API response to match our data structure
                this.orders = apiOrders.map(order => ({
                    id: order._id || 'ORD-' + Math.random().toString(36).substr(2, 9),
                    orderDate: order.createdAt || new Date().toISOString(),
                    customer: order.user?.email || 'Unknown',
                    customerName: order.user?.name || 'Unknown',
                    items: order.items || [],
                    amount: order.total || 0,
                    status: order.status || 'pending',
                    paymentMethod: order.paymentMethod || 'cod',
                    shippingAddress: order.shippingAddress || ''
                }));
                this.analyticsData.totalOrders = this.orders.length;
                console.log('Loaded ' + this.orders.length + ' orders from API');
            }
        } catch (error) {
            console.error('Error in fetchOrdersFromAPI:', error);
            throw error;
        }
    },

    async fetchMockShirtsFromAPI() {
        try {
            if (typeof ShirtifyAPI !== 'undefined') {
                ShirtifyAPI.init();
                const response = await ShirtifyAPI.getAllMockShirts();
                const apiMockShirts = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];

                this.mockShirts = apiMockShirts.map(shirt => ({
                    id: shirt._id || shirt.id || 'mock_' + Math.random().toString(36).substr(2, 9),
                    name: shirt.name || 'Untitled Mock Shirt',
                    type: shirt.type || 'Custom',
                    price: Number(shirt.price || 0),
                    imageUrl: shirt.imageUrl || '',
                    images: Array.isArray(shirt.images)
                        ? shirt.images
                        : String(shirt.images || '')
                            .split(',')
                            .map(image => image.trim())
                            .filter(Boolean),
                    createdAt: shirt.createdAt || new Date().toISOString(),
                    updatedAt: shirt.updatedAt || shirt.createdAt || new Date().toISOString()
                }));

                console.log('Loaded ' + this.mockShirts.length + ' mock shirts from API');
            }
        } catch (error) {
            console.error('Error in fetchMockShirtsFromAPI:', error);
            throw error;
        }
    },

    async fetchFeedbackFromAPI() {
        try {
            if (typeof ShirtifyAPI !== 'undefined') {
                ShirtifyAPI.init();
                const response = await ShirtifyAPI.getAllFeedback();
                const apiFeedback = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];

                this.feedbacks = apiFeedback.map(feedback => ({
                    id: feedback._id || feedback.id || 'fb_' + Math.random().toString(36).substr(2, 9),
                    name: feedback.name || feedback.user?.name || 'Anonymous',
                    email: feedback.email || feedback.user?.email || '',
                    rating: feedback.rating || 0,
                    message: feedback.message || '',
                    createdAt: feedback.createdAt || new Date().toISOString()
                }));

                console.log('Loaded ' + this.feedbacks.length + ' feedback entries from API');
            }
        } catch (error) {
            console.error('Error in fetchFeedbackFromAPI:', error);
            throw error;
        }
    },

    updateKPIs() {
        // Simplified dynamic KPI calculator
        this.analyticsData.totalProducts = this.products.length;
        this.analyticsData.totalOrders = this.orders.length;
    },

    async addMockShirt(mockShirt) {
        const normalizedImages = Array.isArray(mockShirt.images)
            ? mockShirt.images
            : String(mockShirt.images || '')
                .split(',')
                .map(image => image.trim())
                .filter(Boolean);

        const payload = {
            name: mockShirt.name || mockShirt.title || 'Untitled Mock Shirt',
            type: mockShirt.type || 'Custom',
            price: Number(mockShirt.price || 0),
            imageUrl: mockShirt.imageUrl || mockShirt.image || '',
            images: normalizedImages
        };

        let newMockShirt;
        if (typeof ShirtifyAPI !== 'undefined') {
            ShirtifyAPI.init();
            const result = await ShirtifyAPI.createMockShirt(payload);
            if (result && result.success === false) {
                throw new Error(result.error || 'Failed to create mock shirt');
            }
            newMockShirt = {
                id: result._id || result.id || 'mock_' + Date.now(),
                name: result.name || payload.name,
                type: result.type || payload.type,
                price: Number(result.price || payload.price),
                imageUrl: result.imageUrl || payload.imageUrl,
                images: Array.isArray(result.images) ? result.images : payload.images,
                createdAt: result.createdAt || new Date().toISOString(),
                updatedAt: result.updatedAt || result.createdAt || new Date().toISOString()
            };
        } else {
            newMockShirt = { id: 'mock_' + Date.now(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        }

        this.mockShirts.unshift(newMockShirt);
        this.saveToStorage();
        this.emit('dataChanged', { type: 'mockShirt', action: 'add', data: newMockShirt });
        return newMockShirt;
    },

    async deleteMockShirt(mockShirtId) {
        const index = this.mockShirts.findIndex(shirt => shirt.id === mockShirtId || shirt._id === mockShirtId);
        if (index === -1) return false;

        const deleted = this.mockShirts[index];
        if (typeof ShirtifyAPI !== 'undefined') {
            ShirtifyAPI.init();
            const result = await ShirtifyAPI.deleteMockShirt(mockShirtId);
            if (result && result.success === false) {
                throw new Error(result.error || 'Failed to delete mock shirt');
            }
        }

        this.mockShirts.splice(index, 1);
        this.saveToStorage();
        this.emit('dataChanged', { type: 'mockShirt', action: 'delete', data: deleted });
        return true;
    },

    loadFromStorage() {
        try {
            const productsData = localStorage.getItem('shirtify_products');
            const ordersData = localStorage.getItem('shirtify_orders');
            const mockShirtsData = localStorage.getItem('shirtify_mockshirts');
            const feedbackData = localStorage.getItem('shirtify_feedbacks');
            const activityData = localStorage.getItem('shirtify_activity');
            const analyticsData = localStorage.getItem('shirtify_analytics');
            const currentUserData = localStorage.getItem('shirtify_current_user');
            const legacyUserData = localStorage.getItem('shirtify_user');

            if (productsData) this.products = JSON.parse(productsData);
            if (ordersData) this.orders = JSON.parse(ordersData);
            if (mockShirtsData) this.mockShirts = JSON.parse(mockShirtsData);
            if (feedbackData) this.feedbacks = JSON.parse(feedbackData);
            if (activityData) this.recentActivity = JSON.parse(activityData);
            if (analyticsData) this.analyticsData = { ...this.analyticsData, ...JSON.parse(analyticsData) };
            if (currentUserData) {
                this.currentUser = JSON.parse(currentUserData);
            } else if (legacyUserData) {
                // Compatibility: older/demo login flow stored session in `shirtify_user`.
                const legacyUser = JSON.parse(legacyUserData);
                this.currentUser = {
                    id: legacyUser.id || legacyUser._id || `usr_${Date.now()}`,
                    email: legacyUser.email || '',
                    name: legacyUser.name || 'Admin User',
                    role: legacyUser.role || 'admin',
                    lastLogin: legacyUser.lastLogin || new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('Error loading data from storage:', error);
        }
    },

    saveToStorage() {
        try {
            localStorage.setItem('shirtify_products', JSON.stringify(this.products));
            localStorage.setItem('shirtify_orders', JSON.stringify(this.orders));
            localStorage.setItem('shirtify_mockshirts', JSON.stringify(this.mockShirts));
            localStorage.setItem('shirtify_feedbacks', JSON.stringify(this.feedbacks));
            localStorage.setItem('shirtify_activity', JSON.stringify(this.recentActivity));
            localStorage.setItem('shirtify_analytics', JSON.stringify(this.analyticsData));
            if (this.currentUser) {
                localStorage.setItem('shirtify_current_user', JSON.stringify(this.currentUser));
            } else {
                localStorage.removeItem('shirtify_current_user');
            }
        } catch (error) {
            console.error('Error saving data to storage:', error);
        }
    },

    // Product management functions
    async addProduct(product) {
        const validation = this.validateProduct(product);
        if (!validation.isValid) {
            throw new Error('Invalid product data: ' + validation.errors.join(', '));
        }

        const payload = {
            title: product.name || product.title || 'Unnamed Product',
            description: product.description || '',
            category: product.category || 'shirt',
            price: Number(product.price || 0),
            imageUrl: product.image || product.imageUrl || '',
            stock: product.stock !== undefined ? Number(product.stock) : 0,
            size: Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.size || ''),
            colour: product.baseColor || product.colour || '',
            featured: Boolean(product.featured)
        };

        let newProduct;
        if (typeof ShirtifyAPI !== 'undefined') {
            ShirtifyAPI.init();
            const result = await ShirtifyAPI.createProduct(payload);
            if (result && result.success === false) {
                throw new Error(result.error || 'Failed to create product');
            }
            newProduct = this.normalizeProduct(result);
        } else {
            newProduct = this.normalizeProduct({ ...payload, id: 'prod_' + Date.now(), createdAt: new Date().toISOString() });
        }

        this.products.push(newProduct);
        this.saveToStorage();
        this.addActivity('product', `New product "${newProduct.name}" added`, `Price: Rs ${newProduct.price} • Category: ${newProduct.category || 'General'}`, 'plus');
        this.emit('productAdded', newProduct);
        this.emit('dataChanged', { type: 'product', action: 'add', data: newProduct });
        return newProduct;
    },

    async updateProduct(productId, updates) {
        const index = this.products.findIndex(p => p.id === productId || p._id === productId);
        if (index !== -1) {
            const payload = {
                title: updates.name || updates.title || this.products[index].name,
                description: updates.description || this.products[index].description || '',
                category: updates.category || this.products[index].category || 'shirt',
                price: Number(updates.price || this.products[index].price || 0),
                imageUrl: updates.image || updates.imageUrl || this.products[index].image || '',
                stock: updates.stock !== undefined ? Number(updates.stock) : this.products[index].stock || 0,
                size: Array.isArray(updates.sizes) ? updates.sizes.join(', ') : (updates.size || (this.products[index].sizes || []).join(', ')),
                colour: updates.baseColor || updates.colour || this.products[index].baseColor || '',
                featured: updates.featured !== undefined ? Boolean(updates.featured) : Boolean(this.products[index].featured)
            };

            let updatedProduct;
            if (typeof ShirtifyAPI !== 'undefined') {
                ShirtifyAPI.init();
                const result = await ShirtifyAPI.updateProduct(productId, payload);
                if (result && result.success === false) {
                    throw new Error(result.error || 'Failed to update product');
                }
                updatedProduct = this.normalizeProduct(result);
            } else {
                updatedProduct = this.normalizeProduct({ ...this.products[index], ...payload, _id: productId });
            }

            this.products[index] = updatedProduct;
            this.saveToStorage();
            this.addActivity('product', `Product "${updatedProduct.name}" updated`, 'Stock and details modified', 'edit');
            this.emit('productUpdated', updatedProduct);
            this.emit('dataChanged', { type: 'product', action: 'update', data: updatedProduct });
            return updatedProduct;
        }
        return null;
    },

    async deleteProduct(productId) {
        const index = this.products.findIndex(p => p.id === productId || p._id === productId);
        if (index !== -1) {
            const product = this.products[index];
            if (typeof ShirtifyAPI !== 'undefined') {
                ShirtifyAPI.init();
                const result = await ShirtifyAPI.deleteProduct(productId);
                if (result && result.success === false) {
                    throw new Error(result.error || 'Failed to delete product');
                }
            }
            this.products.splice(index, 1);
            this.saveToStorage();
            this.addActivity('product', `Product "${product.name}" deleted`, 'Removed from inventory', 'trash-2');
            this.emit('productDeleted', product);
            this.emit('dataChanged', { type: 'product', action: 'delete', data: product });
            return true;
        }
        return false;
    },

    // Order management functions
    addOrder(order) {
        const validation = this.validateOrder(order);
        if (!validation.isValid) {
            throw new Error('Invalid order data: ' + validation.errors.join(', '));
        }

        const newOrder = {
            id: 'ORD-' + (7783 + this.orders.length),
            orderDate: new Date().toISOString(),
            ...order
        };
        if (!Array.isArray(newOrder.items) && typeof newOrder.items === 'string') {
            newOrder.items = newOrder.items.trim();
        }

        if (!Array.isArray(newOrder.items)) {
            newOrder.items = [];
        }

        this.addActivity('order', `New order ${newOrder.id} received`, `Customer: ${order.customer} • Amount: Rs ${order.amount}`, 'shopping-bag');
        this.orders.push(newOrder);
        this.saveToStorage();
        this.emit('orderAdded', newOrder);
        this.emit('dataChanged', { type: 'order', action: 'add', data: newOrder });
        return newOrder;
    },

    updateOrderStatus(orderId, newStatus) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            const oldStatus = order.status;
            const normalizedStatus = String(newStatus || '').trim().toLowerCase();
            order.status = normalizedStatus;
            order.statusBadge = this.statusColors[normalizedStatus] || order.statusBadge;
            this.saveToStorage();
            this.addActivity('order', `Order ${orderId} status updated`, `Changed from ${oldStatus} to: ${normalizedStatus}`, 'refresh-cw');
            this.emit('orderUpdated', order);
            this.emit('dataChanged', { type: 'order', action: 'update', data: order, oldStatus: oldStatus });
            return order;
        }
        return null;
    },

    // Activity management
    addActivity(type, title, description, icon = 'activity', iconColor = 'blue') {
        const newActivity = {
            id: 'act_' + Date.now(),
            type: type,
            title: title,
            description: description,
            time: new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' }),
            icon: icon,
            iconColor: iconColor
        };

        this.recentActivity.unshift(newActivity);
        if (this.recentActivity.length > 10) {
            this.recentActivity = this.recentActivity.slice(0, 10);
        }

        // Update timestamps for existing activities
        this.updateActivityTimes();
        this.saveToStorage();
    },

    updateActivityTimes() {
        // This would be called periodically to update relative times
        // For now, we'll keep it simple
    },

    // Analytics functions
    getKPIs() {
        const totalProducts = this.products.length;
        const totalOrders = this.orders.length;
        const totalSales = this.orders.reduce((sum, order) => sum + order.amount, 0);
        const totalCustomers = Array.isArray(this.userLogs) && this.userLogs.length > 0
            ? this.userLogs.length
            : new Set(this.orders.map(order => order.customer)).size;

        // Calculate recent period metrics (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentOrders = this.orders.filter(order =>
            new Date(order.orderDate) >= thirtyDaysAgo
        );
        const recentSales = recentOrders.reduce((sum, order) => sum + order.amount, 0);
        const recentOrderCount = recentOrders.length;

        // Calculate growth percentages (simplified - comparing last 30 days to previous 30 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const previousOrders = this.orders.filter(order =>
            new Date(order.orderDate) >= sixtyDaysAgo && new Date(order.orderDate) < thirtyDaysAgo
        );
        const previousSales = previousOrders.reduce((sum, order) => sum + order.amount, 0);
        const previousOrderCount = previousOrders.length;

        const salesGrowth = previousSales > 0 ? ((recentSales - previousSales) / previousSales * 100) : 0;
        const ordersGrowth = previousOrderCount > 0 ? ((recentOrderCount - previousOrderCount) / previousOrderCount * 100) : 0;
        const customersGrowth = previousOrders.length > 0 ? ((recentOrders.length - previousOrders.length) / previousOrders.length * 100) : 0;

        return {
            totalSales: totalSales,
            totalOrders: totalOrders,
            totalProducts: totalProducts,
            totalCustomers: totalCustomers,
            recentSales: recentSales,
            recentOrders: recentOrderCount,
            salesGrowth: salesGrowth,
            ordersGrowth: ordersGrowth,
            customersGrowth: customersGrowth,
            avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
        };
    },

    getFilteredProducts(filters = {}) {
        let filtered = [...this.products];

        if (filters.color) {
            filtered = filtered.filter(p => p.baseColor === filters.color);
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

    // Export/Import functions
    exportData() {
        return {
            products: this.products,
            orders: this.orders,
            analytics: this.analyticsData,
            activity: this.recentActivity,
            exportedAt: new Date().toISOString()
        };
    },

    importData(data) {
        if (data.products) this.products = data.products;
        if (data.orders) this.orders = data.orders;
        if (data.analytics) this.analyticsData = { ...this.analyticsData, ...data.analytics };
        if (data.activity) this.recentActivity = data.activity;
        this.saveToStorage();
    },

    // Event system functions
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    },

    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    },

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    },

    // Notification system
    addNotification(message, type = 'info', duration = 5000) {
        const notification = {
            id: Date.now(),
            message: message,
            type: type,
            timestamp: new Date(),
            duration: duration
        };
        this.notifications.push(notification);
        this.emit('notification', notification);

        // Auto-remove notification after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, duration);
        }

        return notification;
    },

    removeNotification(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.emit('notificationRemoved', id);
    },

    getNotifications() {
        return this.notifications;
    },

    // Data validation and consistency layer
    validateProduct(product) {
        const errors = [];
        const productTitle = product.title || product.name || product.designName || '';
        const productImage = product.imageUrl || product.image || '';

        if (!productTitle || String(productTitle).trim().length === 0) {
            errors.push('Product name is required');
        }

        if (!product.price || product.price <= 0) {
            errors.push('Product price must be greater than 0');
        }

        if (product.price && product.price > 100000) {
            errors.push('Product price seems unreasonably high');
        }

        if (productImage && String(productImage).trim()) {
            try {
                new URL(productImage);
            } catch {
                errors.push('Image URL is not valid');
            }
        }

        if (product.sizes && !Array.isArray(product.sizes)) {
            errors.push('Sizes must be an array');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    validateOrder(order) {
        const errors = [];

        if (!order.customer || String(order.customer).trim().length === 0) {
            errors.push('Customer name is required');
        }

        if (!order.amount || order.amount <= 0) {
            errors.push('Order amount must be greater than 0');
        }

        if (!order.items || (Array.isArray(order.items) && order.items.length === 0)) {
            errors.push('Order items description is required');
        } else if (!Array.isArray(order.items) && String(order.items).trim().length === 0) {
            errors.push('Order items description is required');
        }

        const phoneValue = order.phone ? String(order.phone) : '';
        if (phoneValue && !/^(\+92|0)?[0-9]{10}$/.test(phoneValue.replace(/[^0-9+]/g, ''))) {
            errors.push('Phone number format is invalid');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    validateUser(user) {
        const errors = [];

        if (!user.email || !user.email.includes('@')) {
            errors.push('Valid email is required');
        }

        if (!user.password || user.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }

        if (!user.name || user.name.trim().length === 0) {
            errors.push('Name is required');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    // Data consistency checks
    ensureDataConsistency() {
        // Ensure all products have required fields
        this.products = this.products.filter(product => {
            const validation = this.validateProduct(product);
            if (!validation.isValid) {
                console.warn('Removing invalid product:', product.id, validation.errors);
                return false;
            }
            return true;
        });

        // Ensure all orders have required fields
        this.orders = this.orders.filter(order => {
            const validation = this.validateOrder(order);
            if (!validation.isValid) {
                console.warn('Removing invalid order:', order.id, validation.errors);
                return false;
            }
            return true;
        });

        // Ensure recent activity doesn't exceed limit
        if (this.recentActivity.length > 20) {
            this.recentActivity = this.recentActivity.slice(0, 20);
        }

        this.saveToStorage();
    },

    // Data integrity check
    checkDataIntegrity() {
        const issues = [];

        // Check for duplicate product IDs
        const productIds = this.products.map(p => p.id);
        const duplicateProductIds = productIds.filter((id, index) => productIds.indexOf(id) !== index);
        if (duplicateProductIds.length > 0) {
            issues.push(`Duplicate product IDs found: ${duplicateProductIds.join(', ')}`);
        }

        // Check for duplicate order IDs
        const orderIds = this.orders.map(o => o.id);
        const duplicateOrderIds = orderIds.filter((id, index) => orderIds.indexOf(id) !== index);
        if (duplicateOrderIds.length > 0) {
            issues.push(`Duplicate order IDs found: ${duplicateOrderIds.join(', ')}`);
        }

        // Check for products referenced in orders but not existing
        const allProductIds = new Set(this.products.map(p => p.id));
        for (const order of this.orders) {
            if (order.items_detail) {
                for (const item of order.items_detail) {
                    if (!allProductIds.has(item.product_id)) {
                        issues.push(`Order ${order.id} references non-existent product ${item.product_id}`);
                    }
                }
            }
        }

        return {
            hasIssues: issues.length > 0,
            issues: issues
        };
    }
};

// Initialize the data store when the script loads
if (typeof window !== 'undefined') {
    window.ShirtifyData = ShirtifyData;
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ShirtifyData.init());
    } else {
        ShirtifyData.init();
    }
}
