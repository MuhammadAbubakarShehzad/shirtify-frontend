const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'shirtify-demo-secret';

// ──────────────────────────────────────────────────────────────
//  Helper: generate JWT token
// ──────────────────────────────────────────────────────────────
const generateToken = (user) =>
    jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

// ──────────────────────────────────────────────────────────────
//  Helper: verify JWT token (middleware-lite)
// ──────────────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login with email + password — queries real MongoDB User collection
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        // Find user in DB (select password field explicitly — it's excluded by default)
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({ success: false, error: 'Account has been deactivated' });
        }

        // Verify password using the model method (bcrypt compare)
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        // Only allow admin role into the admin dashboard
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            data: {
                _id:   user._id,
                name:  user.name,
                email: user.email,
                role:  user.role,
                token,
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new admin user (admin only in production)
 * @access  Public (restrict in production)
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role = 'admin' } = req.body;

        // Check if user already exists
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }

        const user = new User({ name, email, password, role });
        await user.save();

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            data: {
                _id:   user._id,
                name:  user.name,
                email: user.email,
                role:  user.role,
                token,
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user profile
 * @access  Private (requires token)
 */
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        res.json({
            success: true,
            data: {
                _id:   user._id,
                name:  user.name,
                email: user.email,
                role:  user.role,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (customers from storefront + admins)
 * @access  Private (requires token)
 */
router.get('/users', verifyToken, async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
