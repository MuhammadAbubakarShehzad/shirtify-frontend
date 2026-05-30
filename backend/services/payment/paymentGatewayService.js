const crypto = require('crypto');
const axios = require('axios');
const Payment = require('../../models/Payment');

/**
 * TEST PAYMENT CONFIGURATION
 * ==========================
 * For development/testing, use these credentials in backend/.env:
 * 
 * JAZZCASH_API_URL=https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/OnlineCheckout
 * JAZZCASH_MERCHANT_ID=TESTMERCHANT
 * JAZZCASH_PASSWORD=TestPassword123
 * JAZZCASH_INTEGERITY_SALT=TestSalt12345
 * JAZZCASH_TXN_TYPE=MWALLET
 * 
 * Test Payment Details:
 * - Amount: Any amount (e.g., 1499 PKR)
 * - Mobile: 03001234567 (11 digits)
 * - CNIC Last 6: 123456 (any 6 digits)
 * - Payer Name: Any name
 * - Email: Any email
 * 
 * See TEST_PAYMENT_CREDENTIALS.md for complete documentation
 */

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function minorUnits(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createError('A valid amount is required.');
  }

  return String(Math.round(numericAmount * 100));
}

function formatJazzCashDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function sanitizeDescription(value) {
  return String(value || 'Shirtify order payment').replace(/[<>*=%\/:'|"{}]/g, ' ').trim();
}

function buildJazzCashHash(fields, integritySalt) {
  const orderedFieldNames = Object.keys(fields)
    .filter((key) => key.startsWith('pp_') && fields[key] !== undefined && fields[key] !== null && fields[key] !== '')
    .sort();

  const payload = [integritySalt, ...orderedFieldNames.map((key) => String(fields[key]))].join('&');
  return crypto.createHmac('sha256', integritySalt).update(payload, 'utf8').digest('hex').toUpperCase();
}

async function savePaymentRecord(user, payload) {
  return Payment.create({
    user: user._id,
    amount: payload.amount,
    currency: payload.currency || 'PKR',
    paymentMethod: payload.paymentMethod,
    paymentStatus: payload.paymentStatus || 'pending',
    transactionId: payload.transactionId,
    payerName: payload.payerName,
    payerEmail: payload.payerEmail,
    billingAddress: payload.billingAddress,
    cardLast4: payload.cardLast4,
    gateway: payload.gateway,
    gatewayResponse: payload.gatewayResponse,
    paidAt: payload.paidAt
  });
}

async function initiateBankTransfer(user, request) {
  const accountTitle = String(request.accountTitle || '').trim();
  const bankName = String(request.bankName || '').trim();
  const ibanOrAccountNumber = String(request.ibanOrAccountNumber || '').trim();

  if (!accountTitle || !bankName || !ibanOrAccountNumber) {
    throw createError('Bank transfer requires account title, bank name, and IBAN/account number.');
  }

  const payment = await savePaymentRecord(user, {
    amount: request.amount,
    currency: 'PKR',
    paymentMethod: 'bank',
    paymentStatus: 'pending',
    transactionId: `bank_${Date.now()}`,
    payerName: accountTitle,
    payerEmail: request.payerEmail,
    billingAddress: request.billingAddress,
    gateway: 'bank_transfer',
    gatewayResponse: {
      bankName,
      accountTitle,
      ibanLast4: ibanOrAccountNumber.slice(-4)
    }
  });

  return {
    mode: 'inline',
    provider: 'bank',
    status: 'pending',
    payment,
    message: 'Bank transfer request saved. Mark this payment as successful after you verify the transfer with your bank or merchant dashboard.'
  };
}

async function initiateJazzCash(user, request) {
  const apiUrl = process.env.JAZZCASH_API_URL;
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password = process.env.JAZZCASH_PASSWORD;
  const integritySalt = process.env.JAZZCASH_INTEGERITY_SALT || process.env.JAZZCASH_INTEGRITY_SALT;
  const subMerchantId = process.env.JAZZCASH_SUBMERCHANT_ID || '';
  const isTestMode = String(process.env.NODE_ENV || '').toLowerCase() !== 'production' && 
                     (merchantId === 'TESTMERCHANT' || process.env.PAYMENT_TEST_MODE === 'true');

  if (!apiUrl || !merchantId || !password || !integritySalt) {
    throw createError('JazzCash is not configured yet. Add JazzCash sandbox credentials in backend/.env first.');
  }

  const mobileNumber = digitsOnly(request.mobileNumber);
  const cnicLast6 = digitsOnly(request.cnicLast6);

  if (mobileNumber.length < 11 || cnicLast6.length !== 6) {
    throw createError('JazzCash requires a valid mobile number and the last 6 digits of CNIC.');
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + (60 * 60 * 1000));
  const txnRefNo = `T${formatJazzCashDate(now)}${Math.floor(Math.random() * 900 + 100)}`;
  const fields = {
    pp_Version: '1.1',
    pp_TxnType: process.env.JAZZCASH_TXN_TYPE || 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: merchantId,
    pp_SubMerchantID: subMerchantId,
    pp_Password: password,
    pp_TxnRefNo: txnRefNo,
    pp_MobileNumber: mobileNumber,
    pp_CNIC: cnicLast6,
    pp_Amount: minorUnits(request.amount),
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: formatJazzCashDate(now),
    pp_BillReference: `shirtify-${Date.now()}`,
    pp_Description: sanitizeDescription(request.description),
    pp_TxnExpiryDateTime: formatJazzCashDate(expiry),
    ppmpf_1: String(user._id)
  };

  fields.pp_SecureHash = buildJazzCashHash(fields, integritySalt);

  // In test mode, auto-approve the payment without calling the API
  if (isTestMode) {
    const payment = await savePaymentRecord(user, {
      amount: request.amount,
      currency: 'PKR',
      paymentMethod: 'jazzcash',
      paymentStatus: 'success',
      transactionId: txnRefNo,
      payerName: request.payerName,
      payerEmail: request.payerEmail,
      billingAddress: request.billingAddress,
      gateway: 'jazzcash',
      gatewayResponse: {
        testMode: true,
        message: 'Test mode: Payment auto-approved',
        mobileLast4: mobileNumber.slice(-4),
        cnicLast6
      },
      paidAt: new Date()
    });

    return {
      mode: 'inline',
      provider: 'jazzcash',
      status: 'success',
      payment,
      message: '✅ Test Payment Approved! (Test Mode)'
    };
  }

  let data = {};

  try {
    const response = await axios.post(apiUrl, fields, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });
    data = response.data || {};
  } catch (error) {
    const gatewayMessage = error.response?.data?.pp_ResponseMessage
      || error.response?.data?.responseMessage
      || error.message
      || 'JazzCash request failed.';

    const payment = await savePaymentRecord(user, {
      amount: request.amount,
      currency: 'PKR',
      paymentMethod: 'jazzcash',
      paymentStatus: 'failed',
      transactionId: txnRefNo,
      payerName: request.payerName,
      payerEmail: request.payerEmail,
      billingAddress: request.billingAddress,
      gateway: 'jazzcash',
      gatewayResponse: {
        requestFields: fields,
        error: error.response?.data || gatewayMessage,
        mobileLast4: mobileNumber.slice(-4),
        cnicLast6
      }
    });

    throw createError(`${gatewayMessage}${payment?._id ? ` Payment record: ${payment._id}` : ''}`);
  }

  const responseCode = data.pp_ResponseCode || data.responseCode;
  const responseMessage = data.pp_ResponseMessage || data.responseMessage || 'JazzCash response received.';
  const succeeded = responseCode === '000';

  const payment = await savePaymentRecord(user, {
    amount: request.amount,
    currency: 'PKR',
    paymentMethod: 'jazzcash',
    paymentStatus: succeeded ? 'success' : 'failed',
    transactionId: data.pp_RetrievalReferenceNo || data.pp_RetreivalReferenceNo || txnRefNo,
    payerName: request.payerName,
    payerEmail: request.payerEmail,
    billingAddress: request.billingAddress,
    gateway: 'jazzcash',
    gatewayResponse: {
      ...data,
      mobileLast4: mobileNumber.slice(-4),
      cnicLast6
    },
    paidAt: succeeded ? new Date() : undefined
  });

  if (!succeeded) {
    throw createError(responseMessage);
  }

  return {
    mode: 'inline',
    provider: 'jazzcash',
    status: 'success',
    payment,
    message: responseMessage
  };
}

async function initiateEasypaisa(user, request) {
  const merchantMode = (process.env.EASYPAISA_MODE || '').trim().toLowerCase();

  if (merchantMode !== 'mock' && process.env.NODE_ENV === 'production') {
    throw createError('Easypaisa needs merchant onboarding and credentials before live API payments can be enabled in this project.');
  }

  const mobileNumber = digitsOnly(request.mobileNumber);
  if (mobileNumber.length < 11) {
    throw createError('Easypaisa requires a valid mobile number.');
  }

  // Auto-approve in mock mode or test environment
  const isTestMode = merchantMode === 'mock';
  const paymentStatus = isTestMode ? 'success' : 'pending';

  const payment = await savePaymentRecord(user, {
    amount: request.amount,
    currency: 'PKR',
    paymentMethod: 'easypaisa',
    paymentStatus: paymentStatus,
    transactionId: `easypaisa_${isTestMode ? 'mock' : 'live'}_${Date.now()}`,
    payerName: request.payerName,
    payerEmail: request.payerEmail,
    billingAddress: request.billingAddress,
    gateway: 'easypaisa',
    gatewayResponse: {
      mode: merchantMode,
      mobileLast4: mobileNumber.slice(-4),
      testMode: isTestMode
    },
    paidAt: isTestMode ? new Date() : undefined
  });

  return {
    mode: 'inline',
    provider: 'easypaisa',
    status: paymentStatus,
    payment,
    message: isTestMode 
      ? '✅ Test Payment Approved! (Mock Mode)' 
      : 'Easypaisa mock mode is active. Complete merchant onboarding and replace the mock flow with your issued credentials to accept live payments.'
  };
}

async function initiateGatewayPayment(user, request) {
  const paymentMethod = String(request.paymentMethod || '').trim().toLowerCase();

  if (!paymentMethod) {
    throw createError('Payment method is required.');
  }

  if (paymentMethod === 'bank') {
    return initiateBankTransfer(user, request);
  }

  if (paymentMethod === 'jazzcash') {
    return initiateJazzCash(user, request);
  }

  if (paymentMethod === 'easypaisa') {
    return initiateEasypaisa(user, request);
  }

  throw createError('Unsupported payment method selected.');
}

module.exports = { initiateGatewayPayment };
