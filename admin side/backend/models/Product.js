const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            maxlength: [100, 'Product name cannot exceed 100 characters'],
        },
        price: {
            type: Number,
            required: [true, 'Product price is required'],
            min: [0, 'Price cannot be negative'],
        },
        category: {
            type: String,
            required: [true, 'Product category is required'],
            enum: ['Casual', 'Formal', 'Sports', 'Graphic', 'Premium', 'Minimalist', 'Streetwear'],
            default: 'Casual',
        },
        sizes: {
            type: [String],
            enum: ['S', 'M', 'L', 'XL', 'XXL'],
            default: ['M', 'L', 'XL'],
        },
        colors: {
            type: [String],
            default: ['Black', 'White'],
        },
        stock: {
            type: Number,
            required: true,
            min: [0, 'Stock cannot be negative'],
            default: 0,
        },
        stockStatus: {
            type: String,
            enum: ['in-stock', 'out-of-stock', 'low-stock'],
            default: function () {
                if (this.stock === 0) return 'out-of-stock';
                if (this.stock < 10) return 'low-stock';
                return 'in-stock';
            },
        },
        image: {
            type: String,
            default: 'https://via.placeholder.com/300x300?text=Product+Image',
        },
        sales: {
            type: Number,
            default: 0,
            min: 0,
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        featured: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Update stock status before saving
productSchema.pre('save', function () {
    if (this.stock === 0) {
        this.stockStatus = 'out-of-stock';
    } else if (this.stock < 10) {
        this.stockStatus = 'low-stock';
    } else {
        this.stockStatus = 'in-stock';
    }
});

// Virtual for formatted price
productSchema.virtual('formattedPrice').get(function () {
    return `Rs ${this.price.toLocaleString()}`;
});

module.exports = mongoose.model('Product', productSchema);
