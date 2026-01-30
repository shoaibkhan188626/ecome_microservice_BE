import productService from "../../domain/services/productService.js";
import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "catalog-service",
  config.logLevel,
  config.isProduction,
);

class ProductController {
  async create(req, res) {
    try {
      const product = await productService.create(req.body);
      return ResponseHandler.success(res, product, 201);
    } catch (error) {
      logger.error("Create product controller error:", error);
      if (error.message.includes("SKU")) {
        return ResponseHandler.conflict(res, error.message);
      }
      if (error.message.includes("category")) {
        return ResponseHandler.error(
          res,
          "INVALID_CATEGORY",
          error.message,
          400,
        );
      }
      return ResponseHandler.error(res, "CREATE_FAILED", error.message, 400);
    }
  }

  async getById(req, res) {
    try {
      const product = await productService.getById(req.params.id);
      return ResponseHandler.success(res, product);
    } catch (error) {
      logger.error("Get product controller error:", error);
      return ResponseHandler.notFound(res, "Product");
    }
  }

  async getBySlug(req, res) {
    try {
      const product = await productService.getBySlug(req.params.slug);
      return ResponseHandler.success(res, product);
    } catch (error) {
      logger.error("Get product by slug error:", error);
      return ResponseHandler.notFound(res, "Product");
    }
  }

  async getByCategory(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || "createdAt",
        order: req.query.order || "desc",
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        brand: req.query.brand,
      };

      const result = await productService.getByCategory(
        req.params.categoryId,
        options,
      );
      return ResponseHandler.paginated(
        res,
        result.products,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
      );
    } catch (error) {
      logger.error("Get products by category error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  async getFeatured(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const products = await productService.getFeatured(limit);
      return ResponseHandler.success(res, products);
    } catch (error) {
      logger.error("Get featured products error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  async search(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length === 0) {
        return ResponseHandler.validationError(res, [
          { field: "q", message: "Search query is required" },
        ]);
      }

      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        category: req.query.category,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
      };

      const result = await productService.search(q, options);
      return ResponseHandler.paginated(
        res,
        result.products,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
      );
    } catch (error) {
      logger.error("Search products error:", error);
      return ResponseHandler.error(res, "SEARCH_FAILED", error.message, 500);
    }
  }

  async update(req, res) {
    try {
      const product = await productService.update(req.params.id, req.body);
      return ResponseHandler.success(res, product);
    } catch (error) {
      logger.error("Update product controller error:", error);
      return ResponseHandler.error(res, "UPDATE_FAILED", error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const result = await productService.delete(req.params.id);
      return ResponseHandler.success(res, result);
    } catch (error) {
      logger.error("Delete product controller error:", error);
      return ResponseHandler.error(res, "DELETE_FAILED", error.message, 400);
    }
  }

  async getAll(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || "createdAt",
        order: req.query.order || "desc",
        status: req.query.status,
        category: req.query.category,
        search: req.query.search,
      };

      const result = await productService.getAll(options);
      return ResponseHandler.paginated(
        res,
        result.products,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
      );
    } catch (error) {
      logger.error("Get all products error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }
}

export default new ProductController();
