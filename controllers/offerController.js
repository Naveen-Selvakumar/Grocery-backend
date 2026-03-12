const User  = require('../models/User');
const Order = require('../models/Order');
const { sendOfferEmail } = require('../utils/emailService');

// @desc    List all customers with order stats (for the offer picker)
// @route   GET /api/offers/customers
// @access  Private/Admin
const getOfferCustomers = async (req, res, next) => {
  try {
    // All active customers
    const users = await User.find({ isActive: true, role: 'user' })
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (!users.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Aggregate each user's order stats
    const stats = await Order.aggregate([
      { $match: { user: { $in: users.map(u => u._id) } } },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent:  { $sum: '$totalPrice' },
          lastOrder:   { $max: '$createdAt' },
        },
      },
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[s._id.toString()] = s; });

    // Merge stats into users and rank by totalSpent
    const enriched = users.map(u => ({
      ...u,
      totalOrders: statsMap[u._id.toString()]?.totalOrders ?? 0,
      totalSpent:  parseFloat((statsMap[u._id.toString()]?.totalSpent ?? 0).toFixed(2)),
      lastOrder:   statsMap[u._id.toString()]?.lastOrder ?? null,
    }));

    // Sort by totalSpent desc so top customers appear first
    enriched.sort((a, b) => b.totalSpent - a.totalSpent);

    // Mark top 3 spenders
    enriched.slice(0, 3).forEach((u, i) => { u.topRank = i + 1; });

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

// @desc    Send discount/offer email to selected (or all) users
// @route   POST /api/offers/send
// @access  Private/Admin
const sendOfferToUsers = async (req, res, next) => {
  try {
    const { title, description, code, discount, expiryDate, userIds } = req.body;

    if (!title || !description || !code || !discount) {
      return res.status(400).json({ success: false, message: 'title, description, code, and discount are required' });
    }

    if (isNaN(discount) || discount < 1 || discount > 100) {
      return res.status(400).json({ success: false, message: 'discount must be a number between 1 and 100' });
    }

    // If userIds provided, send only to those; otherwise send to all active users
    const query = { isActive: true, role: 'user' };
    if (Array.isArray(userIds) && userIds.length > 0) {
      query._id = { $in: userIds };
    }

    const users = await User.find(query).select('name email');
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'No matching users found' });
    }

    let sent = 0, failed = 0;
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
      message: `Offer email sent to ${sent} customer${sent !== 1 ? 's' : ''}${failed ? `, ${failed} failed` : ''}.`,
      data: { sent, failed, total: users.length },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOfferCustomers, sendOfferToUsers };
