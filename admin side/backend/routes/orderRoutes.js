const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

/**
 * @route   GET /api/orders/stats
 * @desc    Get order KPI stats (total orders, revenue, pending, completed)
 * @access  Public
 * NOTE: Must be registered BEFORE /:id to avoid "stats" being treated as an ID
 */
router.get('/stats', async (req, res) => {
    try {
        const totalOrders   = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const completedOrders = await Order.countDocuments({ status: 'delivered' });

        const revenueAgg = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        res.json({
            success: true,
            data: { totalOrders, totalRevenue, pendingOrders, completedOrders }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/orders/analytics
 * @desc    Get monthly revenue + units timeline for charts
 * @access  Public
 */
router.get('/analytics', async (req, res) => {
    try {
        const period = parseInt(req.query.period) || 12;

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - period);

        const timeline = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    revenue: { $sum:   '$totalAmount' },
                    units:   { $count: {} },
                    date:    { $first: '$createdAt' }
                }
            },
            { $sort: { date: 1 } },
            {
                $project: {
                    _id: 0,
                    date:    { $dateToString: { format: '%b %Y', date: '$date' } },
                    revenue: 1,
                    units:   1
                }
            }
        ]);

        // Top selling products from orders
        const products = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id:     '$items.productName',
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
                    units:   { $sum: '$items.quantity' }
                }
            },
            { $sort: { units: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, name: '$_id', revenue: 1, units: 1 } }
        ]);

        res.json({ success: true, data: { timeline, products } });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/orders
 * @desc    Get all orders with optional filters
 * @access  Admin
 */
router.get('/', async (req, res) => {
    try {
        const { status, startDate, endDate, sort } = req.query;
        const query = {};

        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate)   query.createdAt.$lte = new Date(endDate);
        }

        let sortObj = { createdAt: -1 };
        if (sort === 'oldest')  sortObj = { createdAt:    1 };
        if (sort === 'amount')  sortObj = { totalAmount: -1 };

        const orders = await Order.find(query).sort(sortObj).limit(200);
        res.json({ success: true, data: orders });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order by ID
 * @access  Admin
 */
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   POST /api/orders
 * @desc    Create a new order (admin manual entry)
 * @access  Admin
 */
router.post('/', async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        res.status(201).json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order (mainly status updates from admin dashboard)
 * @access  Admin
 */
router.put('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, data: order });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete an order
 * @access  Admin
 */
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
