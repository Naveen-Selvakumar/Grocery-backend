// ─── Rule-Based Chatbot Controller ────────────────────────────────────────────
// Matches user messages against grocery-store keywords and returns helpful replies.
// When the user is authenticated (via optionalAuth), user-specific intents fetch
// live data from the database and return personalised responses.

const jwt   = require('jsonwebtoken');
const User  = require('../models/User');
const Order = require('../models/Order');

const rules = [
  // ── Greetings ──────────────────────────────────────────────────────────────
  {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy'],
    response: "👋 Hello! Welcome to Arunachalam Grocery Store. How can I help you today?\n\nYou can ask me about:\n• 🛒 Products & Categories\n• 📦 Orders & Tracking\n• 🛍️ Cart & Checkout\n• ❤️ Wishlist\n• 💳 Payments\n• 🔄 Returns & Refunds",
  },

  // ── Products ───────────────────────────────────────────────────────────────
  {
    patterns: ['product', 'products', 'item', 'items', 'buy', 'purchase', 'shop', 'browse', 'search'],
    response: "🛒 You can browse all our products on the **Products** page.\n\n• Use the search bar to find specific items\n• Filter by category (Fruits, Vegetables, Dairy, etc.)\n• Sort by price, rating, or newest\n\nNeed help finding a specific product? Just type its name!",
  },
  {
    patterns: ['fruit', 'fruits', 'vegetable', 'vegetables', 'dairy', 'milk', 'bread', 'meat', 'snack', 'snacks', 'beverage', 'drink'],
    response: "🥦 We carry a wide range of fresh groceries! Head to the **Products** page and use the category filter to find what you're looking for.\n\nCategories include: Fruits, Vegetables, Dairy, Bakery, Meat & Seafood, Snacks, and Beverages.",
  },

  // ── Cart ───────────────────────────────────────────────────────────────────
  {
    patterns: ['cart', 'add to cart', 'basket', 'shopping bag'],
    response: "🛍️ **Cart Tips:**\n\n• Click **Add to Cart** on any product to add it\n• View your cart by clicking the cart icon in the navbar\n• Update quantities directly in the cart\n• Remove items using the trash icon\n\nYour cart is saved while you're logged in!",
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  {
    patterns: ['order', 'orders', 'my order', 'track', 'tracking', 'where is my'],
    response: "📦 **Order Information:**\n\n• View all your orders at **My Account → Orders**\n• Each order shows current status: Pending → Processing → Shipped → Delivered\n• You'll receive updates as your order progresses\n\nOrder statuses:\n🟡 Pending – received\n🔵 Processing – being prepared\n🚚 Shipped – on the way\n✅ Delivered – completed",
  },
  {
    patterns: ['cancel', 'cancellation', 'cancel order'],
    response: "❌ **Cancelling an Order:**\n\nYou can cancel an order that is still in **Pending** status.\n\n1. Go to **My Orders**\n2. Find the order you want to cancel\n3. Click **Cancel Order**\n\nOnce an order is shipped, it cannot be cancelled. Contact support for assistance.",
  },

  // ── Checkout ───────────────────────────────────────────────────────────────
  {
    patterns: ['checkout', 'check out', 'place order', 'proceed'],
    response: "💳 **How to Checkout:**\n\n1. Add items to your cart\n2. Click **Proceed to Checkout**\n3. Enter your delivery address\n4. Choose your payment method\n5. Review and place your order\n\n✅ You need to be logged in to checkout.",
  },

  // ── Payment ────────────────────────────────────────────────────────────────
  {
    patterns: ['payment', 'pay', 'payment method', 'credit card', 'debit card', 'upi', 'cod', 'cash on delivery', 'razorpay'],
    response: "💳 **Payment Methods We Accept:**\n\n• 💳 Credit / Debit Card\n• 📱 UPI (via Razorpay)\n• 🏦 Net Banking\n• 💵 Cash on Delivery (COD)\n\nAll online payments are secured via **Razorpay**. Your card details are never stored on our servers.",
  },

  // ── Wishlist ───────────────────────────────────────────────────────────────
  {
    patterns: ['wishlist', 'wish list', 'save', 'favourite', 'favorite', 'saved items'],
    response: "❤️ **Wishlist:**\n\n• Click the ❤️ heart icon on any product to save it\n• View your saved items at **My Account → Wishlist**\n• Easily move items from Wishlist to Cart\n\nYou must be logged in to use the Wishlist feature.",
  },

  // ── Account / Login / Register ─────────────────────────────────────────────
  {
    patterns: ['login', 'log in', 'sign in', 'signin'],
    response: "🔐 **How to Login:**\n\n1. Click **Login** in the top navigation bar\n2. Enter your registered email and password\n3. Click **Sign In**\n\nForgot your password? Use the *Forgot Password* link on the login page.",
  },
  {
    patterns: ['register', 'sign up', 'signup', 'create account', 'new account'],
    response: "📝 **Creating an Account:**\n\n1. Click **Register** in the navigation bar\n2. Fill in your name, email, and password\n3. Click **Create Account**\n\nRegistration is free and only takes a minute! 🎉",
  },
  {
    patterns: ['account', 'profile', 'my account', 'settings'],
    response: "👤 **Your Account:**\n\nOnce logged in, you can:\n• View and edit your profile\n• Check your order history\n• Manage your wishlist\n• Update your address\n\nLook for the user icon in the top-right corner of the navbar.",
  },

  // ── Delivery & Shipping ────────────────────────────────────────────────────
  {
    patterns: ['delivery', 'shipping', 'deliver', 'ship', 'how long', 'when will'],
    response: "🚚 **Delivery Information:**\n\n• 🏙️ Same-city delivery: **1–2 business days**\n• 🌆 Nearby cities: **2–4 business days**\n• 🗺️ Other locations: **4–7 business days**\n\nFree delivery on orders above ₹500!\n\nYou can track your order status in **My Orders**.",
  },

  // ── Returns & Refunds ──────────────────────────────────────────────────────
  {
    patterns: ['return', 'returns', 'refund', 'refunds', 'exchange', 'damaged', 'wrong item'],
    response: "🔄 **Returns & Refunds Policy:**\n\n• Fresh produce: Report within **24 hours** of delivery\n• Packaged goods: Return within **7 days**\n• Damaged/wrong items: Full refund or replacement\n\n**How to request a return:**\n1. Go to **My Orders**\n2. Select the order\n3. Click **Request Return**\n\nRefunds are processed within 5–7 business days.",
  },

  // ── Offers & Discounts ─────────────────────────────────────────────────────
  {
    patterns: ['offer', 'offers', 'discount', 'discounts', 'coupon', 'promo', 'deal', 'sale'],
    response: "🎉 **Offers & Discounts:**\n\n• Check the **Home** page for current deals\n• Look for products with sale badges on the Products page\n• New users get a special first-order discount\n\nStay tuned — we add new offers weekly! 🛒",
  },

  // ── OCR Scanner ────────────────────────────────────────────────────────────
  {
    patterns: ['ocr', 'scan', 'scanner', 'barcode', 'label', 'image', 'photo'],
    response: "📷 **OCR Scanner Feature:**\n\nOur smart OCR Scanner lets you scan product labels or barcodes to:\n• Instantly identify products\n• Add them directly to your cart\n• Get nutritional information\n\nFind it in the menu: **OCR Scanner** 📸",
  },

  // ── Contact / Support ──────────────────────────────────────────────────────
  {
    patterns: ['contact', 'support', 'help', 'customer service', 'phone', 'email', 'complaint'],
    response: "📞 **Contact & Support:**\n\n• 📧 Email: support@smartgrocery.com\n• 📱 Phone: +91 98765 43210\n• ⏰ Hours: Mon–Sat, 9 AM – 6 PM\n\nFor urgent issues, use this chat or email us and we'll get back to you within 24 hours.",
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  {
    patterns: ['admin', 'dashboard', 'manage products', 'manage orders'],
    response: "🔧 **Admin Panel:**\n\nThe admin dashboard is available to store administrators only.\n\nAdmins can:\n• Manage products & categories\n• Process and update orders\n• View customer list\n• See sales analytics\n\nLog in with admin credentials to access **/admin/dashboard**.",
  },

  // ── Thanks / Goodbye ───────────────────────────────────────────────────────
  {
    patterns: ['thank', 'thanks', 'thank you', 'thankyou', 'great', 'awesome', 'perfect'],
    response: "😊 You're welcome! Happy to help. Enjoy your shopping at Arunachalam Grocery Store! 🛒",
  },
  {
    patterns: ['bye', 'goodbye', 'see you', 'later', 'exit'],
    response: "👋 Goodbye! Come back soon. Happy shopping! 🛒🥦",
  },
];

// ─── Match helper ─────────────────────────────────────────────────────────────
function getBotResponse(message) {
  const lower = message.toLowerCase().trim();

  for (const rule of rules) {
    if (rule.patterns.some(p => lower.includes(p))) {
      return rule.response;
    }
  }

  return "🤔 I'm not sure about that. Here are some things I can help with:\n\n• 🛒 **Products** – browsing, searching\n• 📦 **Orders** – tracking, cancellation\n• 💳 **Payments** – methods, security\n• 🚚 **Delivery** – timelines, shipping\n• 🔄 **Returns** – policy, refunds\n• ❤️ **Wishlist & Cart** – managing items\n\nTry asking about any of these, or type **help** for a full list!";
}

// ─── Status icons ─────────────────────────────────────────────────────────────
const STATUS_ICON = {
  Pending:    '🟡',
  Processing: '🔵',
  Shipped:    '🚚',
  Delivered:  '✅',
  Cancelled:  '❌',
};

// ─── Optional Auth Middleware ─────────────────────────────────────────────────
// Populates req.user if a valid Bearer token is present; never blocks the request.
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token   = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user      = await User.findById(decoded.id).select('-password');
    } catch {}
  }
  next();
};

