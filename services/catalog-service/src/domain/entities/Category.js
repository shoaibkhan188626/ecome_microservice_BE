import mongoose from "mongoose";
import slugify from "slugify";

/**
 * Category Model with infinite Nesting Support
 *
 * Pattern: Materialized Path + Adjacency List (Hybrid)
 *
 * Performance:
 * - Find category by ID: O(1) with index
 * - Find all children: O(log n) with path index
 * - Find all ancestors: O(log n) with path parsing
 * - Move category: O(n) where n = number of descendants (rare operation)
 *
 * Example Structure:
 * Electronics (path: "Electronics", level: 0)
 *   └─ Phones (path: "Electronics/Phones", level: 1)
 *       └─ Smartphones (path: "Electronics/Phones/Smartphones", level: 2)
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

          // Fast cycle check using path
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
      min: [0, "Level cannot be true"],
    },

    //   Order for display
    order: {
      type: Number,
      default: 0,
      min: [0, "order cannot be negative"],
    },

    //   SEO fields
    metaTitle: {
      type: String,
      maxLength: [60, "Meta title too long"],
    },

    metaDescription: {
      type: String,
      maxLength: [160, "Meta description too long"],
    },

    //image
    image: {
      url: String,
      alt: String,
    },

    //status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    //counters (denormalized for performance)
    productCount: {
      type: Number,
      default: 0,
      min: [0, "Product count cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Compound indexes for optimized queries
 */

categorySchema.index({ path: 1, isActive: 1 }); // Find active children
categorySchema.index({ parent: 1, order: 1 }); // Find siblings ordered
categorySchema.index({ level: 1, isActive: 1 }); // Find categories by level

/**
 * Virtual : Get category ancestors from path
 */

categorySchema.virtual("ancestors").get(function () {
  if (!this.path || this.level === 0) return [];
  return this.path.split("/").slice(0, -1);
});

/**
 * Pre save hook to generate slug and path
 */

categorySchema.pre("save", async function (next) {
  // 1. Ensure slug exists
  if (this.isModified("name") || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  // 2. Handle Path/Level for NEW docs OR Parent/Slug changes
  if (this.isNew || this.isModified("parent") || this.isModified("slug")) {
    const oldPath = this.path;
    const oldLevel = this.level;

    // Calculate new Path and Level
    if (this.parent) {
      const parent = await mongoose.model("Category").findById(this.parent);
      if (!parent) throw new Error("Parent category not found");

      this.path = `${parent.path}/${this.slug}`;
      this.level = parent.level + 1;
    } else {
      this.path = this.slug;
      this.level = 0;
    }

    // 3. If updating an existing doc, update all descendants
    if (!this.isNew && oldPath && oldPath !== this.path) {
      // Pass the new Level and old Level to calculate the shift
      await this.updateDescendantPaths(this.path, this.level, oldLevel);
    }
  }
  next();
});

/**
 * Static : Find all descendants (children, grandChildren, etc.)
 * @param {String} categoryPath - Category path
 * @returns {Promise<Array>} Array of descendants categories
 */
categorySchema.statics.findDescendants = function (categoryPath) {
  try {
    return this.find({
      path: new RegExp(`^${categoryPath}/`), //regex starts with path
      isActive: true,
    }).sort({ path: 1 });
  } catch (error) {
    throw new Error(`Error finding descendants: ${error.message}`);
  }
};

/**
 * static : find direct children only
 * @param {ObjectId} parentId - Parent Category ID
 * @returns {Promise<Array>} Array of child categories
 */

categorySchema.statics.findChildren = function (parentId) {
  try {
    return this.find({ parent: parentId, isActive: true }).sort({
      order: 1,
      name: 1,
    });
  } catch (error) {
    throw new Error(`Error finding children: ${error.message}`);
  }
};

/**
 * static : find root category (level 0)
 * @returns {Promise<Array>} Array of root categories
 */
categorySchema.statics.findRoots = function () {
  try {
    return this.find({ level: 0, isActive: true }).sort({ order: 1, name: 1 });
  } catch (error) {
    throw new Error(`Error finding roots: ${error.message}`);
  }
};

/**
 * Instance method : Get ful tree path as array of objects
 * @returns {Promise<Array>}
 */
categorySchema.methods.getAncestorTree = async function () {
  if (this.level === 0) return [];

  try {
    const ancestorSlugs = this.ancestors; // ["electronics", "phones"]
    const ancestorPaths = ancestorSlugs.map((_, i) =>
      ancestorSlugs.slice(0, i + 1).join("/"),
    ); // ["electronics", "electronics/phones"]

    const ancestors = await mongoose
      .model("Category")
      .find({
        path: { $in: ancestorPaths },
      })
      .sort({ level: 1 });

    return ancestors;
  } catch (error) {
    throw new Error(`Error getting ancestor tree: ${error.message}`);
  }
};

/**
 * Instance method : Update path for all descendants when category moves
 * Expensive Operation - user sparingly
 * @param {String} newPath - New path for this category
 */
categorySchema.methods.updateDescendantPaths = async function (
  newPath,
  newLevel,
  oldLevel,
) {
  const oldPath = this.path;
  const levelOffset = newLevel - oldLevel; // How much levels shifted

  // Find descendants using the static method you already wrote
  const descendants = await mongoose.model("Category").find({
    path: new RegExp(`^${oldPath}/`),
  });

  const bulkOps = descendants.map((desc) => {
    const updatedPath = desc.path.replace(oldPath, newPath);
    return {
      updateOne: {
        filter: { _id: desc._id },
        update: {
          path: updatedPath,
          level: desc.level + levelOffset, // Correctly shifts level
        },
      },
    };
  });

  if (bulkOps.length > 0) {
    await mongoose.model("Category").bulkWrite(bulkOps);
  }
};

/**
 * Static : Get category tree (nested structure)
 * @param {ObjectId} rootId - Root category ID (optional)
 * @returns {Promise<Array>} Nested category tree
 */
categorySchema.statics.getTree = async function (rootId = null) {
  try {
    const query = rootId ? { parent: rootId } : { level: 0 };
    const categories = await this.find({ ...query, isActive: true }).sort({
      order: 1,
      name: 1,
    });

    //Recursive function to build tree
    const buildTree = async (category) => {
      const children = await this.find({
        parent: category._id,
        isActive: true,
      }).sort({ order: 1 });
      const categoryObj = category.toObject();

      if (children.length > 0) {
        categoryObj.children = await Promise.all(
          children.map((child) => buildTree(child)),
        );
      }
      return categoryObj;
    };
    return await Promise.all(categories.map((cat) => buildTree(cat)));
  } catch (error) {
    throw new Error(`Error getting tree: ${error.message}`);
  }
};

const Category = mongoose.model("Category", categorySchema);

export default Category;
