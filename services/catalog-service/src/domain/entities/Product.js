import mongoose from "mongoose";
import slugify from "slugify";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxLength: [200, "Product name too long"],
      index: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      maxLength: [5000, "Description too long"],
    },

    shortDescription: {
      type: String,
      trim: true,
      maxLength: [500, "Short description is too long"],
    },

    //category reference
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },

    //Pricing
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Price cannot be negative"],
    },

    salePrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },

    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },

    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      maxLength: 3,
    },

    //SKU (Stock keeping unit)
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      index: true,
    },

    //EAV pattern
    attributes: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        value: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },

        type: {
          type: String,
          enum: ["string", "number", "boolean", "array"],
          default: "string",
        },

        unit: {
          type: String,
          trim: true,
        },
      },
    ],

    //images
    images: [
      {
        url: {
          type: String,
          required: true,
        },

        alt: {
          type: String,
          default: "",
        },

        isPrimary: {
          type: Boolean,
          default: false,
        },

        order: {
          type: Number,
          default: 0,
        },
      },
    ],

    //SEO
    metaTitle: {
      type: String,
      maxLength: [60, "Meta title too long"],
    },

    metaDescription: {
      type: String,
      maxLength: [160, "Meta description too long"],
    },

    metaKeywords: [String],

    productType: {
      type: String,
      enum: ["simple", "variable", "digital", "bundle"],
      default: "simple",
      index: true,
    },

    trackInventory: {
      type: Boolean,
      default: true,
    },

    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    lowStockThreshold: {
      type: Number,
      default: 10,
    },

    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ["kg", "g", "lb", "oz"],
        default: "kg",
      },
    },

    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ["cm", "m", "inch", "ft"],
        default: "cm",
      },
    },

    brand: {
      type: String,
      trim: true,
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    viewCount: {
      type: Number,
      default: 0,
    },

    purchaseCount: {
      type: Number,
      default: 0,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Compounding indexes for performance
 */
productSchema.index({ category: 1, status: 1, isActive: 1 }); //category filter
productSchema.index({ status: 1, isActive: 1, createdAt: -1 }); //recent products
productSchema.index({ isFeatured: 1, isActive: 1 }); //Featured filter
productSchema.index({ brand: 1, isActive: 1 }); //Brand filter
productSchema.index({ basePrice: 1, isActive: 1 }); //Price range filter
productSchema.index({ "attributes.name": 1, "attributes.value": 1 }); //EAV queries

//text index for search (basic - will use atlas search later)
productSchema.index({
  name: "text",
  description: "text",
  tags: "text",
  brand: "text",
});

/**
 * Virtual : check if product is on sale
 */
productSchema.virtual("isOnSale").get(function () {
  return this.salePrice && this.salePrice < this.basePrice;
});

/**
 * virtual: calculate discount percentage
 */

productSchema.virtual("discountPercentage").get(function () {
  if (!this.isOnSale) return 0;
  return Math.round(((this.basePrice - this.salePrice) / this.basePrice) * 100);
});

/**
 * virtual: Check stock status
 */
productSchema.virtual("effectivePrice").get(function () {
  return this.isOnSale ? this.salePrice : this.basePrice;
});

/**
 * virtual: check stock status
 */

productSchema.virtual("stockStatus").get(function () {
  if (!this.trackInventory) return "in_stock";
  if (this.stockQuantity === 0) return "out_of_stock";
  if (this.stockQuantity <= this.lowStockThreshold) return "low_stock";
  return "in_stock";
});

/**
 * virtual: get primary image
 */
productSchema.virtual("primaryImage").get(function () {
  if (!this.images || this.images.length === 0) return null;
  const primary = this.images.find((img) => img.isPrimary);
  return primary || this.images[0];
});

/**
 * pre-save hook to generate slug and validate
 */

productSchema.pre("save", async function () {
  // Generate slug from name if not provided
  if (this.isModified("name") && !this.slug) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (
      await mongoose.model("Product").findOne({ slug, _id: { $ne: this._id } })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }

  // Ensure only one primary image
  if (this.isModified("images") && this.images.length > 0) {
    const primaryCount = this.images.filter((img) => img.isPrimary).length;

    if (primaryCount === 0) {
      // Set first image as primary if none selected
      this.images[0].isPrimary = true;
    } else if (primaryCount > 1) {
      // Keep only first primary, reset others
      let foundFirst = false;
      this.images.forEach((img) => {
        if (img.isPrimary && !foundFirst) {
          foundFirst = true;
        } else {
          img.isPrimary = false;
        }
      });
    }
  }

  // Auto-set meta fields if not provided
  if (!this.metaTitle) {
    this.metaTitle = this.name.substring(0, 60);
  }
  if (!this.metaDescription) {
    this.metaDescription =
      this.shortDescription || this.description.substring(0, 160);
  }
});

/**static: Find products by category (including sub category)
 * @param {ObjectId} categoryId-category ID
 * @param {Object} filters - Additional filters
 * @returns {Query} mongoose query
 */

productSchema.static.findByCategory = function (categoryId, filters = {}) {
  return this.find({
    category: categoryId,
    isActive: true,
    status: "active",
    ...filters,
  });
};

/**
 * static : Find products by attribute
 * @param {String} attributeName - Attribute name (e.g., 'color')
 * @param {Mixed} attributeValue - Attribute value (e.g., 'Red')
 * @returns {Query} mongoose query
 */

productSchema.static.findByAttribute = function (
  attributeName,
  attributeValue,
) {
  return this.find({
    "attributes.name": attributeName,
    "attributes.value": attributeValue,
    isActive: true,
    status: "active",
  });
};

/**
 * static : find featured products
 * @param {Number} limit - Number of products to return
 * @returns {Promise<Array>} featured products
 */
productSchema.statics.findFeatured = function (limit = 10) {
  return this.find({
    isFeatured: true,
    isActive: true,
    status: "active",
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("category", "name slug");
};

/**
 * instance method : Get attributes value by name
 * @param {String} attributeName - Attribute name
 * @returns {Mixed} Attribute value or null
 */

productSchema.methods.getAttributeValue = function (attributeName) {
  const attr = this.attributes.find((a) => a.name === attributeName);
  return attr ? attr.value : null;
};

/**
 * instance of method : Add or update attribute
 * @param {String} name - Attribute name
 * @param {Mixed} value - Attribute value
 * @param {String} type - Attribute type
 * @param {String} unit - Attribute unit (optional)
 */

productSchema.methods.setAttribute = function (
  name,
  value,
  type = "string",
  unit = null,
) {
  const existingIndex = this.attributes.findIndex((a) => a.name === name);
  const attribute = { name, value, type, unit };

  if (existingIndex !== -1) {
    this.attributes[existingIndex] = attribute;
  } else {
    this.attributes.push(attribute);
  }
};

/**
 * instance method: Increment view count
 */
productSchema.methods.incrementViewCount = async function () {
  this.viewCount += 1;
  await this.save();
};

/**
 * instance method : Update stock quantity (basic - full logic in inventory service)
 * @param {Number} quantity - quantity add/subtract
 */

productSchema.methods.adjustStock = async function (quantity) {
  if (!this.trackInventory) return;

  this.stockQuantity += quantity;
  if (this.stockQuantity < 0) this.stockQuantity = 0;

  await this.save();
};

const Product = mongoose.model("Product", productSchema);
export default Product;
