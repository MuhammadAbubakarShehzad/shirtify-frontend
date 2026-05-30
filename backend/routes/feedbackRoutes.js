const express = require('express');
const { postFeedback, getFeedbacks } = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * /api/feedback:
 *   get:
 *     tags: [Feedback]
 *     summary: Get all feedback entries
 *     responses:
 *       200:
 *         description: Feedback list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Feedback'
 */
router.get('/', getFeedbacks); // public (or restrict to admin if needed)

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     tags: [Feedback]
 *     summary: Submit feedback
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FeedbackCreateRequest'
 *     responses:
 *       201:
 *         description: Feedback submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feedback'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', protect, postFeedback);

module.exports = router;
