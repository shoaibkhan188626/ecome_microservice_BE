import express from "express";
import categoryController from "../controllers/category-controller.js";
import {
  validateCategory,
  validatePagination,
} from "../middlewares/validate.js";
const router = express.Router();
router.get("/tree", categoryController.getTree);
router.get("/roots", categoryController.getRoots);
router.get("/", validatePagination, categoryController.getAll);
router.get("/slug/:slug", categoryController.getBySlug);
router.get("/:id", categoryController.getById);
router.get("/:id/children", categoryController.getChildren);
router.get("/:id/breadcrumbs", categoryController.getBreadcrumbs);
router.post("/", validateCategory, categoryController.create);
router.put("/:id", validateCategory, categoryController.update);
router.delete("/:id", categoryController.delete);
export default router;
