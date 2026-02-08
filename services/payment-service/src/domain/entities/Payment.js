import mongoose from "mongoose";

/**
 * Payment Model
 * Track all payment attempts & status across providers
 */

const paymentSchema = new mongoose.Schema(
  {
    // Business reference
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["razorpay", "stripe"],
      required: true,
      index: true,
    },

    providerPaymentId: {
      type: String,
      index: true,
    },

    providerOrderId: String,
    providerMetadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Financial
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    // Status
    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "authorized",
        "succeeded",
        "captured",
        "failed",
        "refunded",
        "partially_refunded",
        "cancelled",
      ],
      default: "created",
      index: true,
    },
    errorCode: String,
    errorMessage: String,

    // Refund tracking (ADDED)
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    capturedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Idempotency & Safety
    idempotencyKey: {
      type: String,
      index: { unique: true, sparse: true },
    },

    // Timeline
    createdAtProvider: Date,
    succeededAt: Date,
    capturedAt: Date,
    failedAt: Date,
    refundedAt: Date,

    // Audit
    logs: [
      {
        at: { type: Date, default: Date.now },
        event: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true },
);

// Indexes
paymentSchema.index({ orderId: 1, provider: 1 });
paymentSchema.index({ providerPaymentId: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 }); // ADDED: For user payment history

paymentSchema.methods.addLog = function (event, details = null) {
  this.logs.push({ at: new Date(), event, details });
};

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
