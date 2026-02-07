import categoryService from "../../domain/services/category-service.js";
import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "catalog-service",
  config.logLevel,
  config.isProduction,
);

class CategoryController {
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

  async getById(req, res) {
    try {
      const category = await categoryService.getById(req.params.id);
      return ResponseHandler.success(res, category);
    } catch (error) {
      logger.error("Get category controller error:", error);
      return ResponseHandler.notFound(res, "Category");
    }
  }

  async getBySlug(req, res) {
    try {
      const category = await categoryService.getBySlug(req.params.slug);
      return ResponseHandler.success(res, category);
    } catch (error) {
      logger.error("Get category by slug error:", error);
      return ResponseHandler.notFound(res, "Category");
    }
  }

  async getRoots(req, res) {
    try {
      const categories = await categoryService.getRoots();
      return ResponseHandler.success(res, categories);
    } catch (error) {
      logger.error("Get roots controller error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  async getChildren(req, res) {
    try {
      const children = await categoryService.getChildren(req.params.id);
      return ResponseHandler.success(res, children);
    } catch (error) {
      logger.error("Get children controller error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  async getTree(req, res) {
    try {
      const tree = await categoryService.getTree();
      return ResponseHandler.success(res, tree);
    } catch (error) {
      logger.error("Get tree controller error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  async getBreadcrumbs(req, res) {
    try {
      const breadcrumbs = await categoryService.getBreadcrumbs(req.params.id);
      return ResponseHandler.success(res, breadcrumbs);
    } catch (error) {
      logger.error("Get breadcrumbs error:", error);
      return ResponseHandler.notFound(res, "Category");
    }
  }

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

  async delete(req, res) {
    try {
      const result = await categoryService.delete(req.params.id);
      return ResponseHandler.success(res, result);
    } catch (error) {
      logger.error("Delete category controller error:", error);
      if (error.message.includes("products")) {
        return ResponseHandler.error(res, "HAS_PRODUCTS", error.message, 409);
      }
      return ResponseHandler.error(res, "DELETE_FAILED", error.message, 400);
    }
  }

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
        result.pagination.limit,
        result.pagination.total,
      );
    } catch (error) {
      logger.error("Get all categories error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }
}

export default new CategoryController();
