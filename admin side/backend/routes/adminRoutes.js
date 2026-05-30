const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');

/**
 * @route   GET /api/admin/sales-analytics
 * @desc    Get top products, size distribution, and sales trends
 * @access  Admin
 */
router.get('/sales-analytics', async (req, res) => {
    try {
        const { startDate, endDate, interval = 'daily' } = req.query;
        
        // Date range filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        // 1. Top-Selling T-shirt Designs (by order count)
        const topDesigns = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productName',
                    count: { $sum: 1 },
                    quantity: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // 2. Most Popular Sizes (S/M/L/XL distribution)
        const sizeDistribution = await Order.aggregate([
            { $match: dateFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.size',
                    count: { $sum: '$items.quantity' }
                }
            },
            { $match: { _id: { $in: ['S', 'M', 'L', 'XL', 'XXL'] } } },
            { $sort: { _id: 1 } }
        ]);

        // 3. Order Trends (Line chart data)
        const dateGrouping = interval === 'weekly' 
            ? { $dateToString: { format: "%Y-W%U", date: "$createdAt" } }
            : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };

        const trends = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: dateGrouping,
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    date: { $first: '$createdAt' }
                }
            },
            { $sort: { date: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                topDesigns,
                sizeDistribution,
                trends
            }
        });

    } catch (error) {
        console.error('Sales analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching sales analytics',
            error: error.message
        });
    }
});

module.exports = router;
