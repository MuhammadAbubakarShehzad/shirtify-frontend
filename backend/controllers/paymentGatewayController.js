const { initiateGatewayPayment } = require('../services/payment/paymentGatewayService');

const initiatePayment = async (req, res, next) => {
  try {
    const result = await initiateGatewayPayment(req.user, req.body);
    return res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return next(error);
  }
};

module.exports = { initiatePayment };
