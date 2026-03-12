const User = require('../models/User');
const { sendOfferEmail } = require('../utils/emailService');

// @desc    Send discount/offer email to all active users
// @route   POST /api/offers/send
// @access  Private/Admin
const sendOfferToAllUsers = async (req, res, next) => {
  try {
    const { title, description, code, discount, expiryDate } = req.body;

    if (!title || !description || !code || !discount) {
      return res.status(400).json({ success: false, message: 'title, description, code, and discount are required' });
    }

    if (isNaN(discount) || discount < 1 || discount > 100) {
      return res.status(400).json({ success: false, message: 'discount must be a number between 1 and 100' });
    }

    const users = await User.find({ isActive: true, role: 'user' }).select('name email');
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'No active users found' });
    }

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await sendOfferEmail(user, { title, description, code, discount, expiryDate });
        sent++;
      } catch (err) {
        console.error(`[Email] Offer failed for ${user.email}:`, err.message);
        failed++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Offer email sent to ${sent} user(s)${failed ? `, ${failed} failed` : ''}.`,
      data: { sent, failed, total: users.length },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOfferToAllUsers };
