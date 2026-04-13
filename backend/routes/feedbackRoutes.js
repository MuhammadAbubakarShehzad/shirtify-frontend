const express = require('express');
const { postFeedback, getFeedbacks } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', getFeedbacks); // public (or restrict to admin if needed)
router.post('/', protect, postFeedback);

module.exports = router;
