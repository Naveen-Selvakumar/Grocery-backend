require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// ─── Security & Utility Middleware ────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Handle preflight OPTIONS requests for all routes
app.options('*', cors());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Root & Health Check ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Grocery Store API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Grocery Store API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/chat', chatRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server (local only — Vercel uses module.exports) ──────────────────
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Smart Grocery Store Backend running in ${process.env.NODE_ENV} mode`);
    console.log(`📡 Server URL: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
