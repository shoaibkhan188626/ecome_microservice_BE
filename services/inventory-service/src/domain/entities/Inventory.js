import mongoose from "mongoose";

/**
 * Inventory Model with Atomic Operations
 *
 * Features:
 * - Real-time stock tracking
 * - Reservation system (hold stock during checkout)
 * - Warehouse location support
 * - Stock movement history
 * - Low stock alerts
 *
 * Performance:
 * - Atomic updates using MongoDB operators
 * - Compound indexes for O(log n) queries
 * - Optimistic locking with version field
 */

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      index: true,
    },

    //stock quantity
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    reserved: {
      type: Number,
      default: 0,
      min: 0,
    },
    //available quantity - reserved

    //   threshold
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },

    reorderPoint: {
      type: Number,
      default: 0,
      min: 0,
    },

    reorderQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    //warehouse/location
    warehouse: {
      type: String,
      default: "main",
      index: true,
    },

    location: {
      aisle: String,
      shelf: String,
      bin: String,
    },

    //   Backorder support
    allowBackorder: {
      type: Boolean,
      default: false,
    },

    backOrderLimit: {
      type: Number,
      default: 0,
    },

    //status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    //metadata
    lastRestocked: {
      type: Date,
    },

    lastSold: {
      type: Date,
    },

    //version for optimistic locking
    __v: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Compound indexes for performance
 */
inventorySchema.index({ productId: 1, warehouse: 1 });
inventorySchema.index(
  { productId: 1, variantId: 1, warehouse: 1 },
  { unique: true },
);
inventorySchema.index({ sku: 1, warehouse: 1 });

/**
 * virtual available quantity (quantity - reserved)
 */

inventorySchema.virtual("available").get(function () {
  return Math.mex(0, this.quantity - this.reserved);
});

/**
 * virtual : stock status
 */

inventorySchema.virtual("stockStatus").get(function () {
  const available = this.available;

  if (available === 0) {
    return this.allowBackorder ? "backorder" : "out_of_stock";
  }

  if (available <= this.lowStockThreshold) {
    return "low_stock";
  }
  return "in_stock";
});

/**
 * virtual : need reorder
 */

inventorySchema.statics.findByProduct = function (productId, warehouse = null) {
  const query = { productId, isActive: true };

  if (warehouse) query.warehouse = warehouse;

  return this.find(query);
};

/**
 * static : Find by SKU
 */
inventorySchema.statics.findBySKU = function (sku, warehouse = "main") {
  return this.findOne({ sku, warehouse, isActive: true });
};

/**
 * Static : Find low stock items
 */
inventorySchema.statics.findLowStock = function (warehouse = null) {
  const query = {
    $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
    isActive: true,
  };
  if (warehouse) query.warehouse = warehouse;
  return this.find(query).sort({ quantity: 1 });
};

/**
 * Instance method : Check if can fulfill quantity
 */

inventorySchema.methods.canFulFill = function (requestedQty) {
  const available = this.available;

  if (available >= requestedQty) {
    return { canFulFill: true, available };
  }

  if (this.allowBackorder) {
    const totalAvailable = available + this.backOrderLimit;
    return {
      canFulFill: totalAvailable >= requestedQty,
      available,
      backorderQty: Math.max(0, requestedQty - available),
    };
  }
  return { canFulFill: false, available };
};

/**
 * Static: Reserve stock (atomic operation)
 * CRITICAL: Must be atomic to prevent overselling
 * Time Complexity: O(1)
 *
 * @param {String} sku - SKU to reserve
 * @param {Number} quantity - Quantity to reserve
 * @param {String} reservationId - Unique reservation identifier
 * @returns {Promise<Object>} Updated inventory or null if failed
 */
inventorySchema.statics.reserveStock = async function (
  sku,
  quantity,
  reservationId,
) {
  const result = await this.findOneAndUpdate(
    {
      sku,
      isActive: true,
      $expr: { $gte: [{ $subtract: ["$quantity", "$reserved"] }, quantity] },
    },
    {
      $inc: { reserved: quantity },
      $set: { lastSold: new Date() },
    },
    { new: true },
  );
  return result;
};

/**
 * Static: Release reservation (atomic operation)
 * Time Complexity: O(1)
 *
 * @param {String} sku - SKU to release
 * @param {Number} quantity - Quantity to release
 * @returns {Promise<Object>} Updated inventory
 */

inventorySchema.statics.releaseReservation = async function (sku, quantity) {
  return await this.findOneAndUpdate(
    { sku, isActive: true },
    { $inc: { reserved: -quantity } },
    { new: true },
  );
};

/**
 * Static: Commit reservation (convert reserved to sold)
 * Time Complexity: O(1)
 *
 * @param {String} sku - SKU
 * @param {Number} quantity - Quantity to commit
 * @returns {Promise<Object>} Updated inventory
 */

inventorySchema.statics.commitReservation = async function (sku, quantity) {
  return await this.findOneAndUpdate(
    {
      sku,
      isActive: true,
      reserved: { $gte: quantity },
    },
    {
      $inc: {
        quantity: -quantity,
        reserved: -quantity,
      },
      $set: { lastSold: new Date() },
    },
    { new: true },
  );
};

/**
 * Static: Adjust stock (add/remove)
 * Time Complexity: O(1)
 *
 * @param {String} sku - SKU
 * @param {Number} quantity - Quantity to adjust (positive = add, negative = remove)
 * @param {String} reason - Reason for adjustment
 * @returns {Promise<Object>} Updated inventory
 */

inventorySchema.statics.adjustStock = async function (
  sku,
  quantity,
  reason = "manual",
) {
  const update = {
    $inc: { quantity },
  };

  if (quantity > 0) {
    update.$set = { lastRestocked: new Date() };
  }
  return await this.findOneAndUpdate({ sku, isActive: true }, update, {
    new: true,
  });
};

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory
