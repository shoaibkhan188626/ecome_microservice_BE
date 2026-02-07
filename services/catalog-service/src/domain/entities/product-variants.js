import mongoose, { trusted } from "mongoose";

/**
 * product variant model
 * for products with multiple options (like : variances in color, size and so on)
 *
 * Example:
 * Product: "iPhone 15 Pro"
 * Variants:
 *   - Blue, 128GB: SKU-IPHONE15-BLUE-128, Price: $999
 *   - Blue, 256GB: SKU-IPHONE15-BLUE-256, Price: $1099
 *   - Black, 128GB: SKU-IPHONE15-BLACK-128, Price: $999
 */

const variantSchema = new mongoose.Schema(
  {
    //parent product reference
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
      index: true,
    },

    //variant sku (unique)
    sku: {
      type: String,
      required: [true, "Variant is required"],
      unique: true,
      uppercase: true,
      index: true,
    },

    //variant specific pricing
    price: {
      type: Number,
      required: [true, "Variant price is required"],
      min: [0, "Price cannot be negative"],
    },

    salePrice: {
      type: Number,
      min: [0, "Sale price can not be negative"],
    },
    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },

    //variant attributes like color and storage for phone
    attributes: {
      type: Map,
      of: String,
      required: true,
    },

    //stock for this variant (detailed in inventory service)
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    //variant-specific images
    images: [
      {
        url: String,
        alt: String,
        order: {
          type: Number,
          default: 0,
        },
      },
    ],

    //weigh and dimension (if different from parent)
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ["kg", "g", "lb", "oz"],
      },
    },

    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ["cm", "m", "inch", "ft"],
      },
    },

    //status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    //analytics
    viewCount: {
      type: Number,
      default: 0,
    },
    purchaseCount: {
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
 * compound indexes
 */
variantSchema.index({ product: 1, isActive: 1 });
variantSchema.index({ product: 1, isDefault: 1 });

/**virtual : check if variant is on sale */
variantSchema.virtual("isOnsale").get(function () {
  return this.salePrice && this.salePrice < this.price;
});

/**virtual for effective price */
variantSchema.virtual("effectivePrice").get(function () {
  return this.isOnSale ? this.salePrice : this.price;
});

/**virtual for stock status */
variantSchema.virtual("stockStatus").get(function () {
  if (this.stockQuantity === 0) return "out_of_stock";
  if (this.stockQuantity <= 10) return "low_stock";
  return "in_stock";
});

/**
 * static : find variants by product
 */
variantSchema.static.findByProduct = function (productId) {
  return this.find({ product: productId, isActive: true }).sort({
    isDefault: -1,
  });
};

/**
 * static : find default variant
 */
variantSchema.static.findDefault = function (productId) {
  return this.findOne({ product: productId, isDefault: true, isActive: true });
};

const ProductVariant = mongoose.model("ProductVariant", variantSchema);
export default ProductVariant;
