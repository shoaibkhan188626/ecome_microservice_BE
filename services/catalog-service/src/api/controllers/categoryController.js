import categoryService from "../../domain/services/categoryService.js";
import ResponseHandler from "../../utils/responseHandler.js";
import logger from "../../utils/logger.js";

class CategoryController {
  /**
   * Create category
   * POST /categories
   */

  async create(req, res) {
    try {
      const category = await categoryService.create(req.body);
      return ResponseHandler.success(res, category, 201);
    } catch (error) {
      logger.error("Create category controller error:", error);
      if (error.message.includes("Parent")) {
        return ResponseHandler.error(res, "INVALID_PARENT", error.message, 400);
      }
      return ResponseHandler.error(res, "CREATE_FAILED", error.message, 400);
    }
  }

  /**
   * Get category by ID
   * GET /categories/:id
   */

  async getById(req, res) {
    try {
      const category = await categoryService.getById(req.params.id);
      return ResponseHandler.success(res, category);
    } catch (error) {
      logger.error("Get category controller error:", error);
      return ResponseHandler.notFound(res, "Category");
    }
  }

  /**
   * Get category by slug
   * GET /categories/slug/:slug
   */

  async getBySlug(req, res) {
    try {
      const category = await categoryService.getBySlug(req.params.slug);
      return ResponseHandler.success(res, category);
    } catch (error) {
      logger.error("Get category by slug error:", error);
      return ResponseHandler.notFound(res, "Category");
    }
  }

  /**
   * Get root categories
   * GET /categories/roots
   */

  async getRoots(req, res) {
    try {
      const categories = await categoryService.getRoots();
      return ResponseHandler.success(res, categories);
    } catch (error) {
      logger.error("Get roots controller error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  /**
   * get category children
   * GET /categories/:id/children
   */

  async getChildren(req, res) {
    try {
      const children = await categoryService.getChildren(req.params.id);
      return ResponseHandler.success(res, children);
    } catch (error) {
      logger.error("Get children controller error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  /**
   * Get category tree
   * GET /categories/tree
   */

  async getTree(req, res) {
    try {
      const tree = await categoryService.getTree();
      return ResponseHandler.success(res, tree);
    } catch (error) {
      logger.error("Get tree controller error", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  /**
   * Get breadcrumbs
   * GET /categories/:id/breadcrumbs
   */

  async getBreadCrumbs(req, res) {
    try {
      const breadCrumbs = await categoryService.getBreadcrumbs(req.params.id);
      return ResponseHandler.success(res, breadCrumbs);
    } catch (error) {
      logger.error("Get breadcrumbs error:", error);
      return ResponseHandler.notFound(res, "Category");
    }
  }

  /**
   * Update category
   * PUT /categories/:id
   */

  async update(req, res) {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      return ResponseHandler.success(res, category);
    } catch (error) {
      logger.error("Update category controller error:", error);
      if (error.message.includes("descendant")) {
        return ResponseHandler.error(res, "INVALID_MOVE", error.message, 400);
      }
      return ResponseHandler.error(res, "UPDATE_FAILED", error.message, 400);
    }
  }

  /**
   * Delete category
   * DELETE /categories/:id
   */

  async delete(req, res) {
    try {
      const result = await categoryService.delete(req.params.id);
      return ResponseHandler.success(res, result);
    } catch (error) {
      logger.error("Delete category controller error:", error);
      if (error.message.includes("products")) {
        return ResponseHandler.error(res, "HAS_PRODUCT", error.message, 400);
      }
      return ResponseHandler.error(res, "DELETE_FAILED", error.message, 400);
    }
  }

  /**
   * Get all categories (paginated)
   * GET /categories
   */

  async getAll(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || "name",
        order: req.query.order || "asc",
        level: req.query.level ? parseInt(req.query.level) : null,
        parent: req.query.parent || null,
      };

      const result = await categoryService.getAll(options);
      return ResponseHandler.paginated(
        res,
        result.categories,
        result.pagination.page,
        result.pagination.total,
      );
    } catch (error) {
      logger.error("Get all categories error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }
}

export default new CategoryController();
