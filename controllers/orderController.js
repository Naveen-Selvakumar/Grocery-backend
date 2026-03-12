const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const {
  notifyOrderPlaced,
  notifyOrderShipped,
  notifyOrderDelivered,
} = require('../utils/notificationService');
const { sendOrderConfirmationEmail, sendShippingNotificationEmail, sendLowStockAlertEmail } = require('../utils/emailService');

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
const placeOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, razorpayPaymentId, razorpayOrderId, razorpaySignature, isPaid } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: 'Shipping address is required' });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Verify stock and prepare order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${product?.name || item.product}" is no longer available`,
        });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.quantity}`,
        });
      }
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const itemsPrice = cart.totalPrice;
    const taxPrice = parseFloat((itemsPrice * 0.05).toFixed(2)); // 5% tax
    const shippingPrice = itemsPrice > 500 ? 0 : 40; // Free shipping above ₹500
    const totalPrice = parseFloat((itemsPrice + taxPrice + shippingPrice).toFixed(2));

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid: isPaid || false,
      paidAt: isPaid ? Date.now() : undefined,
      paymentResult: razorpayPaymentId ? {
        id:          razorpayPaymentId,
        status:      'paid',
        updateTime:  new Date().toISOString(),
      } : undefined,
      statusHistory: [{ status: 'Pending', note: 'Order placed successfully' }],
    });

    // Deduct stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { quantity: -item.quantity, sold: item.quantity },
      });
    }

    // Check for low stock after deduction and alert admin
    const updatedProducts = await Product.find({
      _id: { $in: cart.items.map(i => i.product._id) },
      quantity: { $lte: 20 },
    }).select('name quantity price image');
    if (updatedProducts.length > 0) {
      sendLowStockAlertEmail(updatedProducts).catch(err => console.error('[Email] Low stock alert failed:', err.message));
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Send notification
    notifyOrderPlaced(req.user._id, order._id);

    // Populate order items for email
    const populatedOrder = await Order.findById(order._id);
    // Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail(req.user, populatedOrder).catch(err => console.error('[Email] Order confirmation failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Order.countDocuments({ user: req.user._id });
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('orderItems.product', 'name image');

    res.status(200).json({
      success: true,
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Allow admin or the order owner
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin
// @access  Private/Admin
const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const query = status ? { orderStatus: status } : {};
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || '' });

    if (status === 'Delivered') {
      order.deliveredAt = Date.now();
      order.isPaid = true; // COD is paid on delivery; online payments were pre-paid
      if (!order.paidAt) order.paidAt = Date.now();
      notifyOrderDelivered(order.user, order._id);
    }

    if (status === 'Shipped') {
      notifyOrderShipped(order.user, order._id);
      // Fetch user for email
      const user = await User.findById(order.user).select('name email');
      if (user) sendShippingNotificationEmail(user, order).catch(err => console.error('[Email] Shipping notification failed:', err.message));
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
