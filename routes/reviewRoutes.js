const express = require('express');
const { body } = require('express-validator');
const {
  addReview,
  getProductReviews,
  deleteReview,
  canReviewProduct,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const reviewValidation = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required').isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters'),
];

router.post('/', protect, reviewValidation, addReview);
router.get('/can-review/:productId', protect, canReviewProduct);
router.get('/:productId', getProductReviews);
router.delete('/:id', protect, deleteReview);

module.exports = router;
