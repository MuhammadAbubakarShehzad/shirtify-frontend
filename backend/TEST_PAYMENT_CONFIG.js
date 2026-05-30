/**
 * TEST PAYMENT CREDENTIALS AND EXAMPLES
 * 
 * This file contains ready-to-use test credentials and code samples
 * for testing the Shirtify payment system.
 * 
 * ⚠️ FOR DEVELOPMENT/TESTING ONLY - DO NOT USE IN PRODUCTION
 */

// ============================================
// 🧪 TEST PAYMENT CREDENTIALS
// ============================================

export const TEST_PAYMENT_CREDENTIALS = {
  // JazzCash Sandbox (Primary Gateway)
  jazzcash: {
    apiUrl: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/OnlineCheckout',
    merchantId: 'TESTMERCHANT',
    password: 'TestPassword123',
    integritySalt: 'TestSalt12345',
    transactionType: 'MWALLET'
  },

  // Easypaisa (Mock Mode)
  easypaisa: {
    mode: 'mock'
  },

  // Bank Transfer
  bankTransfer: {
    bankName: 'Test Bank',
    accountTitle: 'Shirtify Test Account',
    iban: 'PK12ABCD0000123456789'
  }
};

// ============================================
// 💳 TEST PAYMENT DATA SAMPLES
// ============================================

export const TEST_PAYMENTS = {
  // JazzCash Test Payment
  jazzcash_success: {
    amount: 1499,
    paymentMethod: 'jazzcash',
    payerName: 'Test User',
    payerEmail: 'test@shirtify.com',
    mobileNumber: '03001234567',
    cnicLast6: '123456',
    billingAddress: 'Test Address, Karachi, Pakistan'
  },

  // Easypaisa Test Payment (Mock)
  easypaisa_test: {
    amount: 500,
    paymentMethod: 'easypaisa',
    payerName: 'Easypaisa Tester',
    payerEmail: 'tester@shirtify.com',
    mobileNumber: '03101234567',
    billingAddress: 'Test Address, Lahore, Pakistan'
  },

  // Bank Transfer Test
  bank_transfer_test: {
    amount: 2000,
    paymentMethod: 'bank',
    payerName: 'Ahmed Khan',
    payerEmail: 'ahmed@example.com',
    bankName: 'HBL',
    accountTitle: 'Ahmed Khan',
    ibanOrAccountNumber: 'PK12HBLC0000123456789',
    billingAddress: 'HBL Branch, Karachi, Pakistan'
  },

  // Minimum Amount Test
  minimum_amount: {
    amount: 100,
    paymentMethod: 'jazzcash',
    payerName: 'Min Test',
    payerEmail: 'min@test.com',
    mobileNumber: '03001111111',
    cnicLast6: '000000',
    billingAddress: 'Test Address'
  },

  // Large Amount Test
  large_amount: {
    amount: 50000,
    paymentMethod: 'jazzcash',
    payerName: 'Large Test',
    payerEmail: 'large@test.com',
    mobileNumber: '03002222222',
    cnicLast6: '999999',
    billingAddress: 'Test Address'
  }
};

// ============================================
// 🔑 API ENDPOINTS
// ============================================

export const PAYMENT_API_ENDPOINTS = {
  initiatePayment: '/api/payment-gateway/initiate',
  checkPaymentStatus: '/api/payments/:paymentId',
  getPaymentHistory: '/api/payments/history'
};

// ============================================
// 📝 HELPER FUNCTIONS FOR TESTING
// ============================================

/**
 * Create a test payment request
 * @param {string} paymentMethod - 'jazzcash', 'easypaisa', or 'bank'
 * @param {number} amount - Amount in PKR
 * @returns {object} Payment request object
 */
export function createTestPaymentRequest(paymentMethod = 'jazzcash', amount = 1499) {
  const basePayment = {
    amount,
    paymentMethod,
    payerName: `Test User ${Date.now()}`,
    payerEmail: `test${Date.now()}@shirtify.com`,
    billingAddress: 'Test Address, Test City'
  };

  if (paymentMethod === 'jazzcash') {
    return {
      ...basePayment,
      mobileNumber: '03001234567',
      cnicLast6: '123456'
    };
  } else if (paymentMethod === 'easypaisa') {
    return {
      ...basePayment,
      mobileNumber: '03001234567'
    };
  } else if (paymentMethod === 'bank') {
    return {
      ...basePayment,
      bankName: 'Test Bank',
      accountTitle: 'Test Account',
      ibanOrAccountNumber: 'PK12TEST0000123456789'
    };
  }

  return basePayment;
}

/**
 * Initiate a test payment
 * @param {string} token - JWT auth token
 * @param {object} paymentData - Payment details
 * @returns {Promise<object>} Payment response
 */
export async function initiateTestPayment(token, paymentData) {
  try {
    const response = await fetch('/api/payment-gateway/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error(`Payment failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Payment initiated:', data);
    return data;
  } catch (error) {
    console.error('❌ Payment error:', error);
    throw error;
  }
}

