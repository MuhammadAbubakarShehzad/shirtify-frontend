// verify.js — confirms seeded data shows up in analytics aggregation
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const s = new mongoose.Schema({ total: Number, status: String, createdAt: Date, shippingAddress: String });
const O = mongoose.model('Order', s);

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await O.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$total' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const totalOrders  = results.reduce((s, r) => s + r.orders, 0);
    const totalRevenue = results.reduce((s, r) => s + r.revenue, 0);

    console.log('\n📊 Last-30-day analytics aggregation:\n');
    results.forEach(r => {
        const bar = '█'.repeat(r.orders);
        console.log(`  ${r._id}  |  ${String(r.orders).padStart(2)} order(s)  |  Rs ${Math.round(r.revenue).toLocaleString().padStart(10)}  ${bar}`);
    });
    console.log(`\n  Total: ${totalOrders} orders across ${results.length} days, Rs ${Math.round(totalRevenue).toLocaleString()} revenue`);
    console.log('\n✅ Dashboard bar chart should now be populated!\n');
    await mongoose.disconnect();
});
