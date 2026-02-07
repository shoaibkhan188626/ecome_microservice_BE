import mongoose from "mongoose";

/**
 * Stock Movement Model - Audit Trail for Inventory Changes
 *
 * Tracks all stock movements for:
 * - Accountability
 * - Reporting
 * - Debugging inventory discrepancies
 * - Analytics
 *
 * Performance:
 * - Write-heavy collection (append-only)
 * - Indexed by date for time-based queries
 */

const stockMovementSchema = new mongoose.Schema(
  {
    //inventory reference
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    sku: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },

    //Movement Details
    type: {
      type: String,
      enum: [
        "purchase", //stock received from supplier
        "sale", //stock sold to customer
        "return", // customer return
        "adjustment", // manual adjustment
        "transfer", //transfer between warehouse
        "damage", //damaged goods
        "reservation", //reservation of stock
        "release", //Reservation released
        "commit", //reservation committed to sale
      ],

      required: true,
      index: true,
    },

    //Quantity change
    quantityBefore: {
      type: Number,
      required: true,
    },

    quantityChange: {
      type: Number,
      required: true,
    },

    quantityAfter: {
      type: Number,
      required: true,
    },

    //Reserved Stock Tracking
    reservedBefore: {
      type: Number,
      default: 0,
    },

    reservedAfter: {
      type: Number,
      default: 0,
    },

    //Reference Information
    referenceType: {
      type: String,
      enum: [
        "order",
        "purchase_order",
        "transfer",
        "adjustment",
        "return",
        "order",
      ],
    },

    referenceId: {
      type: String, // order ID, PO number, etc.
    },
    //wareHouse location
    warehouse: {
      type: String,
      default: "main",
      index: true,
    },
    fromWarehouse: String,
    toWarehouse: String,

    // User/system who made the change

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    performedBySystem: {
      type: Boolean,
      default: false,
    },

    //Notes
    reason: {
      type: String,
      trim: true,
      maxLength: 500,
    },

    notes: {
      type: String,
      trim: true,
      maxLength: 1000,
    },

    //metadata
    cost: {
      type: Number,
    },
    totalValue: {
      type: Number,
    },
  },
  { timestamps: true },
);

/**
 * Indexes for performance
 */
stockMovementSchema.index({ createdAt: -1 }); //recent movements
stockMovementSchema.index({ inventoryId: 1, createdAt: -1 });
stockMovementSchema.index({ productId: 1, createdAt: -1 });
stockMovementSchema.index({ sku: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });
stockMovementSchema.index({ warehouse: 1, createdAt: -1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });

/**
 * Static : Record movement
 */

stockMovementSchema.static.recordMovement = async function (data) {
  const movement = new this(data);
  await movement.save();
  return movement;
};

/**
 * Static : Get movements by inventory
 */
stockMovementSchema.static.findByInventory = function (
  inventoryId,
  limit = 50,
) {
  return this.find({ inventoryId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("performedBy", "firstName", "lastName email");
};

/**
 * Static : Get movements by product
 */
stockMovementSchema.static.findByProduct = function (productId, options = {}) {
  const { startDate, endDate, type, warehouse, limit = 100 } = options;

  const query = { productId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (type) query.type = type;
  if (warehouse) query.warehouse = warehouse;

  return this.find(query).sort({ createdAt: -1 }).limit(limit);
};

/**
 * Static : Get movement summary
 */

stockMovementSchema.static.getSummary = async function (
  productId,
  startDate,
  endDate,
) {
  const match = { productId };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$type",
        totalQuantity: { $sum: "$quantityChange" },
        count: { $sum: 1 },
        totalValue: { $sum: "$totalValue" },
      },
    },
    { $sort: { totalQuantity: -1 } },
  ]);
};

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
export default StockMovement;
