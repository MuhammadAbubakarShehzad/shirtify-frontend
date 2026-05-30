const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Product = require('../models/Product');
const Order = require('../models/Order');

async function seedOrders() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shirtify';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected successfully.');

        // 1. Get products to reference in orders
        let products = await Product.find({});
        
        // If no products, create some dummy ones
        if (products.length === 0) {
            console.log('⚠️ No products found. Creating dummy products first...');
            const dummyProducts = [
                { name: 'Classic White Tee', price: 1200, category: 'Casual', stock: 100 },
                { name: 'Graphic Streetwear Hoodie', price: 3500, category: 'Streetwear', stock: 50 },
                { name: 'Polo Performance Shirt', price: 2500, category: 'Sports', stock: 75 },
                { name: 'Minimalist Black Tee', price: 1200, category: 'Minimalist', stock: 120 },
                { name: 'Premium Oxford Shirt', price: 4500, category: 'Premium', stock: 30 }
            ];
            products = await Product.insertMany(dummyProducts);
            console.log(`✅ Created ${products.length} dummy products.`);
        }

        console.log(`📊 Found ${products.length} products to use for orders.`);

        // 2. Prepare seeding logic
        const numOrders = 150;
        const orders = [];
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        console.log(`📅 Generating ${numOrders} orders from ${sixMonthsAgo.toDateString()} to today...`);

        for (let i = 0; i < numOrders; i++) {
            // Generate a random date within the last 6 months
            const randomDate = new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime()));
            
            // Add "Realistic Trends"
            // - Weekend boost (Friday-Sunday have 40% more chance of high volume)
            const dayOfWeek = randomDate.getDay(); // 0 is Sunday, 6 is Saturday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
            
            // - Monthly Growth (More orders in recent months)
            const daysSinceStart = (randomDate.getTime() - sixMonthsAgo.getTime()) / (1000 * 60 * 60 * 24);
            const growthFactor = 1 + (daysSinceStart / 180) * 0.5; // Up to 50% growth over 6 months
            
            // Random number of items (1-3)
            const numItems = Math.floor(Math.random() * 3) + 1;
            const items = [];
            let totalAmount = 0;

            for (let j = 0; j < numItems; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                
                items.push({
                    product: product._id,
                    productName: product.name,
                    quantity: quantity,
                    price: product.price,
                    size: ['S', 'M', 'L', 'XL'][Math.floor(Math.random() * 4)],
                    color: ['Black', 'White', 'Blue', 'Grey'][Math.floor(Math.random() * 4)]
                });
                
                totalAmount += (product.price * quantity);
            }

            // Apply weekend and growth volume logic (skipping some iterations to simulate less sales early on)
            // This is a simple way to create a trend
            const probability = (isWeekend ? 0.9 : 0.6) * growthFactor;
            if (Math.random() > probability && i > 20) {
                // Skip some to make it look "natural"
                continue;
            }

            orders.push({
                orderNumber: `ORD-SEED-${1000 + i}`,
                customer: {
                    name: `Demo Customer ${i}`,
                    email: `customer${i}@example.com`,
                    phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
                    address: {
                        street: 'Demo Street ' + i,
                        city: ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad'][Math.floor(Math.random() * 4)],
                        state: 'Punjab',
                        postalCode: '54000',
                        country: 'Pakistan'
                    }
                },
                items: items,
                totalAmount: totalAmount,
                totalPrice: totalAmount,
                status: ['confirmed', 'shipped', 'delivered'][Math.floor(Math.random() * 3)],
                paymentMethod: ['cash-on-delivery', 'card', 'jazzcash'][Math.floor(Math.random() * 3)],
                paymentStatus: 'success',
                createdAt: randomDate,
                updatedAt: randomDate
            });
        }

        console.log(`🧹 Clearing old test orders (ORD-SEED-*)...`);
        await Order.deleteMany({ orderNumber: /^ORD-SEED-/ });

        console.log(`📝 Inserting ${orders.length} unique orders...`);
        await Order.insertMany(orders);

        console.log('✨ Seeding complete!');
        console.log(`📈 You now have ${orders.length} historical orders for the AI to analyze.`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding orders:', error);
        process.exit(1);
    }
}

seedOrders();
