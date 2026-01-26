import express from "express";
import categoryController from "../controllers/categoryController.js";
import {
  validateCategory,
  validatePagination,
} from "../middlewares/validate.js";

const router = express.Router();

/**
 * Category Routes
 * All routes are prefixed with /categories
 */

// Get category tree
router.get("/tree", categoryController.getTree);

// Get root categories
router.get("/roots", categoryController.getRoots);

// Get all categories (paginated)
router.get("/", validatePagination, categoryController.getAll);

// Get category by slug
router.get("/slug/:slug", categoryController.getBySlug);

// Get category by ID
router.get("/:id", categoryController.getById);

// Get category children
router.get("/:id/children", categoryController.getChildren);

// Get breadcrumbs
router.get("/:id/breadcrumbs", categoryController.getBreadcrumbs);

// Create category
router.post("/", validateCategory, categoryController.create);

// Update category
router.put("/:id", validateCategory, categoryController.update);

// Delete category
router.delete("/:id", categoryController.delete);

export default router;
