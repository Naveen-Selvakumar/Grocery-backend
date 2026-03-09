/**
 * Notification Service
 * Handles in-app notifications for order events.
 * Can be extended to support email/SMS/push notifications.
 */

// In-memory notification store (replace with DB model for production)
const notifications = [];

const notificationTypes = {
  ORDER_PLACED: 'ORDER_PLACED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
};

/**
 * Create a notification for a user
 * @param {string} userId
 * @param {string} type - notification type
 * @param {string} message
 * @param {object} metadata - extra info (orderId, etc.)
 */
const createNotification = (userId, type, message, metadata = {}) => {
  const notification = {
    id: Date.now().toString(),
    userId: userId.toString(),
    type,
    message,
    metadata,
    isRead: false,
    createdAt: new Date(),
  };
  notifications.push(notification);
  console.log(`[Notification] User ${userId}: ${message}`);
  return notification;
};

/**
 * Get notifications for a specific user
 */
const getUserNotifications = (userId) => {
  return notifications
    .filter((n) => n.userId === userId.toString())
    .sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Mark a notification as read
 */
const markAsRead = (notificationId) => {
  const notif = notifications.find((n) => n.id === notificationId);
  if (notif) notif.isRead = true;
};

// Order-specific notification helpers
const notifyOrderPlaced = (userId, orderId) => {
  return createNotification(
    userId,
    notificationTypes.ORDER_PLACED,
    'Your order has been placed successfully!',
    { orderId }
  );
};

const notifyOrderShipped = (userId, orderId) => {
  return createNotification(
    userId,
    notificationTypes.ORDER_SHIPPED,
    'Your order has been shipped and is on the way!',
    { orderId }
  );
};

const notifyOrderDelivered = (userId, orderId) => {
  return createNotification(
    userId,
    notificationTypes.ORDER_DELIVERED,
    'Your order has been delivered. Enjoy your groceries!',
    { orderId }
  );
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  notifyOrderPlaced,
  notifyOrderShipped,
  notifyOrderDelivered,
  notificationTypes,
};
