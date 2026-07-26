// verify_aggregations.js — runs both aggregations and prints the exact errors if any
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

// Define models (using empty schemas for aggregation since they map directly to collection names)
const Product = mongoose.model('Product', new mongoose.Schema({}), 'products');
const Order = mongoose.model('Order', new mongoose.Schema({}), 'orders');

const MONGO_URI = 'mongodb://mongo:zOKJzTuYfznLAcudppwSrdkxusmyvLdq@caboose.proxy.rlwy.net:46154/test?authSource=admin';

mongoose.connect(MONGO_URI).then(async () => {
    console.log('✓ Connected to MongoDB');

    // 1. Test size-popularity
    try {
        console.log('\nTesting size-popularity...');
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
        console.log('✓ size-popularity worked! Result:', JSON.stringify(sizePopularity, null, 2));
    } catch (err) {
        console.error('❌ size-popularity failed:', err);
    }

    // 2. Test top-designs
    try {
        console.log('\nTesting top-designs...');
        const topDesigns = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
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
        console.log('✓ top-designs worked! Result:', JSON.stringify(topDesigns, null, 2));
    } catch (err) {
        console.error('❌ top-designs failed:', err);
    }

    await mongoose.disconnect();
});
