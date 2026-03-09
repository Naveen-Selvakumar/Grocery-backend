const express = require('express');
const multer = require('multer');
const path = require('path');
const { scanBill } = require('../controllers/ocrController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Multer config for bill upload (temp storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/productImages/');
  },
  filename: (req, file, cb) => {
    cb(null, `bill-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|bmp|tiff|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for bill scanning'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

router.post('/scan-bill', protect, upload.single('bill'), scanBill);

module.exports = router;
