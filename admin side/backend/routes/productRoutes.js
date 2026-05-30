const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

/**
 * @route   GET /api/products/stats
 * @desc    Get product KPI stats (total, value, low stock)
 * @access  Public
 * NOTE: Must be registered BEFORE /:id to avoid "stats" being treated as an ID
 */
router.get('/stats', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();

        const valueAgg = await Product.aggregate([
            { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } }
        ]);
        const totalValue = valueAgg[0]?.total || 0;

        const lowStock   = await Product.countDocuments({ stock: { $gt: 0, $lt: 10 } });
        const outOfStock = await Product.countDocuments({ stock: 0 });

        res.json({
            success: true,
            data: { totalProducts, totalValue, lowStock, outOfStock }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/products
 * @desc    Get all products with optional filters
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const { category, search, sort, minPrice, maxPrice } = req.query;
        const query = {};

        if (category)  query.category = category;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (search) {
            query.$or = [
                { name:        { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        let sortObj = { createdAt: -1 };
        if (sort === 'price_asc')  sortObj = { price:  1 };
        if (sort === 'price_desc') sortObj = { price: -1 };
        if (sort === 'sales')      sortObj = { sales: -1 };

        const products = await Product.find(query).sort(sortObj);
        res.json({ success: true, data: products });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Admin
 */
router.post('/', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ success: true, data: product });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Admin
 */
router.put('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
        Object.assign(product, req.body);
        await product.save();
        res.json({ success: true, data: product });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Admin
 */
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
