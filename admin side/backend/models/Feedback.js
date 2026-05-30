const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
  purpose: {
    type: String,
    enum: ["bug-report", "product-quality", "delivery-issue", "general-feedback", "other"],
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 6,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: [/.+\@.+\..+/, "Please enter a valid email"]
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  screenshot: {
    type: String, // Base64 encoded image or URL
    default: null
  },
  adminResponse: {
    type: String,
    default: null
  },
  responseDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Feedback", FeedbackSchema);
