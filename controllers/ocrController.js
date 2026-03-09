const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

/**
 * Common grocery keywords to help filter recognized text
 */
const GROCERY_KEYWORDS = [
  'milk', 'bread', 'eggs', 'butter', 'cheese', 'rice', 'wheat', 'flour',
  'sugar', 'salt', 'oil', 'water', 'juice', 'coffee', 'tea',  'soap',
  'potato', 'onion', 'tomato', 'apple', 'banana', 'mango', 'lemon',
  'chicken', 'fish', 'mutton', 'paneer', 'curd', 'yogurt', 'ghee',
  'pulses', 'dal', 'lentil', 'biscuit', 'chips', 'noodles', 'pasta',
  'shampoo', 'detergent', 'powder', 'cream', 'gel', 'sauce', 'ketchup',
  'vinegar', 'honey', 'jam', 'pickle', 'masala', 'spice', 'pepper',
  'cumin', 'coriander', 'turmeric', 'chilli', 'garam',
];

/**
 * Parse OCR text and extract likely grocery items
 * @param {string} text - Raw OCR text
 * @returns {string[]} - Array of detected grocery items
 */
const extractGroceryItems = (text) => {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  const items = [];

  lines.forEach((line) => {
    // Remove common bill noise (amounts, special characters, short tokens)
    const cleaned = line
      .replace(/[\$\₹\€\£\d\.\,\:\-\|]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .toLowerCase();

    if (cleaned.length < 3) return;

    // Check if line contains a known grocery keyword
    const isGrocery = GROCERY_KEYWORDS.some((keyword) =>
      cleaned.includes(keyword)
    );

    // Also accept lines that look like product names (2-5 words, mostly alpha)
    const wordCount = cleaned.split(' ').filter((w) => w.length > 2).length;
    const isAlphaLine = /^[a-z\s]+$/.test(cleaned);

    if (isGrocery || (wordCount >= 1 && wordCount <= 6 && isAlphaLine)) {
      const formatted = cleaned
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .trim();

      if (formatted.length > 2 && !items.includes(formatted)) {
        items.push(formatted);
      }
    }
  });

  return items;
};

// @desc    Scan grocery bill using OCR
// @route   POST /api/ocr/scan-bill
// @access  Private
const scanBill = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Bill image is required' });
    }

    const imagePath = path.resolve(req.file.path);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(400).json({ success: false, message: 'Uploaded file not found' });
    }

    console.log(`[OCR] Processing image: ${imagePath}`);

    // Run Tesseract OCR
    const { data } = await Tesseract.recognize(imagePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${(m.progress * 100).toFixed(0)}%`);
        }
      },
    });

    const rawText = data.text;
    const detectedItems = extractGroceryItems(rawText);

    // Clean up uploaded file after processing
    fs.unlink(imagePath, (err) => {
      if (err) console.error('[OCR] Failed to delete temp file:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Bill scanned successfully',
      data: {
        rawText: rawText.trim(),
        detectedItems,
        itemCount: detectedItems.length,
        confidence: parseFloat(data.confidence?.toFixed(2) || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { scanBill };
