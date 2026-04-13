const User = require('../models/User');

const getAllUsers = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const users = await User.find().select('-password');
  res.json(users);
};

module.exports = { getAllUsers };
