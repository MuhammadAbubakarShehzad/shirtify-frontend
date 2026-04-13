const express = require('express');
const { getCart, addItem, updateCart, removeItem } = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.get('/', getCart);
router.post('/', addItem);
router.put('/', updateCart);
router.delete('/:productId', removeItem);

module.exports = router;
