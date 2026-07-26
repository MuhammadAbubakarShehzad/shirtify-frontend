const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/analytics/order-trends
 * @desc    Get order count and revenue trend for the last 30 days
 * @access  Admin
 */
router.get('/order-trends', protect, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const trends = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$total" }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    orders: 1,
                    revenue: 1
                }
            }
        ]);
        
        res.json({ success: true, data: trends });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/analytics/size-popularity
 * @desc    Get distribution of t-shirt sizes sold
 * @access  Admin
 */
router.get('/size-popularity', protect, async (req, res) => {
    try {
        // Order items don't carry a .size field — size lives on the Product document.
        // We look up the product and group by product.size.
        const sizePopularity = await Order.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$productInfo.size', 'N/A'] },
                    count: { $sum: '$items.quantity' }
                }
            },
            { $sort: { count: -1 } },
            {
                $project: {
                    _id: 0,
                    size: '$_id',
                    count: 1
                }
            }
        ]);
        res.json({ success: true, data: sizePopularity });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * @route   GET /api/analytics/top-designs
 * @desc    Get top 5 best selling designs by revenue
 * @access  Admin
 */
router.get('/top-designs', protect, async (req, res) => {
    try {
        const topDesigns = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',   // ObjectId ref — join below
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
                    unitsSold: { $sum: '$items.quantity' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    designName: { $ifNull: ['$productInfo.title', 'Unknown Product'] },
                    revenue: 1,
                    unitsSold: 1,
                    orders: 1
                }
            }
        ]);
        res.json({ success: true, data: topDesigns });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
