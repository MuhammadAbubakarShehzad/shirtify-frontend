const Feedback = require('../models/Feedback');

const postFeedback = async (req, res) => {
  const { name, email, message, rating } = req.body;

  if (!message) return res.status(400).json({ message: 'Message is required' });

  const feedback = await Feedback.create({
    user: req.user ? req.user._id : undefined,
    name,
    email,
    message,
    rating
  });

  res.status(201).json(feedback);
};

const getFeedbacks = async (req, res) => {
  const feedbacks = await Feedback.find().sort({ createdAt: -1 }).populate('user', 'name email');
  res.json(feedbacks);
};

module.exports = { postFeedback, getFeedbacks };
