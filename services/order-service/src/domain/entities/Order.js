import mongoose from "mongoose";
import { OrderStates } from "../state-machine/order-state.js";

/**
 * order model with state machine
 *
 * Features:
 * - State-based workflow
 * - Event sourcing (state history)
 * - Idempotency keys
 * - Audit trail
 *
 * Performance:
 * - Compound indexes for queries
 * - Denormalized totals
 * - Optimistic locking with version
 */

const orderItemsSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    sku: {
      type: String,
      required: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    image: String,

    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    //Snapshot of product at order time
    productSnapshot: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    addressLine1: {
      type: String,
      required: true,
    },

    addressLine2: String,

    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    postalCode: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
      default: "IN",
    },

    phone: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const stateHistorySchema = new mongoose.Schema(
  {
    from: {
      type: String,
      enum: Object.values(OrderStates),
    },

    to: {
      type: String,
      enum: Object.values(OrderStates),
      required: true,
    },

    event: {
      type: String,
      required: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reason: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    //order identification
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    //User reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    //order items
    items: [orderItemsSchema],

    //pricing
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    //Address
    shippingAddress: {
      type: addressSchema,
      required: true,
    },

    billingAddress: {
      type: addressSchema,
      required: true,
    },

    //State Management
    status: {
      type: String,
      enum: Object.values(OrderStates),
      default: OrderStates.PENDING,
      index: true,
    },

    stateHistory: [stateHistorySchema],

    paymentMethod: {
      type: String,
      enum: ["card", "UPI", "bank_transfer", "cod"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    paymentId: String,
    paidAt: Date,

    //shipping
    shippingMethod: {
      type: String,
      enum: ["standard", "express", "overnight"],
      default: "standard",
    },

    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date,

    //Inventory Reservation
    reservationId: {
      type: String,
      index: true,
    },
    reservationExpiry: Date,

    //idempotency
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    //Notes and metadata
    customerNotes: String,
    internalNotes: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    //cancellation
    cancelledAt: Date,
    cancellationReason: String,

    //expiry for pending orders
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "items.sku": 1 });
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

orderSchema.pre("save", async function () {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = await this.constructor.generateOrderNumber();
  }
});

/**
 * Static : Generate unique order number
 * format : ORD-YYYYMMDD-XXXXX
 */

orderSchema.statics.generateOrderNumber = async function () {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  let orderNumber;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    orderNumber = `ORD-${dateStr}-${randomNum}`;

    const existing = await this.findOne({ orderNumber });
    if (!existing) {
      return orderNumber;
    }
    attempts++;
  }
  throw new Error("Failed to generate unique order number");
};

/**
 * Static: Find by order number
 */

orderSchema.statics.findUserOrders = function (userId, options = {}) {
  const { status, page = 1, limit = 20 } = options;

  const query = { userId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  return this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

/**
 * Instance method : Transition to new state
 */
orderSchema.methods.transitionTo = function (
  newState,
  event,
  performedBy = null,
  reason = null,
  metadata = null,
) {
  const stateChange = {
    from: this.status,
    to: newState,
    event,
    timestamp: new Date(),
    performedBy,
    reason,
    metadata,
  };
  this.stateHistory.push(stateChange);
  this.status = newState;
};

/**
 * Instance method to check if can transition
 */

orderSchema.methods.canTransitionTo = function (event) {
  const { canTransition } = require("../state-machine/order-state.js");
  return canTransition(this.status, event);
};

/**
 * Instance method : calculate totals
 */
orderSchema.methods.calculateTotals = function () {
  this.subtotal = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  this.total = this.subtotal + this.tax + this.shippingCost - this.discount;
};

const Order = mongoose.model("Order", orderSchema);

export default Order;
