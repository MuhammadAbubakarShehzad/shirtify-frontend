const express = require('express');
const router = express.Router();
const { ActivityLog } = require('../models/ActivityLog');
const { verifyToken } = require('./authRoutes');

/**
 * @route   GET /api/activity
 * @desc    Get the last 20 activity logs sorted descending
 * @access  Admin
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const logs = await ActivityLog.find({})
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
