import express from "express";
import productController from "../controllers/productController.js";
import {
  validateProduct,
  validatePagination,
} from "../middlewares/validate.js";

const router = express.Router();

/**
 * Product Routes
 * ALL routes are prefixed with /products
 */

//get featured products
router.get("/featured", productController.getFeatured);

//search products
router.get("/search", validatePagination, productController.search);

//get all products (admin)
router.get("/", validatePagination, productController.getAll);

//get product by slug
router.get("/slug/:slug", productController.getBySlug);

//get product by ID
router.get("/:id", productController.getById);

//create product
router.post("/", validateProduct, productController.create);

//update product
router.put("/:id", productController.update);

//delete product
router.delete("/:id", productController.delete);

export default router;
