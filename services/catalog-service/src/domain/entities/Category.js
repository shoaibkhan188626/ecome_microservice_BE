import mongoose, { mongo } from "mongoose";
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
    },

    // Level in tree (0=root)
    level: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },

    //   Order for display
    order: {
      type: Number,
      default: 0,
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

categorySchema.pre("save", async function () {
  //Generating slug from name if not provided
  if (this.isModified("name") && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  //Build Path and set level
  if (this.isModified("parent") || this.isNew) {
    if (this.parent) {
      //find parent to build path
      const parent = await mongoose.model("Category").findById(this.parent);
      if (!parent) {
        throw new Error("Parent category not found");
      }
      this.path = `${parent.path}/${this.slug}`;
      this.level = parent.level + 1;
    } else {
      //Root category
      this.path = this.slug;
      this.level = o;
    }
  }
});

/**
 * Static : Find all descendants (children, grandChildren, etc.)
 * @param {String} categoryPath - Category path
 * @returns {Promise<Array>} Array of descendants categories
 */
categorySchema.static.findDescendants = function (categoryPath) {
  return this.find({
    path: new RegExp(`^${categoryPath}/`), //regex starts with path
    isActive: true,
  }).sort({ path: 1 });
};

/**
 * static : find direct children only
 * @param {ObjectId} parentId - Parent Category ID
 * @returns {Promise<Array>} Array of child categories
 */

categorySchema.static.findChildren = function (parentId) {
  return this.find({ parent: parentId, isActive: true }).sort({
    order: 1,
    name: 1,
  });
};

/**
 * static : find root category (level 0)
 * @returns {Promise<Array>} Array of root categories
 */
categorySchema.static.findRoots = function () {
  return this.find({ level: 0, isActive: true }).sort({ order: 1, name: 1 });
};

/**
 * Instance method : Get ful tree path as array of objects
 * @returns {Promise<Array>}
 */
categorySchema.methods.getAncestorTree = async function () {
  if (this.level === 0) return [];

  const ancestorPaths = this.ancestors;
  const ancestors = [];

  for (const path of ancestorPaths) {
    const category = await mongoose.model("Category").findOne({ path });
    if (category) ancestors.push(category);
  }
  return ancestors;
};

/**
 * Instance method : Update path for all descendants when category moves
 * Expensive Operation - user sparingly
 * @param {String} newPath - New path for this category
 */
categorySchema.methods.updateDescendantPaths = async function (newPath) {
  const oldPath = this.path;
  const descendants = await mongoose.model("Category").findDescendants(oldPath);

  //update all descendants paths
  const bulkOps = descendants.map((desc) => ({
    updatePne: {
      filter: { _id: desc._id },
      update: {
        path: desc.path.replace(oldPath, newPath),
        level: desc.level + (this.level - desc.level),
      },
    },
  }));

  if (bulkOps.length > 0) {
    await mongoose.model("Category").bulkWrite(bulkOps);
  }
};

/**
 * Static : Get category tree (nested structure)
 * @param {ObjectId} rootId - Root category ID (optional)
 * @returns {Promise<Array>} Nested category tree
 */
categorySchema.static.getTree = async function (rootId = null) {
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
};

const Category = mongoose.model("Category", categorySchema);

export default Category;
