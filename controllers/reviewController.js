const { validationResult } = require('express-validator');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Add a product review
// @route   POST /api/reviews
// @access  Private
const addReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { productId, rating, title, comment } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      user: req.user._id,
      product: productId,
    });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    // Only users who have purchased this product can review it.
    const hasPurchased = await Order.exists({
      user: req.user._id,
      'orderItems.product': productId,
      orderStatus: { $ne: 'Cancelled' },
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'Only users who purchased this product can submit a review',
      });
    }

    const review = await Review.create({
      user: req.user._id,
      product: productId,
      rating,
      title,
      comment,
      isVerifiedPurchase: true,
    });

    await review.populate('user', 'name');

    // Recalculate and persist product average rating
    const allReviews = await Review.find({ product: productId });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(productId, {
      'rating.average': parseFloat(avg.toFixed(1)),
      'rating.count': allReviews.length,
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/:productId
// @access  Public
const getProductReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Review.countDocuments({ product: req.params.productId });
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (
      review.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await review.deleteOne();

    // Recalculate product rating after deletion
    const remaining = await Review.find({ product: review.product });
    const avg = remaining.length
      ? remaining.reduce((sum, r) => sum + r.rating, 0) / remaining.length
      : 0;
    await Product.findByIdAndUpdate(review.product, {
      'rating.average': parseFloat(avg.toFixed(1)),
      'rating.count': remaining.length,
    });

    res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if current user can review a product
// @route   GET /api/reviews/can-review/:productId
// @access  Private
const canReviewProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).select('_id isActive');
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const hasExistingReview = await Review.exists({
      user: req.user._id,
      product: productId,
    });

    if (hasExistingReview) {
      return res.status(200).json({
        success: true,
        data: { canReview: false, reason: 'already_reviewed' },
      });
    }

    const hasPurchased = await Order.exists({
      user: req.user._id,
      'orderItems.product': productId,
      orderStatus: { $ne: 'Cancelled' },
    });

    return res.status(200).json({
      success: true,
      data: {
        canReview: !!hasPurchased,
        reason: hasPurchased ? null : 'not_purchased',
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { addReview, getProductReviews, deleteReview, canReviewProduct };
