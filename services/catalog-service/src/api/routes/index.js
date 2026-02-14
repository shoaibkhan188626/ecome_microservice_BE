import express from "express";
import categoryRoutes from "./category-routes.js";
import productRoutes from "./product-routes.js";
import productController from "../controllers/product-controller.js";
const router = express.Router();
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.get("/categories/:categoryId/products", productController.getByCategory);
export default router;
