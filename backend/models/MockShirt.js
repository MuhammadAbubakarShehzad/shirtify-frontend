const mongoose = require('mongoose');

const mockShirtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, default: '' },
  images: { type: [String], default: [] }, // <-- Add this line
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MockShirt', mockShirtSchema);
