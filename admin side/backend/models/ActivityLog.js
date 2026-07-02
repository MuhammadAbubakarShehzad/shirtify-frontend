const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['order', 'product', 'user', 'system']
    },
    message: {
        type: String,
        required: true
    },
    user: {
        type: String,
        default: 'System'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    city: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema, 'activity_logs');

const logActivity = async (type, message, userId) => {
    try {
        let userName = 'System';
        let userCity = '';
        
        if (userId) {
            const User = mongoose.model('User');
            const user = await User.findById(userId);
            if (user) {
                userName = user.name || user.email || 'User';
                if (user.address && user.address.city) {
                    userCity = user.address.city;
                }
            }
        }
        
        await ActivityLog.create({
            type,
            message,
            user: userName,
            userId: userId || null,
            city: userCity
        });
    } catch (err) {
        console.error('Error logging activity:', err);
    }
};

module.exports = {
    ActivityLog,
    logActivity
};
