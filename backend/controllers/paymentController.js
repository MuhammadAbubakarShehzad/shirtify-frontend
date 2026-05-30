const Payment = require('../models/Payment');
const Order = require('../models/Order');

const createPayment = async (req, res) => {
  const {
    orderId,
    amount,
    currency,
    paymentMethod,
    paymentStatus,
    transactionId,
    payerName,
    payerEmail,
    billingAddress,
    cardLast4,
    gateway,
    gatewayResponse,
    paidAt
  } = req.body;

  if (amount === undefined || amount === null || !paymentMethod) {
    return res.status(400).json({ message: 'amount and paymentMethod are required' });
  }

  let order = null;
  if (orderId) {
    order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found for this user' });
    }
  }

  const payment = await Payment.create({
    user: req.user._id,
    order: order ? order._id : undefined,
    amount,
    currency,
    paymentMethod,
    paymentStatus,
    transactionId,
    payerName,
    payerEmail,
    billingAddress,
    cardLast4,
    gateway,
    gatewayResponse,
    paidAt
  });

  return res.status(201).json(payment);
};

const getPayments = async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate('order');

  res.json(payments);
};

const getPaymentById = async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, user: req.user._id }).populate('order');
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  return res.json(payment);
};

module.exports = { createPayment, getPayments, getPaymentById };