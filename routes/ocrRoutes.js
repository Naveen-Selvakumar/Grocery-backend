const express = require('express');
const multer = require('multer');
const path = require('path');
const { scanBill } = require('../controllers/ocrController');
const detectText = require('../services/visionService');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Memory storage — Vercel has no persistent filesystem
const storage = multer.memoryStorage();

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

// Public endpoint: POST /api/ocr/scan — used by the React frontend
router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }
    const extractedText = await detectText(req.file.buffer);
    res.json({ success: true, extractedText });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
