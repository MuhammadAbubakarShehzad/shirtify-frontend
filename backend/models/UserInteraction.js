const mongoose = require('mongoose');

const userInteractionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    productId: {
        type: String,
        required: true,
        index: true
    },
    interactionType: {
        type: String,
        enum: ['view', 'cart', 'purchase'],
        required: true
    },
    score: {
        type: Number,
        required: true,
        default: 1
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Calculate weight scores based on interaction type before saving
userInteractionSchema.pre('save', function (next) {
    if (this.interactionType === 'view') {
        this.score = 1;
    } else if (this.interactionType === 'cart') {
        this.score = 3;
    } else if (this.interactionType === 'purchase') {
        this.score = 5;
    }
    next();
});

module.exports = mongoose.model('UserInteraction', userInteractionSchema);
