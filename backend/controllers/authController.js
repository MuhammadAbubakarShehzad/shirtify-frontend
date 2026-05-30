const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
};

const generateResetToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      type: 'password_reset'
    },
    process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  );
};

const createMailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
};

const sendResetEmail = async (user, resetLink) => {
  const transporter = createMailTransporter();
  if (!transporter) {
    const error = new Error('Email service is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, JWT_RESET_SECRET, and RESET_PASSWORD_PAGE_URL in backend/.env.');
    error.status = 500;
    throw error;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: user.email,
    subject: 'Shirtify Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset your Shirtify password</h2>
        <p>Hello ${user.name},</p>
        <p>Click the button below to reset your password. This link expires in 15 minutes.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#8FD3D6;color:#ffffff;text-decoration:none;border-radius:8px;">
            Reset Password
          </a>
        </p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p>${resetLink}</p>
      </div>
    `
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email is already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashed });

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user)
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user)
    });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    const resetToken = generateResetToken(user);
    const resetPageBaseUrl = process.env.RESET_PASSWORD_PAGE_URL
      || 'http://localhost:5173/frontend/reset-password/reset-password.html';
    const separator = resetPageBaseUrl.includes('?') ? '&' : '?';
    const resetLink = `${resetPageBaseUrl}${separator}token=${encodeURIComponent(resetToken)}`;

    await sendResetEmail(user, resetLink);

    return res.json({
      message: 'Password reset link sent successfully.',
      resetToken
    });
  } catch (error) {
    if (error.code === 'EAUTH') {
      error.status = 500;
      error.message = 'Email login failed. Check SMTP_USER and SMTP_PASS in backend/.env.';
    }

    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Token, password and confirmPassword are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || process.env.JWT_SECRET || 'secret');
    } catch (error) {
      return res.status(400).json({ message: 'Reset link is invalid or expired' });
    }

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    return res.json({
      message: 'Password reset successful.',
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, forgotPassword, resetPassword };
