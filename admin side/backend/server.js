const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const { startJobs } = require('./jobs/retrainJob');

// Connect to database (Disable auto-connect in test mode)
if (process.env.NODE_ENV !== 'test') {
    connectDB();
    startJobs();
}

// Initialize Express app
const app = express();

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS
app.use(cors({
    origin: true,
    credentials: true,
}));

// ===== SERVE STATIC FILES =====

// 1. Serve Storefront (Root)
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. Serve Admin Panel (Sub-route)
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

// ===== API ROUTES =====

app.use('/api/auth', require('./routes/authRoutes'));

// app.use('/api/auth', require('./routes/passwordReset'));

// Products (CRUD — shared with storefront)
app.use('/api/products', require('./routes/productRoutes'));

// Orders (CRUD — reads real storefront orders)
app.use('/api/orders', require('./routes/orderRoutes'));

// Payments (Storefront)
// app.use('/api/payments', require('./routes/payments'));

// AI Virtual Try-on
// app.use('/api/ai', require('./routes/aiRoutes'));

// Feedback (Storefront)
// app.use('/api/feedback', require('./routes/feedback'));

// ML Sales Prediction
app.use('/api/ml', require('./routes/mlRoutes'));

// Hybrid Recommendations
app.use('/api/recommendations', require('./routes/recommendationRoutes'));

// Admin Routes (NEW)
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Shirtify Unified API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// ===== FALLBACK ROUTES =====

// Root → redirect to admin panel (storefront lives on friend's machine)
app.get('/', (req, res) => {
    res.redirect('/admin/');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    const serverInstance = app.listen(PORT, () => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 Shirtify Unified E-Commerce Platform`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 Server running on port ${PORT}`);
        console.log(`\n🛍️  Storefront:   http://localhost:${PORT}/`);
        console.log(`⚙️  Admin Panel:  http://localhost:${PORT}/admin/`);
        console.log(`🔌 API Health:   http://localhost:${PORT}/api/health`);
        console.log(`${'='.repeat(60)}\n`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
        console.log(`❌ Error: ${err.message}`);
        serverInstance.close(() => process.exit(1));
    });
}

module.exports = app;
