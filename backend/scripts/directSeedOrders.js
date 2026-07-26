/**
 * directSeedOrders.js
 * ====================
 * Inserts test orders DIRECTLY into MongoDB (no API, no cart, no auth needed).
 * This is the fastest and most reliable way to populate the dashboard.
 *
 * WHAT IT DOES:
 *  - Picks real product _ids from your DB
 *  - Picks real user _ids from your DB
 *  - Creates 30 orders with timestamps spread across the last 30 days
 *  - Tags every order with shippingAddress starting "[TEST_SEED]" for easy cleanup
 *
 * SAFETY:
 *  - Production URI guard (blocks Atlas/mongodb+srv URIs)
 *  - Does NOT decrement stock (read-only on products)
 *
 * USAGE:
 *   node scripts/directSeedOrders.js
 *
 * CLEANUP:
 *   In MongoDB shell / Compass:
 *   db.orders.deleteMany({ shippingAddress: /^\[TEST_SEED\]/ })
 */

'use strict';

const path     = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ─── Production Guard ─────────────────────────────────────────────────────────
const uri = process.env.MONGO_URI || '';
if (!uri) { console.error('❌ MONGO_URI not set in .env'); process.exit(1); }
if (/mongodb\+srv|\.mongodb\.net|cluster\d+\./i.test(uri)) {
    console.error('❌ ABORT: MONGO_URI looks like a production Atlas URI. Refusing to run.');
    console.error('   URI:', uri);
    process.exit(1);
}

// ─── Minimal Schemas (avoid re-registration issues) ──────────────────────────
const productSchema = new mongoose.Schema({
    title: String, price: Number, stock: Number, size: String, colour: String
});
const userSchema = new mongoose.Schema({ name: String, email: String });
const orderItemSchema = new mongoose.Schema({
    product: mongoose.Schema.Types.ObjectId,
    quantity: { type: Number, default: 1 },
    price:    { type: Number, required: true }
});
const orderSchema = new mongoose.Schema({
    user:            { type: mongoose.Schema.Types.ObjectId, required: true },
    items:           [orderItemSchema],
    total:           { type: Number, required: true },
    status:          { type: String, default: 'pending' },
    shippingAddress: { type: String, default: '' },
    paymentMethod:   { type: String, default: 'cod' },
    createdAt:       { type: Date,   default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const User    = mongoose.model('User',    userSchema);
const Order   = mongoose.model('Order',   orderSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function randomDateInLastNDays(n) {
    const now = Date.now();
    const ago = now - n * 24 * 60 * 60 * 1000;
    return new Date(ago + Math.random() * (now - ago));
}

const STREETS = [
    'House 12, Street 7, Johar Town',
    'Flat 3B, Defense Phase 5',
    'Plot 22, Gulberg III',
    'Block D, Model Town',
    'Street 9, I-8/2, Islamabad',
    'House 5, F-7/4, Islamabad',
    '45-C, Canal View Housing Society',
    'Room 101, Askari 11',
];
const CITIES   = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];
const PAYMENTS = ['cod', 'jazzcash', 'easypaisa'];
const STATUSES = ['pending', 'pending', 'pending', 'confirmed', 'shipped', 'delivered'];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const ORDER_COUNT = parseInt(process.env.SEED_ORDER_COUNT || '30', 10);

    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Shirtify Direct Order Seeder (DB)      ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log(`Connecting to: ${uri}`);
    console.log(`Will create  : ${ORDER_COUNT} orders\n`);

    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB\n');

    // Fetch real products and users
    const products = await Product.find({ stock: { $gt: 0 } }).lean();
    const users    = await User.find({}).lean();

    if (products.length === 0) {
        console.error('❌ No in-stock products found. Add products first.');
        await mongoose.disconnect(); process.exit(1);
    }
    if (users.length === 0) {
        console.error('❌ No users found. Register a user first.');
        await mongoose.disconnect(); process.exit(1);
    }

    console.log(`📦 Found ${products.length} in-stock products: ${products.map(p => p.title).join(', ')}`);
    console.log(`👥 Found ${users.length} users\n`);

    let created = 0;
    let failed  = 0;

    for (let i = 0; i < ORDER_COUNT; i++) {
        try {
            // Pick 1–3 distinct products
            const itemCount = randomInt(1, Math.min(3, products.length));
            const chosen    = [];
            const used      = new Set();
            while (chosen.length < itemCount) {
                const p = randomElement(products);
                if (!used.has(p._id.toString())) {
                    used.add(p._id.toString());
                    chosen.push(p);
                }
            }

            const items = chosen.map(p => ({
                product:  p._id,
                quantity: randomInt(1, 3),
                price:    p.price
            }));

            const total   = items.reduce((s, it) => s + it.price * it.quantity, 0);
            const user    = randomElement(users);
            const address = `[TEST_SEED] Order #${i + 1} — ${randomElement(STREETS)}, ${randomElement(CITIES)}, Pakistan`;

            const order = await Order.create({
                user:            user._id,
                items,
                total,
                status:          randomElement(STATUSES),
                shippingAddress: address,
                paymentMethod:   randomElement(PAYMENTS),
                createdAt:       randomDateInLastNDays(29)   // spread over last 29 days
            });

            console.log(`  [${String(i + 1).padStart(2, '0')}/${ORDER_COUNT}] ✓ Created ${order._id}  |  Rs ${total.toLocaleString()}  |  ${order.status}  |  ${order.createdAt.toDateString()}`);
            created++;
        } catch (err) {
            console.error(`  [${String(i + 1).padStart(2, '0')}/${ORDER_COUNT}] ✗ FAILED — ${err.message}`);
            failed++;
        }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`✅ Done!  Created: ${created}   Failed: ${failed}`);
    console.log('\n🗑  To clean up, run in MongoDB shell / Compass:');
    console.log('   db.orders.deleteMany({ shippingAddress: /^\\[TEST_SEED\\]/ })\n');

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('\n💥 Unexpected error:', err.message);
    process.exit(1);
});
