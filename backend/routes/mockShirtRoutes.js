const express = require('express');
const router = express.Router();
const mockShirtController = require('../controllers/mockShirtController');

// CRUD routes for mock shirts
/**
 * @swagger
 * /api/mockshirts:
 *   post:
 *     tags: [MockShirts]
 *     summary: Create a mock shirt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MockShirtCreateRequest'
 *     responses:
 *       201:
 *         description: Mock shirt created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MockShirt'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags: [MockShirts]
 *     summary: Get all mock shirts
 *     responses:
 *       200:
 *         description: Mock shirts retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MockShirt'
 */
router.post('/', mockShirtController.createMockShirt);
router.get('/', mockShirtController.getMockShirts);

/**
 * @swagger
 * /api/mockshirts/{id}:
 *   get:
 *     tags: [MockShirts]
 *     summary: Get a mock shirt by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mock shirt found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MockShirt'
 *       400:
 *         description: Invalid ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Mock shirt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags: [MockShirts]
 *     summary: Update a mock shirt by ID
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
 *         description: Mock shirt updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MockShirt'
 *       400:
 *         description: Invalid payload or ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Mock shirt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [MockShirts]
 *     summary: Delete a mock shirt by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mock shirt deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mock shirt deleted
 *       400:
 *         description: Invalid ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Mock shirt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', mockShirtController.getMockShirt);
router.put('/:id', mockShirtController.updateMockShirt);
router.delete('/:id', mockShirtController.deleteMockShirt);

module.exports = router;