// ─── Controller ───────────────────────────────────────────────────────────────
const chat = async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  if (message.trim().length > 500) {
    return res.status(400).json({ success: false, error: 'Message too long (max 500 characters)' });
  }

  const lower = message.toLowerCase().trim();
  const user  = req.user; // set by optionalAuth if token valid

  // ── Personalised / live-data intents (only when authenticated) ──────────────
  if (user) {

    // ── Greeting with user's name ─────────────────────────────────────────────
    if (/^\s*(hello|hi+|hey|good\s+(morning|afternoon|evening)|howdy)\b/.test(lower)) {
      return res.json({
        success: true,
        reply:
          `👋 Hello **${user.name}**! Welcome back to Arunachalam Grocery Store!\n\n` +
          `Since you're logged in, I can also:\n` +
          `• 📦 Show your orders – ask **"my orders"** or **"track order"**\n` +
          `• 👤 Show your profile – ask **"my profile"**\n` +
          `• 💰 Show what you spent – ask **"my spending"**\n\n` +
          `What can I help you with today?`,
      });
    }

    // ── Order tracking / history ──────────────────────────────────────────────
    if (/my order|track order|order status|order history|where is my|my purchase|recent order/.test(lower)) {
      try {
        const orders = await Order.find({ user: user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        if (orders.length === 0) {
          return res.json({
            success: true,
            reply:
              `📦 Hi **${user.name}**, you haven't placed any orders yet.\n\n` +
              `Browse our products and place your first order today! 🛒`,
          });
        }

        let reply = `📦 **Your Recent Orders, ${user.name}:**\n\n`;
        orders.forEach((order, i) => {
          const id   = order._id.toString().slice(-8).toUpperCase();
          const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          });
          const icon  = STATUS_ICON[order.orderStatus] || '📦';
          const items = order.orderItems || [];
          const names = items.slice(0, 2).map(it => it.name).join(', ');
          const more  = items.length > 2 ? ` +${items.length - 2} more` : '';

          reply += `**${i + 1}. Order #${id}**\n`;
          reply += `   📅 ${date}  ${icon} **${order.orderStatus}**\n`;
          reply += `   🛍️ ${names}${more}\n`;
          reply += `   💰 ₹${(order.totalPrice || 0).toFixed(2)}\n`;
          if (order.orderStatus === 'Delivered' && order.deliveredAt) {
            reply += `   ✅ Delivered on ${new Date(order.deliveredAt).toLocaleDateString('en-IN')}\n`;
          }
          reply += '\n';
        });
        reply += `Go to **My Orders** page to view full details and manage your orders.`;

        return res.json({ success: true, reply });
      } catch {
        // fall through to static rule
      }
    }

    // ── Profile / account details ─────────────────────────────────────────────
    if (/my profile|my account|my details|my name|my email|who am i|my info|account info/.test(lower)) {
      try {
        const [totalOrders, deliveredOrders] = await Promise.all([
          Order.countDocuments({ user: user._id }),
          Order.countDocuments({ user: user._id, orderStatus: 'Delivered' }),
        ]);

        const since = user.createdAt
          ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
          : 'N/A';

        let reply = `👤 **Your Profile:**\n\n`;
        reply += `• **Name:** ${user.name}\n`;
        reply += `• **Email:** ${user.email}\n`;
        if (user.phone) reply += `• **Phone:** ${user.phone}\n`;
        reply += `• **Member since:** ${since}\n`;
        reply += `• **Total orders placed:** ${totalOrders}\n`;
        reply += `• **Orders delivered:** ${deliveredOrders}\n`;
        if (user.role === 'admin') reply += `• **Role:** 🔧 Admin\n`;

        return res.json({ success: true, reply });
      } catch {
        return res.json({
          success: true,
          reply:
            `👤 **Your Profile:**\n\n• **Name:** ${user.name}\n• **Email:** ${user.email}\n\n` +
            `Visit **My Account** to view and edit all your details.`,
        });
      }
    }

    // ── Spending summary ──────────────────────────────────────────────────────
    if (/my spending|total spent|how much|spent|expenditure/.test(lower)) {
      try {
        const orders = await Order.find({ user: user._id, orderStatus: { $ne: 'Cancelled' } }).lean();
        const total  = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        return res.json({
          success: true,
          reply:
            `💰 **Your Spending Summary, ${user.name}:**\n\n` +
            `• **Total orders:** ${orders.length}\n` +
            `• **Total spent:** ₹${total.toFixed(2)}\n\n` +
            `Visit **My Orders** for a full breakdown.`,
        });
      } catch {}
    }

    // ── Latest / last order ───────────────────────────────────────────────────
    if (/latest order|last order|most recent order/.test(lower)) {
      try {
        const order = await Order.findOne({ user: user._id }).sort({ createdAt: -1 }).lean();
        if (!order) {
          return res.json({ success: true, reply: `📦 Hi **${user.name}**, you haven't placed any orders yet.` });
        }
        const id   = order._id.toString().slice(-8).toUpperCase();
        const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const icon = STATUS_ICON[order.orderStatus] || '📦';
        const names = (order.orderItems || []).map(it => it.name).join(', ');

        return res.json({
          success: true,
          reply:
            `📦 **Your Latest Order:**\n\n` +
            `• **Order ID:** #${id}\n` +
            `• **Date:** ${date}\n` +
            `• **Status:** ${icon} ${order.orderStatus}\n` +
            `• **Items:** ${names}\n` +
            `• **Total:** ₹${(order.totalPrice || 0).toFixed(2)}\n\n` +
            `Go to **My Orders** to track it in detail.`,
        });
      } catch {}
    }
  }

  // ── Static rule-based fallback ─────────────────────────────────────────────
  const reply = getBotResponse(lower);
  return res.json({ success: true, reply });
};

module.exports = { chat, optionalAuth };
