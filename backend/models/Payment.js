const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', uppercase: true, trim: true },
  paymentMethod: { type: String, required: true, trim: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: { type: String, trim: true },
  payerName: { type: String, trim: true },
  payerEmail: { type: String, trim: true, lowercase: true },
  billingAddress: { type: String, trim: true },
  cardLast4: { type: String, trim: true },
  gateway: { type: String, trim: true },
  gatewayResponse: { type: Object },
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);