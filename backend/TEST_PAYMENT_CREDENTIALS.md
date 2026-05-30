# Test Payment Credentials

This document contains test payment credentials for the Shirtify payment system. Use these credentials until you integrate with live payment providers.

## 🧪 Test Credentials

### JazzCash (Primary Payment Gateway)

**Sandbox API Endpoint:**
```
https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/OnlineCheckout
```

**Test Credentials:**
```
Merchant ID:      TESTMERCHANT
Password:         TestPassword123
Integrity Salt:   TestSalt12345
Sub-Merchant ID:  (optional)
Transaction Type: MWALLET
```

**Where to Add:**
Edit `backend/.env` and set:
```env
JAZZCASH_API_URL=https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/OnlineCheckout
JAZZCASH_MERCHANT_ID=TESTMERCHANT
JAZZCASH_PASSWORD=TestPassword123
JAZZCASH_INTEGERITY_SALT=TestSalt12345
JAZZCASH_SUBMERCHANT_ID=
JAZZCASH_TXN_TYPE=MWALLET
```

**Test Payment Details:**
- **Amount:** Any amount (e.g., 1499 PKR for a shirt)
- **Mobile Number:** Any 11-digit number starting with 03 (e.g., 03001234567)
- **CNIC Last 6 Digits:** Any 6 digits (e.g., 123456)
- **Payer Name:** Any name (e.g., "Test User")
- **Email:** Any valid email (e.g., test@example.com)

---

### Easypaisa (Fallback - Mock Mode)

**Current Mode:** Mock (test mode)
**Status:** Enabled for testing without real transactions

**Where to Add:**
Edit `backend/.env` and set:
```env
EASYPAISA_MODE=mock
```

**Test Payment Details:**
- **Amount:** Any amount (e.g., 1499 PKR)
- **Mobile Number:** Any 11-digit number (e.g., 03001234567)
- **Payer Name:** Any name
- **Email:** Any valid email

---

### Bank Transfer (Manual Payment)

**Status:** Always available for testing

**Test Bank Details:**
```
Bank Name:          Test Bank
Account Title:      Shirtify Test Account
IBAN/Account:       PK12ABCD0000123456789
Amount:             Any amount
Reference:          Order Invoice
```

---

## 🔗 How to Use in Frontend

### Example API Call for JazzCash Test Payment:

```javascript
const testPayment = {
  amount: 1499,
  paymentMethod: 'jazzcash',
  payerName: 'Test User',
  payerEmail: 'test@shirtify.com',
  mobileNumber: '03001234567',
  cnicLast6: '123456',
  billingAddress: 'Test Address, Karachi'
};

const response = await fetch('/api/payment-gateway/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(testPayment)
});

const data = await response.json();
console.log('Payment response:', data);
```

---

## 🧪 Test Scenarios

### Scenario 1: Successful Payment
```json
{
  "amount": 1499,
  "paymentMethod": "jazzcash",
  "payerName": "John Doe",
  "payerEmail": "john@example.com",
  "mobileNumber": "03001234567",
  "cnicLast6": "123456"
}
```
**Expected Result:** Payment marked as "success"

### Scenario 2: Easypaisa Mock Payment
```json
{
  "amount": 500,
  "paymentMethod": "easypaisa",
  "payerName": "Jane Smith",
  "payerEmail": "jane@example.com",
  "mobileNumber": "03109876543"
}
```
**Expected Result:** Payment marked as "pending" (mock mode)

### Scenario 3: Bank Transfer
```json
{
  "amount": 2000,
  "paymentMethod": "bank",
  "payerName": "Ahmed Khan",
  "payerEmail": "ahmed@example.com",
  "bankName": "HBL",
  "accountTitle": "Ahmed Khan",
  "ibanOrAccountNumber": "PK12HBLC0000123456789"
}
```
**Expected Result:** Payment marked as "pending" (awaiting manual verification)

---

## 📱 Testing Payment Flow

### Step 1: Add Items to Cart
- Select shirt designs
- Add to cart

### Step 2: Checkout
- Fill order details
- Select payment method

### Step 3: Complete Payment
```bash
# Using curl for JazzCash
curl -X POST http://localhost:5000/api/payment-gateway/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 1499,
    "paymentMethod": "jazzcash",
    "payerName": "Test User",
    "payerEmail": "test@example.com",
    "mobileNumber": "03001234567",
    "cnicLast6": "123456"
  }'
```

### Step 4: Verify Payment
Check MongoDB Payment collection:
```javascript
// In MongoDB
db.payments.find({ paymentMethod: "jazzcash" })
```

---

## 🔄 Migration to Live Credentials

When ready for production:

1. **Contact JazzCash**
   - Website: https://jazzcash.com.pk/merchants/
   - Get live Merchant ID, Password, Integrity Salt
   - Update `.env` with production values

2. **Contact Easypaisa**
   - Website: https://www.easypaisa.com.pk/
   - Get merchant onboarding
   - Change `EASYPAISA_MODE=live` and add credentials

3. **Update .env File**
   ```env
   JAZZCASH_API_URL=https://secure.jazzcash.com.pk/ApplicationAPI/API/2.0/OnlineCheckout
   JAZZCASH_MERCHANT_ID=YOUR_LIVE_MERCHANT_ID
   JAZZCASH_PASSWORD=YOUR_LIVE_PASSWORD
   JAZZCASH_INTEGERITY_SALT=YOUR_LIVE_SALT
   EASYPAISA_MODE=live
   EASYPAISA_MERCHANT_ID=YOUR_LIVE_MERCHANT_ID
   EASYPAISA_API_KEY=YOUR_LIVE_API_KEY
   ```

4. **Test with Live Credentials**
   - Use minimal amounts for testing
   - Verify transactions in your merchant dashboard

5. **Enable in Production**
   - Deploy with live credentials
   - Monitor payment transactions

---

## ✅ Quick Start

### For Local Development:

1. Copy test credentials to `.env`:
```bash
cp backend/.env.example backend/.env
```

2. Ensure credentials are set:
```bash
# Check if .env has test credentials
grep "JAZZCASH_MERCHANT_ID" backend/.env
```

3. Start backend:
```bash
npm start
```

4. Start frontend:
```bash
npm run dev
```

5. Test payment flow with credentials above

---

## 🚨 Important Notes

- ⚠️ **TEST MODE:** These are sandboxed credentials for testing only
- ⚠️ **NO REAL CHARGES:** No real money will be deducted in test mode
- ⚠️ **PRODUCTION:** Never use test credentials in production
- ⚠️ **API ENDPOINT:** The sandbox and production endpoints are different!
- ✅ **SAFE:** You can safely test unlimited times with test credentials

---

## 📞 Support

For issues:
- JazzCash Support: https://jazzcash.com.pk/contact/
- Easypaisa Support: https://www.easypaisa.com.pk/contact/
- Check backend logs: `backend/logs/`
- Check MongoDB: `db.payments.find()`

---

**Last Updated:** May 2026
**Status:** Test Credentials Ready ✅
