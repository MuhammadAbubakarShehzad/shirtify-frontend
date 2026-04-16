const Customization = require('../models/Customization');

// Create a new customization
const createCustomization = async (req, res) => {
  try {
    const { original_product_id, size, design_data, base_image } = req.body;
    let parsedDesignData = {};
    if (typeof design_data === 'string') {
      try {
        parsedDesignData = JSON.parse(design_data);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid design_data JSON' });
      }
    } else if (typeof design_data === 'object' && design_data !== null) {
      parsedDesignData = design_data;
    }
    const customization = await Customization.create({
      user: req.user?._id,
      original_product_id,
      size,
      design_data: parsedDesignData,
      base_image: base_image || ''
    });
    res.status(201).json(customization);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get a customization by ID
const getCustomization = async (req, res) => {
  try {
    const customization = await Customization.findById(req.params.id);
    if (!customization) return res.status(404).json({ message: 'Customization not found' });
    res.json(customization);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update a customization (design actions)
const updateCustomization = async (req, res) => {
  try {
    const customization = await Customization.findById(req.params.id);
    if (!customization) return res.status(404).json({ message: 'Customization not found' });
    Object.assign(customization, req.body, { updatedAt: Date.now() });
    await customization.save();
    res.json(customization);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { createCustomization, getCustomization, updateCustomization };
