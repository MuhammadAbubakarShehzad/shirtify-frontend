const Cart = require('../models/Cart');
const Product = require('../models/Product');

const normalizeQuantity = (value) => {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
};

const validateProductStock = async (productId, requestedQuantity) => {
  const product = await Product.findById(productId);
  if (!product) {
    return { ok: false, message: 'Product not found' };
  }

  if (product.stock <= 0) {
    return { ok: false, message: `${product.title || product.name || 'This product'} is out of stock` };
  }

  if (requestedQuantity > product.stock) {
    return { ok: false, message: `Only ${product.stock} item(s) left in stock for ${product.title || product.name || 'this product'}` };
  }

  return { ok: true, product };
};

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

  const requestedQuantity = normalizeQuantity(quantity);
  const stockCheck = await validateProductStock(productId, requestedQuantity);
  if (!stockCheck.ok) {
    return res.status(400).json({ message: stockCheck.message });
  }

  const cart = await Cart.findOne({ user: req.user._id }) || await Cart.create({ user: req.user._id, items: [] });
  const existing = cart.items.find(item => item.product.toString() === productId);
  const currentQuantity = existing ? existing.quantity : 0;
  const totalRequested = currentQuantity + requestedQuantity;

  if (totalRequested > stockCheck.product.stock) {
    return res.status(400).json({ message: `Only ${stockCheck.product.stock} item(s) left in stock for ${stockCheck.product.title || stockCheck.product.name || 'this product'}` });
  }

  if (existing) {
    existing.quantity += requestedQuantity;
  } else {
    cart.items.push({ product: productId, quantity: requestedQuantity });
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

  if (Array.isArray(items)) {
    for (const item of items) {
      const productId = item?.product;
      const quantity = normalizeQuantity(item?.quantity);
      if (!productId) {
        return res.status(400).json({ message: 'Each cart item requires a product id' });
      }

      const stockCheck = await validateProductStock(productId, quantity);
      if (!stockCheck.ok) {
        return res.status(400).json({ message: stockCheck.message });
      }
    }
  }

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
