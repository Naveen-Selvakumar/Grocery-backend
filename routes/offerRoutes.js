const express = require('express');
const { getOfferCustomers, sendOfferToUsers } = require('../controllers/offerController');
const { protect } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/customers', protect, adminMiddleware, getOfferCustomers);
router.post('/send',     protect, adminMiddleware, sendOfferToUsers);

module.exports = router;
