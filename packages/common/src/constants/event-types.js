// ═══════════════════════════════════════════════════
// Event Types — Used by RabbitMQ messaging
// Every event published or consumed MUST use these constants
// ═══════════════════════════════════════════════════

export const EventTypes = Object.freeze({
  // --- User Events ---
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_PASSWORD_CHANGED: 'user.password.changed',
  USER_PASSWORD_RESET_REQUESTED: 'user.password.reset.requested',

  // --- Product Events ---
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_PRICE_CHANGED: 'product.price.changed',

  // --- Category Events ---
  CATEGORY_CREATED: 'category.created',
  CATEGORY_UPDATED: 'category.updated',
  CATEGORY_DELETED: 'category.deleted',

  // --- Cart Events ---
  CART_ITEM_ADDED: 'cart.item.added',
  CART_ITEM_REMOVED: 'cart.item.removed',
  CART_ITEM_UPDATED: 'cart.item.updated',
  CART_CLEARED: 'cart.cleared',

  // --- Inventory Events ---
  STOCK_RESERVED: 'inventory.stock.reserved',
  STOCK_RELEASED: 'inventory.stock.released',
  STOCK_DEDUCTED: 'inventory.stock.deducted',
  STOCK_LOW: 'inventory.stock.low',
  STOCK_OUT: 'inventory.stock.out',
  RESERVATION_EXPIRED: 'inventory.reservation.expired',

  // --- Order Events ---
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PAYMENT_PENDING: 'order.payment.pending',
  ORDER_PAID: 'order.paid',
  ORDER_PROCESSING: 'order.processing',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUND_REQUESTED: 'order.refund.requested',
  ORDER_REFUNDED: 'order.refunded',

  // --- Payment Events ---
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_PROCESSING: 'payment.processing',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUND_INITIATED: 'payment.refund.initiated',
  PAYMENT_REFUNDED: 'payment.refunded',

  // --- Notification Events ---
  NOTIFICATION_SEND_EMAIL: 'notification.send.email',
  NOTIFICATION_SEND_SMS: 'notification.send.sms',
  NOTIFICATION_SEND_PUSH: 'notification.send.push',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
});
