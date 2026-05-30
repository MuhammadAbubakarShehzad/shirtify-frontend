const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    canvasData: {
        type: Object, // Fabric.js JSON object
        required: true
    },
    previewImage: {
        type: String, // Base64 image
        required: true
    },
    baseProduct: {
        type: String,
        default: 'Classic Cotton Tee'
    },
    price: {
        type: Number,
        default: 2500
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
designSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Design = mongoose.model('Design', designSchema);

module.exports = Design;
