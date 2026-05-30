const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Order = require('./shirtify-backend/models/Order');

dotenv.config({ path: './shirtify-backend/.env' });

const checkOrders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const orders = await Order.find({});
        console.log(`Total Orders: ${orders.length}`);

        const counts = {};
        orders.forEach(o => {
            counts[o.status] = (counts[o.status] || 0) + 1;
        });

        console.table(counts);

        if (orders.length > 0) {
            console.log('Sample Order Status:', orders[0].status);
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkOrders();
