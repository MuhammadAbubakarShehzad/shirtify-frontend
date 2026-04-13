const Cart = require('../models/Cart');

const getCart = async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }
  res.json(cart);
};

const addItem = async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const cart = await Cart.findOne({ user: req.user._id }) || await Cart.create({ user: req.user._id, items: [] });
  const existing = cart.items.find(item => item.product.toString() === productId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  cart.updatedAt = new Date();
  await cart.save();
  await cart.populate('items.product');

  res.json(cart);
};

const updateCart = async (req, res) => {
  const { items } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  cart.items = items || [];
  cart.updatedAt = new Date();
  await cart.save();
  await cart.populate('items.product');

  res.json(cart);
};

const removeItem = async (req, res) => {
  const { productId } = req.params;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  cart.items = cart.items.filter(item => item.product.toString() !== productId);
  cart.updatedAt = new Date();
  await cart.save();
  await cart.populate('items.product');

  res.json(cart);
};

module.exports = { getCart, addItem, updateCart, removeItem };
