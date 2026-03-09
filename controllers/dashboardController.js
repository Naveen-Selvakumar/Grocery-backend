const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get admin dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    // Run all queries in parallel
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      totalCategories,
      revenueResult,
      ordersByStatus,
      topProducts,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Order.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: true }),

      // Total revenue from delivered/completed orders
      Order.aggregate([
        { $match: { orderStatus: { $in: ['Delivered'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
      ]),

      // Orders grouped by status
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      ]),

      // Top 5 selling products
      Product.find({ isActive: true })
        .sort({ sold: -1 })
        .limit(5)
        .select('name image price sold rating')
        .populate('category', 'name'),

      // Recent 5 orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .select('totalPrice orderStatus createdAt user'),

      // Products with stock <= 10
      Product.find({ isActive: true, quantity: { $lte: 10 } })
        .select('name quantity price')
        .sort({ quantity: 1 })
        .limit(10),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Format order status breakdown
    const statusBreakdown = {};
    ordersByStatus.forEach((item) => {
      statusBreakdown[item._id] = item.count;
    });

    // Monthly revenue for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          orderStatus: 'Delivered',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalOrders,
          totalProducts,
          totalCategories,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        },
        orderStatusBreakdown: statusBreakdown,
        topSellingProducts: topProducts,
        recentOrders,
        lowStockProducts,
        monthlyRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
