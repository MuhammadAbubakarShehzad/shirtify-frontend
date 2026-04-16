const express = require('express');
const router = express.Router();
const mockShirtController = require('../controllers/mockShirtController');

// CRUD routes for mock shirts
router.post('/', mockShirtController.createMockShirt);
router.get('/', mockShirtController.getMockShirts);
router.get('/:id', mockShirtController.getMockShirt);
router.put('/:id', mockShirtController.updateMockShirt);
router.delete('/:id', mockShirtController.deleteMockShirt);

module.exports = router;
