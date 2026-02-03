import mongoose from "mongoose";

/**
 * Notification Model - Audit trail for all notifications
 *
 * Features:
 * - Complete notification history
 * - Delivery status tracking
 * - Retry mechanism
 * - Multi-channel support (email, sms, push)
 *
 * Performance:
 * - Indexed by user and status
 * - TTL index for auto-cleanup
 */

const notificationSchema = new mongoose.Schema(
  {
    //recipient
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    recipient: {
      email: String,
      phone: String,
      deviceToken: String,
    },

    //Notification type
    type: {
      type: String,
      enum: [
        "welcome",
        "email_verification",
        "password_reset",
        "order_confirmation",
        "order_shipped",
        "order_delivered",
        "order_cancelled",
        "payment_success",
        "payment_failed",
        "low_stock_alert",
        "promotional",
        "custom",
      ],
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: ["email", "sms", "push", "in_app"],
      required: true,
      index: true,
    },

    //content
    subject: String,
    message: {
      type: String,
      required: true,
    },
    html: String,
    templateId: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    //delivery status
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed", "retrying"],
      default: "pending",
      index: true,
    },

    //retry logic
    retryCount: {
      type: Number,
      default: 0,
    },

    maxRetries: {
      type: Number,
      default: 0,
    },

    lastRetryAt: Date,

    //Delivery info
    sentAt: Date,
    deliveredAt: Date,
    failedAt: Date,
    errorMessage: String,

    //provider info
    provider: String,
    providerId: String,
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
    },

    //priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
      index: true,
    },

    //scheduled delivery
    scheduledFor: {
      type: Date,
      index: true,
    },

    //expiry (auto-delete after x-days)

    expiresAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true },
);

/**
 * Indexes
 */

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, channel: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Static : Find by user
 */

notificationSchema.statics.findByUser = function (userId, options = {}) {
  const { type, channel, status, limit = 50 } = options;

  const query = { userId };
  if (type) query.type = type;
  if (channel) query.channel = channel;
  if (status) query.status = status;

  return this.find(query).sort({ createdAt: -1 }).limit(limit);
};

/**
 * Statics : Get failed notifications for retry
 */
notificationSchema.statics.findForRetry = function () {
  return this.find({
    status: "failed",
    retryCount: { $lt: this.maxRetries },
  }).sort({ createdAt: 1 });
};


/**
 * Instance: Mark as sent
 */