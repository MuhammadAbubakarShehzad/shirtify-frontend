const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            unique: true,
        },
        // Support both userId (storefront) and customer object (admin)
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        customer: {
            name: String,
            email: String,
            phone: String,
            address: {
                street: String,
                city: String,
                state: String,
                postalCode: String,
                country: {
                    type: String,
                    default: 'Pakistan',
                },
            },
        },
        // Unified items/products array
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                },
                productId: String, // Fallback for non-Product items
                productName: String,
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                price: {
                    type: Number,
                    required: true,
                },
                size: {
                    type: String,
                    enum: ['S', 'M', 'L', 'XL', 'XXL', 'Universal'],
                },
                color: String,
                design: String, // Custom design URL (storefront feature)
            },
        ],
        // Storefront shipping address (legacy support)
        shippingAddress: {
            fullName: String,
            phoneNumber: String,
            address: String,
            city: String,
            postalCode: String,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        totalPrice: {
            type: Number,
            min: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['bank', 'easypaisa', 'jazzcash', 'cash-on-delivery', 'card', 'bank-transfer'],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'success', 'paid', 'failed'],
            default: 'pending',
        },
        notes: {
            type: String,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
    }
);

// Generate order number before saving
orderSchema.pre('save', async function () {
    if (!this.orderNumber) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;
    }
});

// Calculate total price if not set (for admin compatibility)
orderSchema.pre('save', function () {
    if (!this.totalPrice && this.totalAmount) {
        this.totalPrice = this.totalAmount;
    }
    if (!this.totalAmount && this.totalPrice) {
        this.totalAmount = this.totalPrice;
    }
});

module.exports = mongoose.model('Order', orderSchema);
