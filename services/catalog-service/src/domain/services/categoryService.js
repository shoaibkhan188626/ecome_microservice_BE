import Category from "../entities/Category.js";
import logger from "../../utils/logger.js";

/**
 * category service - business logic for categories
 * handles CRUD operations and tree management
 */

class CategoryService {
  /**
   * create new category
   */
  async create(data) {
    try {
      const {
        name,
        description,
        parent,
        image,
        metaTitle,
        metaDescription,
        order,
      } = data;

      //validate parent exists if provided
      if (parent) {
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
          throw new Error("Parent category not found");
        }
        if (!parentCategory.isActive) {
          throw new Error("Parent category is inactive");
        }
      }

      const category = new Category({
        name,
        description,
        parent: parent || null,
        image,
        metaTitle,
        metaDescription,
        order: order || 0,
      });

      await category.save();

      logger.info(`Category created: ${category.name} (${category._id})`);
      return category;
    } catch (error) {
      logger.error("Create category error:", error);
      throw error;
    }
  }

  /**Get category by ID */

  async getById(categoryId, includeInactive = false) {
    try {
      const query = { _id: categoryId };
      if (!includeInactive) {
        query.isActive = true;
      }

      const category = await Category.findOne(query).populate(
        "parent",
        "name slug path",
      );
      if (!category) {
        throw new Error("Category not found");
      }
      return category;
    } catch (error) {
      logger.error("Get category error:", error);
      throw error;
    }
  }

  /**
   * Get category by slug
   */

  async getBySlug(slug) {
    try {
      const category = await Category.findOne({
        slug,
        isActive: true,
      }).populate("parent", "name slug path");
      if (!category) {
        throw new Error("Category not found");
      }
      return category;
    } catch (error) {
      logger.error("Get category");
      throw error;
    }
  }

  /**get all root (level 0 ) */

  async getRoots() {
    try {
      return await Category.findRoots();
    } catch (error) {
      logger.error("Get Root categories error:", error);
      throw error;
    }
  }

  /**
   * get direct children of a Category
   */

  async getChildren(categoryId) {
    try {
      return await Category.findChildren(categoryId);
    } catch (error) {
      logger.error("Get Children error:", error);
      throw error;
    }
  }

  /**
   * get all descandants (recursive children)
   */

  async getDescendants(categoryId) {
    try {
      const category = await this.getById(categoryId);
      return await Category.findDescendants(category.path);
    } catch (error) {
      logger.error("Get descendants error:", error);
      throw error;
    }
  }

  /**
   * get full category tree
   */

  async getTree(rootId = null) {
    try {
      return await Category.getTree(rootId);
    } catch (error) {
      logger.error("get root category", error);
      throw error;
    }
  }

  /**
   * Get bread crumb trail for a category
   */
  async getBreadcrumbs(categoryId) {
    try {
      const category = await this.getById(categoryId);
      const ancestors = await category.getAncestorTree();

      return [...ancestors, category];
    } catch (error) {
      logger.error("Get breadcrumbs error:", error);
      throw error;
    }
  }

  /**
   * Update category
   */
  async update(categoryId, data) {
    try {
      const category = await Category.findById(categoryId);

      if (!category) {
        throw new Error("Category not found");
      }
      const {
        name,
        description,
        parent,
        image,
        metaTitle,
        metaDescription,
        order,
        isActive,
      } = data;
      const isMoving =
        parent !== undefined && parent !== category.parent?.toString();

      if (isMoving) {
        //validate new parent
        if (parent) {
          const newParent = await Category.findById(parent);
          if (!newParent) {
            throw new Error("New Parent category not found");
          }

          //prevent moving to own descendant
          if (newParent.path.startsWith(category.path)) {
            throw new Error("Cannot move category to its own descendant");
          }
        }
        //Update parent reference
        category.parent = parent || null;
        await category.save();

        //update all descendant paths
        await category.updateDescendantPaths(category.path);
      }
      if (name !== undefined) category.name = name;
      if (description !== undefined) category.description = description;
      if (image !== undefined) category.image = image;
      if (metaTitle !== undefined) category.metaTitle = metaTitle;
      if (metaDescription !== undefined)
        category.metaDescription = metaDescription;
      if (order !== undefined) category.order = order;
      if (isActive !== undefined) category.isActive = isActive;

      await category.save();

      logger.info(`Category updated:${category.name} (${category._id})`);

      return category;
    } catch (error) {
      logger.error("Update category error:", error);
      throw error;
    }
  }

  /**
   * Delete category
   */

  async delete(categoryId) {
    try {
      const category = await Category.findById(categoryId);

      if (!category) {
        throw new Error("Category not found");
      }

      //get all descendants
      const descendants = await Category.findDescendants(category.path);

      //check if category or descendants have products
      //this will be implemented when we add product count
      if (category.productCount > 0) {
        throw new Error("Cannot delete category with products");
      }

      //soft delete - mark as inactive
      category.isActive = false;
      await category.save();

      //also delete all descendants
      if (descendants.length > 0) {
        await Category.updateMany(
          { _id: { $in: descendants.map((d) => d._id) } },
          { isActive: false },
        );
      }
      logger.info(
        `Category deleted (soft): ${category.name} (${category._id})`,
      );

      return { message: "Category deleted successfully" };
    } catch (error) {
      logger.error("Delete category error:", error);
      throw error;
    }
  }

  /**
   * Re-order categories
   */

  async reorder(categoryOrders) {
    try {
      //category orders [{id:'123',order:1},{id:'456',order:2}]
      const bulkOps = categoryOrders.map(({ id, order }) => ({
        updateOne: {
          filter: { _id: id },
          update: { order },
        },
      }));

      await Category.bulkWrite(bulkOps);

      logger.info(`Reordered ${categoryOrders.length} categories`);

      return { message: "Categories reordered successfully" };
    } catch (error) {
      logger.error("Router categories error:", error);
      throw error;
    }
  }

  /**
   * Search categories by name
   */

  async search(query) {
    try {
      const categories = await Category.find({
        name: { $regex: query, $options: "i" },
      })
        .limit(20)
        .sort({ name: 1 });

      return categories;
    } catch (error) {
      logger.error("Search categories error:", error);
      throw error;
    }
  }

  /**
   * Get all categories (with pagination)
   */

  async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = "name",
        order = "asc",
        level = null,
        parent = null,
        includeInactive = false,
      } = options;

      const query = {};

      if (!includeInactive) {
        query.isActive = true;
      }

      if (level !== null) {
        query.level - level;
      }

      if (parent !== null) {
        query.parent = parent || null;
      }

      const skip = (page - 1) * limit;
      const sortObj = { [sort]: order === "asc" ? 1 : -1 };

      const [categories, total] = await Promise.all([
        Category.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate("parent", "name slug"),
        Category.countDocuments(query),
      ]);

      return {
        categories,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Get all categories error:", error);
      throw error;
    }
  }
}

export default new CategoryService();
