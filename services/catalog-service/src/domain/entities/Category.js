import mongoose from "mongoose";
import slugify from "slugify";

// Helper to escape regex special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\__CODE_BLOCK_0__');
};

/**
 * Category Model with infinite Nesting Support
 * Pattern: Materialized Path + Adjacency List (Hybrid)
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxLength: [100, "Category name too long"],
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
      trim: true,
      maxLength: [500, "Description too long"],
    },
    // Materialized Path - stores full hierarchy
    path: {
      type: String,
      required: true,
      unique: true, // Critical uniqueness constraint
      index: true,
    },
    // Adjacency List - parent reference
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
      validate: {
        validator: async function (v) {
          if (!v) return true;
          if (this._id && v.equals(this._id)) return false;
          
          const parent = await mongoose.model("Category").findById(v);
          if (!parent) return false;
          
          // Prevent circular references
          if (this.path && parent.path.startsWith(this.path + "/")) {
            return false;
          }
          return true;
        },
        message: "Invalid parent or circular reference.",
      },
    },
    // Level in tree (0=root)
    level: {
      type: Number,
      required: true,
      default: 0,
      index: true,
      min: [0, "Level cannot be negative"],
    },
    // Order for display
    order: {
      type: Number,
      default: 0,
      min: [0, "Order cannot be negative"],
    },
    // SEO fields
    metaTitle: String,
    metaDescription: String,
    // Image
    image: { url: String, alt: String },
    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Denormalized counter
    productCount: {
      type: Number,
      default: 0,
      min: [0, "Product count cannot be negative"],
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Enable optimistic locking
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
categorySchema.index({ path: 1, isActive: 1 });
categorySchema.index({ parent: 1, order: 1 });
categorySchema.index({ level: 1, isActive: 1 });

/**
 * Virtuals
 */
categorySchema.virtual("ancestors").get(function () {
  if (!this.path || this.level === 0) return [];
  return this.path.split("/").slice(0, -1);
});

/**
 * Pre-save hook: Slug and path generation
 */
categorySchema.pre("save", async function (next) {
  // Generate slug only for new documents
  if (this.isNew && !this.slug) {
    let baseSlug = slugify(this.name, { lower: true, strict: true });
    let uniqueSlug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness
    while (true) {
      const existing = await mongoose.model("Category").findOne({ slug: uniqueSlug });
      if (!existing) break;
      uniqueSlug = `${baseSlug}-${counter++}`;
    }
    this.slug = uniqueSlug;
  }

  // Handle path/level changes
  if (this.isNew || this.isModified("parent") || this.isModified("slug")) {
    const oldPath = this.path;
    const oldLevel = this.level;

    if (this.parent) {
      const parent = await mongoose.model("Category").findById(this.parent);
      if (!parent) throw new Error("Parent category not found");
      this.path = `${parent.path}/${this.slug}`;
      this.level = parent.level + 1;
    } else {
      this.path = this.slug;
      this.level = 0;
    }

    // Update descendant paths when moving existing category
    if (!this.isNew && oldPath && oldPath !== this.path) {
      await this.updateDescendantPaths(this.path, this.level, oldLevel);
    }
  }
  next();
});

/**
 * Find all descendants (regex-safe)
 */
categorySchema.statics.findDescendants = function (categoryPath) {
  const escapedPath = escapeRegExp(categoryPath);
  return this.find({
    path: new RegExp(`^${escapedPath}/`),
    isActive: true,
  }).sort({ path: 1 });
};

/**
 * Find direct children
 */
categorySchema.statics.findChildren = function (parentId) {
  return this.find({ parent: parentId, isActive: true })
    .sort({ order: 1, name: 1 });
};

/**
 * Find root categories
 */
categorySchema.statics.findRoots = function () {
  return this.find({ level: 0, isActive: true })
    .sort({ order: 1, name: 1 });
};

/**
 * Get ancestor tree (single-query optimized)
 */
categorySchema.methods.getAncestorTree = async function () {
  if (this.level === 0) return [];
  
  const ancestorSlugs = this.ancestors;
  const ancestorPaths = ancestorSlugs.map((_, i) => 
    ancestorSlugs.slice(0, i + 1).join('/')
  );
  
  return mongoose.model("Category")
    .find({ path: { $in: ancestorPaths } })
    .sort({ level: 1 });
};

/**
 * Update descendant paths (regex-safe)
 */
categorySchema.methods.updateDescendantPaths = async function (
  newPath,
  newLevel,
  oldLevel
) {
  const oldPath = this.path;
  const levelOffset = newLevel - oldLevel;
  const escapedOldPath = escapeRegExp(oldPath);

  const descendants = await mongoose.model("Category").find({
    path: new RegExp(`^${escapedOldPath}/`)
  });

  const bulkOps = descendants.map(desc => ({
    updateOne: {
      filter: { _id: desc._id },
      update: {
        $set: {
          path: desc.path.replace(oldPath, newPath),
          level: desc.level + levelOffset
        }
      }
    }
  }));

  if (bulkOps.length > 0) {
    await mongoose.model("Category").bulkWrite(bulkOps);
  }
};

/**
 * Get category tree (optimized single-query)
 */
categorySchema.statics.getTree = async function (rootId = null) {
  try {
    let allCategories = [];
    
    if (rootId) {
      const root = await this.findById(rootId).lean();
      if (!root) return [];
      
      const escapedPath = escapeRegExp(root.path);
      allCategories = await this.find({
        $or: [
          { _id: rootId },
          { path: new RegExp(`^${escapedPath}/`) }
        ],
        isActive: true
      }).sort({ level: 1, order: 1, name: 1 }).lean();
    } else {
      allCategories = await this.find({ isActive: true })
        .sort({ level: 1, order: 1, name: 1 })
        .lean();
    }

    const categoryMap = {};
    const tree = [];

    // Build id-based map
    allCategories.forEach(cat => {
      categoryMap[cat._id] = { ...cat, children: [] };
    });

    // Build tree hierarchy
    allCategories.forEach(cat => {
      if (cat.parent && categoryMap[cat.parent]) {
        categoryMap[cat.parent].children.push(categoryMap[cat._id]);
      } else {
        tree.push(categoryMap[cat._id]);
      }
    });

    return tree;
  } catch (error) {
    throw new Error(`Error building category tree: ${error.message}`);
  }
};

const Category = mongoose.model("Category", categorySchema);
export default Category;