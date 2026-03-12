const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  sendManualLowStockAlert,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Multer config – memory storage (Vercel has no persistent filesystem)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024 },   // 4 MB hard cap (Vercel limit is 4.5 MB)
});

// Validation
const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Valid quantity is required'),
];

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin routes
router.post('/', protect, adminMiddleware, upload.single('image'), productValidation, createProduct);
router.put('/:id', protect, adminMiddleware, upload.single('image'), updateProduct);
router.delete('/:id', protect, adminMiddleware, deleteProduct);
router.patch('/:id/stock', protect, adminMiddleware, updateStock);
router.post('/low-stock-alert', protect, adminMiddleware, sendManualLowStockAlert);

module.exports = router;
