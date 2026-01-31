import mongoose from "mongoose";

/**
 * Cart Model (MongoDB) - Persistent cart for logged-in users
 *
 * Features:
 * - Persistent storage for authenticated users
 * - Cart merging on login
 * - Automatic cleanup of expired carts
 *
 * Performance:
 * - O(1) lookup by userId
 * - O(n) operations on cart items where n = items count (typically < 50)
 */

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
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
      min: 1,
      default: 1,
    },
    image: {
      type: String,
      default: null,
    },
    // Product attributes (color, size, etc.)
    attributes: {
      type: Map,
      of: String,
      default: {},
    },
    // Metadata
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    items: [cartItemSchema],

    // Totals (denormalized for performance)
    itemCount: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },

    // Applied discounts/coupons
    discounts: [
      {
        code: String,
        amount: Number,
        type: {
          type: String,
          enum: ["percentage", "fixed"],
        },
      },
    ],
    discountTotal: {
      type: Number,
      default: 0,
    },

    // Final total
    total: {
      type: Number,
      default: 0,
    },

    // Expiry
    expiresAt: {
      type: Date,
      index: true,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Indexes
 */
cartSchema.index({ userId: 1, isActive: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

/**
 * Pre-save hook: Calculate totals
 */
cartSchema.pre("save", function () {
  this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.subtotal = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  this.discountTotal = this.discounts.reduce(
    (sum, discount) => sum + discount.amount,
    0,
  );
  this.total = Math.max(0, this.subtotal - this.discountTotal);
});

/**
 * Static: Find active cart by user
 */
cartSchema.statics.findByUser = function (userId) {
  return this.findOne({ userId, isActive: true });
};

/**
 * Instance method: Add item to cart
 */
cartSchema.methods.addItem = function (item) {
  const existingIndex = this.items.findIndex(
    (i) =>
      i.productId.toString() === item.productId.toString() &&
      (!i.variantId || i.variantId.toString() === item.variantId?.toString()),
  );

  if (existingIndex !== -1) {
    // Update quantity
    this.items[existingIndex].quantity += item.quantity;
  } else {
    // Add new item
    this.items.push({
      ...item,
      addedAt: new Date(),
    });
  }
};

/**
 * Instance method: Update item quantity
 */
cartSchema.methods.updateItemQuantity = function (
  productId,
  variantId,
  quantity,
) {
  const item = this.items.find(
    (i) =>
      i.productId.toString() === productId.toString() &&
      (!variantId || i.variantId?.toString() === variantId.toString()),
  );

  if (item) {
    if (quantity <= 0) {
      this.items = this.items.filter((i) => i !== item);
    } else {
      item.quantity = quantity;
    }
    return true;
  }
  return false;
};

/**
 * Instance method: Remove item
 */
cartSchema.methods.removeItem = function (productId, variantId) {
  this.items = this.items.filter(
    (i) =>
      !(
        i.productId.toString() === productId.toString() &&
        (!variantId || i.variantId?.toString() === variantId.toString())
      ),
  );
};

/**
 * Instance method: Clear cart
 */
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.discounts = [];
};

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
