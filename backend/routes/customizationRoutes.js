const express = require('express');
const { createCustomization, getCustomization, updateCustomization } = require('../controllers/customizationController');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Create customization (requires product and size)
router.post('/', protect, createCustomization);
// Get customization by ID
router.get('/:id', protect, getCustomization);
// Update customization (design actions)
router.put('/:id', protect, updateCustomization);

module.exports = router;
