const mongoose = require('mongoose');

const customizationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  original_product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  size: { type: String, required: true },
  design_data: { type: Object, default: {} }, // JSON for canvas or design
  base_image: { type: String, default: '' }, // URL or base64
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customization', customizationSchema);
