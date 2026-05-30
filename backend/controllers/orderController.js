const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const createOrder = async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const items = cart.items.map(item => ({
    product: item.product._id,
    quantity: item.quantity,
    price: item.product.price
  }));

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  for (const item of cart.items) {
    const product = item.product;
    const quantity = item.quantity;

    if (!product) {
      return res.status(400).json({ message: 'One or more products in your cart no longer exist' });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ message: `${product.title || product.name || 'This product'} is out of stock` });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: `Only ${product.stock} item(s) left in stock for ${product.title || product.name || 'this product'}` });
    }
  }

  for (const item of cart.items) {
    const product = item.product;
    product.stock -= item.quantity;
    product.sales = (product.sales || 0) + item.quantity;
    await product.save();
  }

  const order = await Order.create({
    user: req.user._id,
    items,
    total,
    status: 'pending',
    shippingAddress: shippingAddress || '',
    paymentMethod: paymentMethod || 'cod'
  });

  cart.items = [];
  await cart.save();

  return res.status(201).json(order);
};

const getOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('items.product');
  res.json(orders);
};

const getOrderById = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).populate('items.product');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
};

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('items.product').populate('user', 'email name');
    
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
    const orderStats = {
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };
    
    return res.json({
      success: true,
      totalOrders,
      totalAmount,
      orderStats,
      orders
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Get order statistics (admin only)
const getOrderStats = async (req, res) => {
  try {
    const orders = await Order.find();
    
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;
    
    const orderStats = {
      total: totalOrders,
      totalAmount,
      avgOrderValue,
      byStatus: {
        pending: orders.filter(o => o.status === 'pending').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
      }
    };
    
    return res.json({ success: true, data: orderStats });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return res.status(500).json({ message: 'Error fetching order statistics' });
  }
};

module.exports = { createOrder, getOrders, getOrderById, getAllOrders, getOrderStats };
