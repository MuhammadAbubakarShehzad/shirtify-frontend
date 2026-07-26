/**
 * seedOrders.js
 * =============
 * Seeds 30–50 test orders into the Shirtify dev database.
 *
 * HOW THE FLOW WORKS (read before running):
 *  1. Script logs in as a test user  →  gets JWT
 *  2. For each order it wants to create it:
 *       a. Adds items to the cart  (POST /api/cart)
 *       b. Checks out the cart     (POST /api/orders)
 *  3. The createOrder controller reads the cart, decrements stock,
 *     clears the cart, and saves the Order document.
 *
 * SAFETY FEATURES:
 *  • Production URI guard  – refuses to run against mongodb+srv / .mongodb.net
 *  • Dry-run mode          – set DRY_RUN=true to print what would happen
 *  • Rate limiting         – configurable delay between orders (default 600 ms)
 *  • Per-order try/catch   – one failure logs and skips, doesn't abort the run
 *  • Tagging               – every order's shippingAddress starts with
 *                            "[TEST_SEED]" so you can bulk-delete later
 *
 * USAGE:
 *   node scripts/seedOrders.js                 # dry run (safe default)
 *   DRY_RUN=false node scripts/seedOrders.js   # actually hits the API
 *
 * CLEANUP (MongoDB shell or Compass):
 *   db.orders.deleteMany({ shippingAddress: /^\[TEST_SEED\]/ })
 *
 * REQUIREMENTS:
 *   npm install axios dotenv
 *   (axios and dotenv are likely already installed in the backend)
 */

'use strict';

const path  = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG = {
  /** Base URL of your running backend */
  API_BASE: process.env.SEED_API_BASE || 'http://localhost:5000',

  /** Credentials of an existing dev user (must already be registered) */
  TEST_EMAIL:    process.env.SEED_EMAIL    || 'testuser@shirtify.dev',
  TEST_PASSWORD: process.env.SEED_PASSWORD || 'TestPassword123!',

  /** How many seeded orders to create */
  ORDER_COUNT: parseInt(process.env.SEED_ORDER_COUNT || '30', 10),

  /** Milliseconds to wait between orders (rate-limiting) */
  DELAY_MS: parseInt(process.env.SEED_DELAY_MS || '600', 10),

  /**
   * Set to false (via env var DRY_RUN=false) to actually hit the API.
   * Any other value (or omitting it) keeps dry-run ON.
   */
  DRY_RUN: (process.env.DRY_RUN || 'true').toLowerCase() !== 'false',

  /** Tag prefix baked into shippingAddress for easy bulk-delete */
  TAG: '[TEST_SEED]',

  /** MongoDB URI — read only to verify we are NOT on production */
  MONGO_URI: process.env.MONGO_URI || '',
};

// ─── Production Guard ─────────────────────────────────────────────────────────

