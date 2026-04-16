const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// Swagger integration
const swaggerSetup = require('./config/swagger');
app.use(morgan('dev'));

connectDB();


app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/customizations', require('./routes/customizationRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/mockshirts', require('./routes/mockShirtRoutes'));

const { protect } = require('./middleware/auth');
app.get('/api/auth/me', protect, (req, res) => {
  res.json(req.user);
});

app.get('/', (req, res) => {
  res.json({ status: 'Shirtify backend running' });
});

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
