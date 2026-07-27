const Product = require('../models/Product');
const { logActivity } = require('../../admin side/backend/models/ActivityLog');

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

  if (normalizedSize && normalizedSize !== 'All Sizes') {
    filter.$or = [
      { size: normalizedSize },
      { size: { $regex: new RegExp(`(^|[\\s,/-])${normalizedSize}(?=$|[\\s,/-])`, 'i') } }
    ];
  }
  if (minPrice !== undefined && maxPrice !== undefined && !isNaN(minPrice) && !isNaN(maxPrice)) {
    filter.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
  }
  
  let products = await Product.find(filter);

  // Apply flexible color filtering in memory
  if (colour) {
    function hexToRgb(hex) {
      hex = hex.replace(/^#/, '');
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      const num = parseInt(hex, 16);
      return isNaN(num) ? null : {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    const colorNameToHex = {
      white: '#ffffff',
      offwhite: '#f5f5f5',
      black: '#000000',
      mehroon: '#800000',
      maroon: '#800000',
      red: '#ff0000',
      blue: '#0000ff',
      green: '#008000',
      yellow: '#ffff00',
      orange: '#ffa500',
      grey: '#808080',
      gray: '#808080',
      pink: '#ffc0cb',
      purple: '#800080',
      brown: '#a52a2a'
    };

    function parseToRgb(colorStr) {
      if (!colorStr) return null;
      const clean = colorStr.trim().toLowerCase();
      if (clean.startsWith('#')) {
        return hexToRgb(clean);
      }
      const hex = colorNameToHex[clean];
      if (hex) return hexToRgb(hex);
      return null;
    }

    function colorDistance(rgb1, rgb2) {
      if (!rgb1 || !rgb2) return Infinity;
      return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
      );
    }

    const targetRgb = parseToRgb(colour);
    if (targetRgb) {
      products = products.filter(p => {
        const prodRgb = parseToRgb(p.colour);
        if (prodRgb) {
          // Match if colors are visually close (distance < 150)
          return colorDistance(targetRgb, prodRgb) < 150;
        }
        if (p.colour) {
          const pClean = p.colour.toLowerCase();
          const cClean = colour.toLowerCase();
          return pClean.includes(cClean) || cClean.includes(pClean);
        }
        return false;
      });
    } else {
      const cClean = colour.toLowerCase();
      products = products.filter(p => p.colour && p.colour.toLowerCase().includes(cClean));
    }
  }

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
  logActivity('product', `New product ${product.title || product.name} created`, req.user?._id);
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
