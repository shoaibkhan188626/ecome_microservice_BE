import express from "express";
import productController from "../controllers/product-controller.js";
import {
  validateProduct,
  validatePagination,
} from "../middlewares/validate.js";
const router = express.Router();
router.get("/featured", productController.getFeatured);
router.get("/search", validatePagination, productController.search);
router.get("/", validatePagination, productController.getAll);
router.get("/slug/:slug", productController.getBySlug);
router.get("/:id", productController.getById);
router.post("/", validateProduct, productController.create);
router.put("/:id", productController.update);
router.delete("/:id", productController.delete);
export default router;
