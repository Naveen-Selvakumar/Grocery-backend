const express = require('express');
const { body } = require('express-validator');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/productImages/'),
  filename: (req, file, cb) => {
    cb(null, `category-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
];

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', protect, adminMiddleware, upload.single('image'), categoryValidation, createCategory);
router.put('/:id', protect, adminMiddleware, upload.single('image'), updateCategory);
router.delete('/:id', protect, adminMiddleware, deleteCategory);

module.exports = router;
