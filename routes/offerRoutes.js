const express = require('express');
const { sendOfferToAllUsers } = require('../controllers/offerController');
const { protect } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');

const router = express.Router();

// Admin: broadcast offer/discount email to all users
router.post('/send', protect, adminMiddleware, sendOfferToAllUsers);

module.exports = router;
