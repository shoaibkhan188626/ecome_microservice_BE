import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    //unique identifier from provider (like : razorpay or whoever provides  that)
    providerEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    //payment Provider like razorpay ,stripe or so on

    provider: {
      type: String,
      required: true,
      index: true,
    },

    //event type (payment.captured, payment.failed...or many more)
    eventType: {
      type: String,
      required: true,
    },

    //raw payload (for audit-logs and debugs)
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: ["received", "processing", "completed", "failed"],
      default: "received",
      index: true,
    },

    //which order/payment this webhook relates to
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      index: true,
    },
    paymentId: String,

    //processing result
    result: mongoose.Schema.Types.Mixed,
    errorMessage: String,

    //timestamps
    processedAt: Date,
  },
  { timestamps: true, collection: "webhook-events" },
);

//compunding for index querying
webhookEventSchema.index({ provider: 1, providerEventId: 1 });
webhookEventSchema.index({ status: 1, createdAt: 1 });

//static method to check if event was already
webhookEventSchema.statics.isProcessed = async function (providerEventId) {
  const event = await this.findOne({ providerEventId });
  return event?.status === "completed";
};

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
