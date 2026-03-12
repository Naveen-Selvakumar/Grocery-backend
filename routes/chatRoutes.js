const express = require('express');
const router = express.Router();
const { chat, optionalAuth } = require('../controllers/chatController');

// POST /api/chat  – optionalAuth so the controller can access req.user when logged in
router.post('/', optionalAuth, chat);

module.exports = router;
