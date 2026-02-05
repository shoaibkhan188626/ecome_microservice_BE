import mongoose from "mongoose";
/**
 * Payment Model
 * Track all payment attempts & status across providers
 */

const paymentSchema = new mongoose.Schema(
  {
    //Business reference
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

    //financial
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

    //Status
    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "authorized",
        "succeeded",
        "failed",
        "refunded",
        "cancelled",
      ],
      default: "created",
      index: true,
    },
    errorCode: String,
    errorMessage: String,

    //Idempotency & Safety
    idempotencyKey: {
      type: String,
      index: { unique: true, sparse: true },
    },

    //timeline
    createdAtProvider: Date,
    succeededAt: Date,
    failedAt: Date,
    refundedAt: Date,

    //audit
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

//indexes
paymentSchema.index({ orderId: 1, provider: 1 });
paymentSchema.index({ providerPaymentId: 1 });

paymentSchema.methods.addLog = function (event, details = null) {
  this.logs.push({ at: new Date(), event, details });
};

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
