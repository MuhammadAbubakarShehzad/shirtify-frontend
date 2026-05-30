const mongoose = require('mongoose');
const UserInteraction = require('../models/UserInteraction');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '../.env' });

const seedData = [
  // User 1 loves Casual & Graphic
  { userId: 'u001', productId: 'p001', interactionType: 'purchase' }, // Casual Round Neck
  { userId: 'u001', productId: 'p003', interactionType: 'view' },     // Graphic Street Tee
  { userId: 'u001', productId: 'p006', interactionType: 'cart' },     // Basic White Tee
  { userId: 'u001', productId: 'p008', interactionType: 'purchase' }, // Printed Logo Tee

  // User 2 loves Formal & Premium
  { userId: 'u002', productId: 'p002', interactionType: 'view' },     // Polo Classic
  { userId: 'u002', productId: 'p004', interactionType: 'purchase' }, // Slim Fit V-Neck
  { userId: 'u002', productId: 'p009', interactionType: 'cart' },     // Premium Minimalist
  { userId: 'u002', productId: 'p012', interactionType: 'purchase' }, // Formal Dress Shirt

  // User 3 loves Streetwear
  { userId: 'u003', productId: 'p005', interactionType: 'purchase' }, // Oversized Drop Tee
  { userId: 'u003', productId: 'p011', interactionType: 'cart' },     // Vintage Wash Tee
  { userId: 'u003', productId: 'p003', interactionType: 'view' },     // Graphic Street Tee

  // User 4 mixed bag
  { userId: 'u004', productId: 'p001', interactionType: 'view' },
  { userId: 'u004', productId: 'p010', interactionType: 'purchase' }, // Athletic Performance
  { userId: 'u004', productId: 'p007', interactionType: 'cart' }      // Henley Long Sleeve
];

const seedDB = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shirtify');
        
        console.log("Clearing old interactions...");
        await UserInteraction.deleteMany();

        console.log("Inserting seed data...");
        for (const data of seedData) {
            const int = new UserInteraction(data);
            await int.save(); // triggers the pre-save hook for scores
        }
        
        console.log("Seed successful.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedDB();
