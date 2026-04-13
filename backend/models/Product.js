const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'shirt' },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: '' },
  stock: { type: Number, default: 0, min: 0 },
  size: { type: String, default: '' },
  colour: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
