import mongoose from "mongoose";

const outboxEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    aggregateType: {
      type: String,
      required: true,
    },

    aggregateId: {
      type: String,
      required: true,
      index: true,
    },

    correlationId: {
      type: String,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "published", "failed"],
      default: "pending",
      index: true,
    },

    retryCount: {
      type: Number,
      default: 0,
    },

    maxRetries: {
      type: Number,
      default: 5,
    },

    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },

    lastError: String,
    publishedAt: Date,
  },
  { timestamps: true, collection: "outbox_events" },
);

//Compound indexes for efficient querying
outboxEventSchema.index({ status: 1, nextAttemptAt: 1 });
outboxEventSchema.index({ aggregateType: 1, aggregateId: 1 });

//static methods
outboxEventSchema.statics.findPending = function (limit = 100) {
  return this.find({
    status: { $in: ["pending", "failed"] },
    retryCount: { $lt: 5 },
    nextAttemptAt: { $lte: new Date() },
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

const outboxEvent = mongoose.model("OutboxEvent", outboxEventSchema);
export default outboxEvent;
