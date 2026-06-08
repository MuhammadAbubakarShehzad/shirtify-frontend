const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// Swagger integration
const swaggerSetup = require('./config/swagger');
app.use(morgan('dev'));

const ensureDefaultAdmin = async () => {
  const adminEmail = 'admin@shirtify.pk';
  const adminPassword = 'admin123';

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log('Default admin account already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await User.create({
    name: 'Admin Balaj',
    email: adminEmail,
    password: hashedPassword,
    role: 'admin'
  });

  console.log('Default admin account created for', adminEmail);
};

connectDB()
  .then(ensureDefaultAdmin)
  .catch((error) => {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  });

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/customizations', require('./routes/customizationRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/payment-gateway', require('./routes/paymentGatewayRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/mockshirts', require('./routes/mockShirtRoutes'));

const { protect } = require('./middleware/auth');
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSafe'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/auth/me', protect, (req, res) => {
  res.json(req.user);
});

app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      return res.status(412).json({ message: 'HF_TOKEN not configured on server' });
    }

    console.log('[AI Gen Backend] Generating design via Hugging Face for prompt:', prompt);
    const response = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Hugging Face API returned ${response.status}: ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (err) {
    console.error('[AI Gen Backend] Error:', err.message);
    res.status(500).json({ message: err.message || 'Hugging Face generation failed' });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Shirtify backend running' });
});

// Mount admin-side app AFTER user routes so admin 404 middleware does not swallow user endpoints.
try {
  const adminApp = require('../admin side/backend/server');
  app.use(adminApp);
  console.log('✅ Admin side mounted into main backend');
} catch (e) {
  console.warn('⚠️  Admin side not mounted:', e.message);
}

// Initialize Swagger (must be before 404 handler)
swaggerSetup(app);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
