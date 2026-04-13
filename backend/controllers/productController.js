const Product = require('../models/Product');

const listProducts = async (req, res) => {
  const { colour } = req.query;
  let filter = {};
  if (colour) {
    filter.colour = colour;
  }
  const products = await Product.find(filter);
  res.json(products);
};

const getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

const createProduct = async (req, res) => {
  const { title, description, category, price, imageUrl, stock, size, colour } = req.body;
  const product = await Product.create({ title, description, category, price, imageUrl, stock, size, colour });
  res.status(201).json(product);
};

const updateProduct = async (req, res) => {
  console.log('Update body:', req.body);
  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Product not found' });
  res.json(updated);
};

const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  await product.remove();
  res.json({ message: 'Product deleted' });
};

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
