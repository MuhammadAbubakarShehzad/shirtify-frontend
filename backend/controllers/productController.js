const Product = require('../models/Product');

const listProducts = async (req, res) => {
  const { colour, size, minPrice, maxPrice } = req.query;
  let filter = {};

  const sizeAliases = {
    small: 'S',
    s: 'S',
    medium: 'M',
    m: 'M',
    large: 'L',
    l: 'L',
    'x-large': 'XL',
    xl: 'XL',
  };

  const normalizedSize = typeof size === 'string' ? sizeAliases[size.trim().toLowerCase()] || size.trim() : size;

  if (colour) {
    filter.colour = colour;
  }
  if (normalizedSize && normalizedSize !== 'All Sizes') {
    filter.$or = [
      { size: normalizedSize },
      { size: { $regex: new RegExp(`(^|[\\s,/-])${normalizedSize}(?=$|[\\s,/-])`, 'i') } }
    ];
  }
  if (minPrice !== undefined && maxPrice !== undefined && !isNaN(minPrice) && !isNaN(maxPrice)) {
    filter.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
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

  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Product deleted' });
};

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