function assertDevDatabase() {
  const uri = CONFIG.MONGO_URI;

  if (!uri) {
    console.warn('⚠  MONGO_URI is not set in .env — cannot verify DB safety. Proceeding anyway.');
    return;
  }

  const productionPatterns = [
    /mongodb\+srv/i,          // Atlas SRV connection string
    /\.mongodb\.net/i,        // Atlas cluster hostname
    /cluster\d+\./i,          // typical Atlas cluster name
  ];

  const devPatterns = [
    /localhost/i,
    /127\.0\.0\.1/,
    /dev/i,
  ];

  const looksLikeProd = productionPatterns.some(re => re.test(uri));
  const looksLikeDev  = devPatterns.some(re => re.test(uri));

  if (looksLikeProd) {
    console.error('\n❌  ABORT: MONGO_URI looks like a production Atlas URI:');
    console.error(`   ${uri}`);
    console.error('   This script will NOT run against production. Exiting.\n');
    process.exit(1);
  }

  if (!looksLikeDev) {
    console.warn('\n⚠  WARNING: MONGO_URI does not clearly look like a local/dev DB:');
    console.warn(`   ${uri}`);
    console.warn('   If this is a production DB, kill this process NOW (Ctrl+C).');
    console.warn('   Sleeping 5 seconds before continuing…\n');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeShippingAddress(tag, index) {
  const streets = [
    'House 12, Street 7, Johar Town',
    'Flat 3B, Defense Phase 5',
    'Plot 22, Gulberg III',
    'Block D, Model Town',
    'Street 9, I-8/2, Islamabad',
    'House 5, F-7/4, Islamabad',
    '45-C, Canal View Housing Society',
    'Room 101, Askari 11',
  ];
  const cities = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];
  return `${tag} Order #${index + 1} — ${randomElement(streets)}, ${randomElement(cities)}, Pakistan`;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function login(email, password) {
  const res = await axios.post(`${CONFIG.API_BASE}/api/auth/login`, { email, password });
  return res.data.token;
}

async function getProducts(token) {
  const res = await axios.get(`${CONFIG.API_BASE}/api/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(res.data) ? res.data : (res.data.products || []);
}

async function clearCart(token) {
  try {
    await axios.delete(`${CONFIG.API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (_) {
    // Cart may already be empty — that is fine
  }
}

async function addToCart(token, productId, quantity) {
  await axios.post(
    `${CONFIG.API_BASE}/api/cart`,
    { productId, quantity },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function createOrder(token, shippingAddress, paymentMethod) {
  const res = await axios.post(
    `${CONFIG.API_BASE}/api/orders`,
    { shippingAddress, paymentMethod },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        Shirtify Order Seeder             ║');
  console.log('╚══════════════════════════════════════════╝\n');

  assertDevDatabase();

  console.log(`Mode        : ${CONFIG.DRY_RUN ? '🟡 DRY RUN (no API calls)' : '🟢 LIVE (will hit API)'}`);
  console.log(`API base    : ${CONFIG.API_BASE}`);
  console.log(`Order count : ${CONFIG.ORDER_COUNT}`);
  console.log(`Delay       : ${CONFIG.DELAY_MS} ms between orders`);
  console.log(`Tag         : ${CONFIG.TAG}\n`);

  if (CONFIG.DRY_RUN) {
    console.log('ℹ  DRY RUN is ON. To actually seed, run:');
    console.log('   DRY_RUN=false node scripts/seedOrders.js\n');
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  let token;
  if (!CONFIG.DRY_RUN) {
    console.log(`🔐 Logging in as ${CONFIG.TEST_EMAIL}…`);
    try {
      token = await login(CONFIG.TEST_EMAIL, CONFIG.TEST_PASSWORD);
      console.log('   ✓ Logged in.\n');
    } catch (err) {
      console.error('❌ Login failed:', err?.response?.data || err.message);
      process.exit(1);
    }
  } else {
    token = 'DRY_RUN_TOKEN';
    console.log('🔐 [DRY RUN] Would log in as', CONFIG.TEST_EMAIL, '\n');
  }

  // ── Fetch products ─────────────────────────────────────────────────────────
  let products = [];
  if (!CONFIG.DRY_RUN) {
    console.log('📦 Fetching products…');
    try {
      products = await getProducts(token);
      products = products.filter(p => p.stock > 0);
      if (products.length === 0) {
        console.error('❌ No in-stock products found. Seed some products first.');
        process.exit(1);
      }
      console.log(`   ✓ Found ${products.length} in-stock product(s).\n`);
    } catch (err) {
      console.error('❌ Failed to fetch products:', err?.response?.data || err.message);
      process.exit(1);
    }
  } else {
    products = [
      { _id: '<PRODUCT_ID_1>', title: 'Classic White Tee',  price: 1500, stock: 50 },
      { _id: '<PRODUCT_ID_2>', title: 'Graphic Hoodie',     price: 3200, stock: 20 },
      { _id: '<PRODUCT_ID_3>', title: 'Polo Shirt (Black)', price: 2100, stock: 35 },
    ];
    console.log('📦 [DRY RUN] Would use products:', products.map(p => p.title).join(', '), '\n');
  }

  // ── Seed loop ──────────────────────────────────────────────────────────────
  const paymentMethods = ['cod', 'jazzcash', 'easypaisa'];
  let created = 0;
  let failed  = 0;

  console.log(`🛒 Starting to seed ${CONFIG.ORDER_COUNT} order(s)…\n`);

  for (let i = 0; i < CONFIG.ORDER_COUNT; i++) {
    // Pick 1–3 distinct random products
    const itemCount = randomInt(1, Math.min(3, products.length));
    const chosenProducts = [];
    const used = new Set();
    while (chosenProducts.length < itemCount) {
      const p = randomElement(products);
      if (!used.has(p._id.toString())) {
        used.add(p._id.toString());
        chosenProducts.push(p);
      }
    }

    const cartItems = chosenProducts.map(p => ({
      productId: p._id,
      quantity:  randomInt(1, Math.min(3, p.stock)),
    }));

    const shippingAddress = makeShippingAddress(CONFIG.TAG, i);
    const paymentMethod   = randomElement(paymentMethods);

    const expectedTotal = chosenProducts.reduce((sum, p, idx) => {
      return sum + p.price * cartItems[idx].quantity;
    }, 0);

    console.log(`  [${String(i + 1).padStart(2, '0')}/${CONFIG.ORDER_COUNT}]`);
    console.log(`       Items   : ${cartItems.map((ci, idx) => `${chosenProducts[idx].title} x${ci.quantity}`).join(', ')}`);
    console.log(`       Total   : Rs ${expectedTotal.toLocaleString()}`);
    console.log(`       Payment : ${paymentMethod}`);
    console.log(`       Address : ${shippingAddress}`);

    if (CONFIG.DRY_RUN) {
      console.log(`       Result  : [DRY RUN — would POST /api/cart then POST /api/orders]\n`);
      created++;
    } else {
      try {
        await clearCart(token);

        for (const ci of cartItems) {
          await addToCart(token, ci.productId, ci.quantity);
        }

        const order = await createOrder(token, shippingAddress, paymentMethod);
        console.log(`       Result  : ✓ Created order ${order._id}\n`);
        created++;
      } catch (err) {
        const msg = err?.response?.data?.message || err.message;
        console.error(`       Result  : ✗ FAILED — ${msg}\n`);
        failed++;
      }

      if (i < CONFIG.ORDER_COUNT - 1) {
        await sleep(CONFIG.DELAY_MS);
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Done!  Created: ${created}   Failed: ${failed}`);
  if (CONFIG.DRY_RUN) {
    console.log('\n📝 Dry run complete. Inspect the output above,');
    console.log("   then run with DRY_RUN=false when you're happy.\n");
  } else {
    console.log('\n🗑  To clean up seeded orders, run in MongoDB shell:');
    console.log('   db.orders.deleteMany({ shippingAddress: /^\\[TEST_SEED\\]/ })\n');
  }
}

main().catch(err => {
  console.error('\n💥 Unexpected error:', err.message);
  process.exit(1);
});