/**
 * Get payment status
 * @param {string} token - JWT auth token
 * @param {string} paymentId - Payment ID
 * @returns {Promise<object>} Payment status
 */
export async function getPaymentStatus(token, paymentId) {
  try {
    const response = await fetch(`/api/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Payment status:', data);
    return data;
  } catch (error) {
    console.error('❌ Status error:', error);
    throw error;
  }
}

/**
 * Run a complete test payment flow
 * @param {string} token - JWT auth token
 * @param {string} paymentMethod - Payment method to test
 * @returns {Promise<void>}
 */
export async function runCompletePaymentTest(token, paymentMethod = 'jazzcash') {
  console.log(`\n🧪 Starting payment test for ${paymentMethod}...\n`);

  try {
    // Step 1: Create payment request
    const paymentData = createTestPaymentRequest(paymentMethod, 1499);
    console.log('📋 Payment Request:', paymentData);

    // Step 2: Initiate payment
    const payment = await initiateTestPayment(token, paymentData);
    console.log('\n✅ Payment Initiated');
    console.log('   Status:', payment.status);
    console.log('   Provider:', payment.provider);
    console.log('   Payment ID:', payment.payment?._id);

    // Step 3: Check status
    if (payment.payment?._id) {
      await new Promise(r => setTimeout(r, 1000));
      const status = await getPaymentStatus(token, payment.payment._id);
      console.log('\n📊 Payment Status:');
      console.log('   Status:', status.paymentStatus);
      console.log('   Amount:', status.amount);
      console.log('   Method:', status.paymentMethod);
    }

    console.log('\n✅ Test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message, '\n');
  }
}

// ============================================
// 🎯 QUICK TEST TEMPLATE
// ============================================

/**
 * Copy this to your browser console for quick testing
 * 
 * Step 1: Get your token from localStorage
 * const token = localStorage.getItem('shirtifyToken');
 * 
 * Step 2: Import and run test
 * import { runCompletePaymentTest } from './path/to/TEST_PAYMENT_CONFIG.js';
 * await runCompletePaymentTest(token, 'jazzcash');
 * 
 * Step 3: Check results in browser console
 */

// ============================================
// 📊 ENVIRONMENT SETUP
// ============================================

/**
 * Verify test credentials are loaded in .env
 * Required for payment tests to work
 */
export function verifyTestEnvironment() {
  const requiredEnvVars = [
    'JAZZCASH_API_URL',
    'JAZZCASH_MERCHANT_ID',
    'JAZZCASH_PASSWORD',
    'JAZZCASH_INTEGERITY_SALT'
  ];

  console.log('🔍 Checking test environment...\n');

  for (const envVar of requiredEnvVars) {
    const isSet = process.env[envVar] ? '✅' : '❌';
    console.log(`${isSet} ${envVar}`);
  }

  console.log('\n💡 Tip: Add these to backend/.env for testing');
}

// ============================================
// 🔄 MIGRATION CHECKLIST
// ============================================

export const MIGRATION_CHECKLIST = {
  development: [
    { step: 1, task: 'Copy test credentials to .env', done: false },
    { step: 2, task: 'Start backend server', done: false },
    { step: 3, task: 'Run payment tests', done: false },
    { step: 4, task: 'Verify MongoDB records', done: false }
  ],

  production: [
    { step: 1, task: 'Get live credentials from JazzCash', done: false },
    { step: 2, task: 'Update production .env file', done: false },
    { step: 3, task: 'Test with minimal amounts', done: false },
    { step: 4, task: 'Verify in merchant dashboard', done: false },
    { step: 5, task: 'Deploy to production', done: false },
    { step: 6, task: 'Monitor first transactions', done: false }
  ]
};

// ============================================
// 📖 USAGE INSTRUCTIONS
// ============================================

/**
 * SETUP:
 * ------
 * 1. Add test credentials to backend/.env (see TEST_PAYMENT_CREDENTIALS.md)
 * 2. Start backend: npm start
 * 3. Start frontend: npm run dev
 * 4. Login to the application
 * 5. Open browser console (F12)
 * 
 * TESTING:
 * --------
 * 6. Import this file:
 *    import { runCompletePaymentTest, TEST_PAYMENTS } from './TEST_PAYMENT_CONFIG.js'
 * 
 * 7. Run test:
 *    const token = localStorage.getItem('shirtifyToken');
 *    await runCompletePaymentTest(token, 'jazzcash');
 * 
 * VERIFYING:
 * ----------
 * 8. Check MongoDB:
 *    db.payments.find().pretty()
 * 
 * 9. Check API logs:
 *    tail -f backend/logs/payment.log
 */

export default {
  TEST_PAYMENT_CREDENTIALS,
  TEST_PAYMENTS,
  PAYMENT_API_ENDPOINTS,
  createTestPaymentRequest,
  initiateTestPayment,
  getPaymentStatus,
  runCompletePaymentTest,
  verifyTestEnvironment,
  MIGRATION_CHECKLIST
};
