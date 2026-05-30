const express = require('express');
const { protect } = require('../middleware/auth');
const { initiatePayment } = require('../controllers/paymentGatewayController');

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/payment-gateway/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate a payment with a configured gateway
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, paymentMethod]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1499
 *               paymentMethod:
 *                 type: string
 *                 enum: [bank, easypaisa, jazzcash]
 *               payerName:
 *                 type: string
 *               payerEmail:
 *                 type: string
 *               billingAddress:
 *                 type: string
 *               mobileNumber:
 *                 type: string
 *               cnicLast6:
 *                 type: string
 *               bankName:
 *                 type: string
 *               accountTitle:
 *                 type: string
 *               ibanOrAccountNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initiation response
 *       400:
 *         description: Validation or configuration error
 *       401:
 *         description: Unauthorized
 */
router.post('/initiate', initiatePayment);

module.exports = router;
