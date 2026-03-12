const nodemailer = require('nodemailer');

// ─── Transporter ──────────────────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// ─── Base HTML wrapper ────────────────────────────────────────────────────────
const baseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#16a34a,#059669);padding:32px 36px;text-align:center}
    .header h1{color:#fff;margin:0;font-size:1.5rem;letter-spacing:.5px}
    .header p{color:#d1fae5;margin:6px 0 0;font-size:.9rem}
    .body{padding:32px 36px}
    .body p{color:#374151;line-height:1.7;margin:0 0 14px}
    .btn{display:inline-block;margin:18px 0;padding:12px 28px;background:#16a34a;color:#fff!important;border-radius:8px;text-decoration:none;font-weight:600;font-size:.95rem}
    .order-table{width:100%;border-collapse:collapse;margin:18px 0}
    .order-table th{background:#f9fafb;padding:10px 12px;text-align:left;font-size:.8rem;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb}
    .order-table td{padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:.88rem;color:#374151}
    .summary-row{display:flex;justify-content:space-between;padding:6px 0;font-size:.9rem;color:#374151}
    .summary-row.total{font-weight:700;font-size:1rem;border-top:2px solid #e5e7eb;margin-top:8px;padding-top:12px}
    .info-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin:18px 0}
    .info-box p{margin:4px 0;font-size:.88rem;color:#166534}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:.78rem;font-weight:600}
    .badge-green{background:#dcfce7;color:#166534}
    .badge-orange{background:#fff7ed;color:#c2410c}
    .divider{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
    .footer{background:#f9fafb;padding:20px 36px;text-align:center;font-size:.78rem;color:#9ca3af}
    .footer a{color:#16a34a;text-decoration:none}
    .offer-banner{background:linear-gradient(135deg,#7c3aed,#9333ea);padding:28px 36px;text-align:center;border-radius:8px;margin-bottom:20px}
    .offer-banner h2{color:#fff;margin:0 0 8px;font-size:1.7rem}
    .offer-banner p{color:#ede9fe;margin:0;font-size:.95rem}
    .offer-code{background:#fff;color:#7c3aed;font-size:1.4rem;font-weight:800;padding:10px 24px;border-radius:8px;letter-spacing:3px;display:inline-block;margin:16px 0;border:2px dashed #7c3aed}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>🛒 SmartGrocery</h1>
      <p>Your trusted online grocery store</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} SmartGrocery. All rights reserved.</p>
      <p>Questions? <a href="mailto:${process.env.EMAIL_USER}">Contact Support</a></p>
    </div>
  </div>
</body>
</html>`;

// ─── Core send function ───────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email] Skipped (EMAIL_USER/PASS not set) → ${subject} → ${to}`);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"SmartGrocery" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
  console.log(`[Email] Sent: ${subject} → ${to}`);
};

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────
const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: '🎉 Welcome to SmartGrocery!',
    html: baseTemplate('Welcome to SmartGrocery', `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Welcome aboard! 🎉 We're thrilled to have you as part of the <strong>SmartGrocery</strong> family.</p>
      <div class="info-box">
        <p>✅ Fresh groceries delivered to your door</p>
        <p>✅ Exclusive offers & discounts for members</p>
        <p>✅ Easy order tracking & returns</p>
      </div>
      <p>Start exploring our wide range of fresh produce, dairy, snacks and more.</p>
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="btn">Shop Now →</a>
      <p style="color:#9ca3af;font-size:.82rem">If you didn't create this account, please ignore this email.</p>
    `),
  });

// ─── 2. Order Confirmation ────────────────────────────────────────────────────
const sendOrderConfirmationEmail = (user, order) => {
  const itemRows = (order.orderItems || []).map(item => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`).join('');

  return sendEmail({
    to: user.email,
    subject: `✅ Order Confirmed — #${order._id.toString().slice(-6).toUpperCase()}`,
    html: baseTemplate('Order Confirmed', `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Your order has been placed successfully! We'll begin processing it shortly.</p>
      <div class="info-box">
        <p>📦 Order ID: <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong></p>
        <p>💳 Payment: <strong>${order.paymentMethod}</strong> &nbsp; <span class="badge ${order.isPaid ? 'badge-green' : 'badge-orange'}">${order.isPaid ? 'Paid' : 'Pending'}</span></p>
        <p>📍 Deliver to: <strong>${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}</strong></p>
      </div>
      <table class="order-table">
        <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="summary-row"><span>Items Total</span><span>₹${order.itemsPrice?.toFixed(2)}</span></div>
      <div class="summary-row"><span>Tax (5%)</span><span>₹${order.taxPrice?.toFixed(2)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${order.shippingPrice === 0 ? 'FREE' : '₹' + order.shippingPrice?.toFixed(2)}</span></div>
      <div class="summary-row total"><span>Total</span><span>₹${order.totalPrice?.toFixed(2)}</span></div>
      <hr class="divider"/>
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/orders" class="btn">Track Order →</a>
    `),
  });
};

// ─── 3. Shipping Notification ─────────────────────────────────────────────────
const sendShippingNotificationEmail = (user, order) =>
  sendEmail({
    to: user.email,
    subject: `🚚 Your Order is on the Way! — #${order._id.toString().slice(-6).toUpperCase()}`,
    html: baseTemplate('Order Shipped', `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Great news! Your order <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong> has been <strong>shipped</strong> and is on its way to you.</p>
      <div class="info-box">
        <p>🚚 Status: <strong>Shipped</strong></p>
        <p>📍 Delivering to: <strong>${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}</strong></p>
        <p>📦 Total: <strong>₹${order.totalPrice?.toFixed(2)}</strong></p>
      </div>
      <p>Expected delivery within <strong>2–4 business days</strong>. You'll receive another update once delivered.</p>
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/orders" class="btn">Track Your Order →</a>
    `),
  });

// ─── 4. Password Reset Email ──────────────────────────────────────────────────
const sendPasswordResetEmail = (user, resetUrl) =>
  sendEmail({
    to: user.email,
    subject: '🔒 Reset Your SmartGrocery Password',
    html: baseTemplate('Password Reset', `
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <a href="${resetUrl}" class="btn">Reset Password →</a>
      <p style="color:#9ca3af;font-size:.82rem">This link expires in <strong>15 minutes</strong>.</p>
      <hr class="divider"/>
      <p style="color:#9ca3af;font-size:.82rem">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    `),
  });

// ─── 5. Offer / Discount Email ────────────────────────────────────────────────
const sendOfferEmail = (user, { title, description, code, discount, expiryDate }) =>
  sendEmail({
    to: user.email,
    subject: `🎁 ${title} — Exclusive Offer For You!`,
    html: baseTemplate(title, `
      <div class="offer-banner">
        <h2>${discount}% OFF</h2>
        <p>${title}</p>
      </div>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>${description}</p>
      <p style="text-align:center">Use code at checkout:</p>
      <p style="text-align:center"><span class="offer-code">${code}</span></p>
      ${expiryDate ? `<p style="text-align:center;color:#9ca3af;font-size:.82rem">⏳ Valid until <strong>${new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></p>` : ''}
      <hr class="divider"/>
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/products" class="btn">Shop & Save Now →</a>
    `),
  });

// ─── 6. Low Stock Alert (Admin) ─────────────────────────────────────────────
const sendLowStockAlertEmail = (lowStockProducts) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  if (!adminEmail) return Promise.resolve();

  const rows = lowStockProducts.map(p => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6">
        <div style="display:flex;align-items:center;gap:10px">
          ${p.image ? `<img src="${p.image}" width="36" height="36" style="border-radius:6px;object-fit:cover;border:1px solid #e5e7eb" />` : ''}
          <strong style="color:#374151">${p.name}</strong>
        </div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:700;color:${p.quantity <= 5 ? '#dc2626' : '#ea580c'}">${p.quantity} left</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151">₹${p.price?.toFixed(2)}</td>
    </tr>`).join('');

  const critical = lowStockProducts.filter(p => p.quantity <= 5);

  return sendEmail({
    to: adminEmail,
    subject: `⚠️ Low Stock Alert — ${lowStockProducts.length} Product${lowStockProducts.length > 1 ? 's' : ''} Need Restocking`,
    html: baseTemplate('Low Stock Alert', `
      <p>Hi <strong>Admin</strong>,</p>
      <p>The following product${lowStockProducts.length > 1 ? 's are' : ' is'} running low on stock and may need to be restocked soon.</p>
      ${critical.length > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:18px">
        <p style="color:#dc2626;font-weight:600;margin:0">🚨 ${critical.length} product${critical.length > 1 ? 's' : ''} critically low (≤5 units)!</p>
      </div>` : ''}
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 12px;text-align:left;font-size:.78rem;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Product</th>
            <th style="padding:10px 12px;text-align:center;font-size:.78rem;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Stock</th>
            <th style="padding:10px 12px;text-align:right;font-size:.78rem;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/products" class="btn" style="background:#dc2626">Go to Products →</a>
      <p style="color:#9ca3af;font-size:.8rem;margin-top:16px">This alert was triggered automatically when an order was placed.</p>
    `),
  });
};

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendPasswordResetEmail,
  sendOfferEmail,
  sendLowStockAlertEmail,
};
