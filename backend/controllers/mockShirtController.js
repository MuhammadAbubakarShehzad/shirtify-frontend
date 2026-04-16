const MockShirt = require('../models/MockShirt');

// Create a new mock shirt
exports.createMockShirt = async (req, res) => {
  try {
    const { name, type, price, imageUrl } = req.body;
    const shirt = await MockShirt.create({ name, type, price, imageUrl });
    res.status(201).json(shirt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all mock shirts
exports.getMockShirts = async (req, res) => {
  try {
    const shirts = await MockShirt.find();
    res.json(shirts);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get a single mock shirt by ID
exports.getMockShirt = async (req, res) => {
  try {
    const shirt = await MockShirt.findById(req.params.id);
    if (!shirt) return res.status(404).json({ message: 'Mock shirt not found' });
    res.json(shirt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update a mock shirt
exports.updateMockShirt = async (req, res) => {
  try {
    const shirt = await MockShirt.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!shirt) return res.status(404).json({ message: 'Mock shirt not found' });
    res.json(shirt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a mock shirt
exports.deleteMockShirt = async (req, res) => {
  try {
    const shirt = await MockShirt.findByIdAndDelete(req.params.id);
    if (!shirt) return res.status(404).json({ message: 'Mock shirt not found' });
    res.json({ message: 'Mock shirt deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
