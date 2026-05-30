const express = require('express');
const { createCustomization, getCustomization, updateCustomization } = require('../controllers/customizationController');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Create customization (requires product and size)
/**
 * @swagger
 * /api/customizations:
 *   post:
 *     tags: [Customizations]
 *     summary: Create a customization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomizationCreateRequest'
 *     responses:
 *       201:
 *         description: Customization created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customization'
 *       400:
 *         description: Invalid payload
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
router.post('/', protect, createCustomization);

// Get customization by ID
/**
 * @swagger
 * /api/customizations/{id}:
 *   get:
 *     tags: [Customizations]
 *     summary: Get customization by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customization found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customization'
 *       400:
 *         description: Invalid ID
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
 *       404:
 *         description: Customization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [Customizations]
 *     summary: Update customization by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Customization updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customization'
 *       400:
 *         description: Invalid payload or ID
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
 *       404:
 *         description: Customization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', protect, getCustomization);
// Update customization (design actions)
router.put('/:id', protect, updateCustomization);

module.exports = router;
