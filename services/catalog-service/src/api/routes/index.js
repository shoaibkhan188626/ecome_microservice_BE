import express from "express";
import categoryRoutes from "./category-routes.js";
import productRoutes from "./product-routes.js";
import productController from "../controllers/product-controller.js";

const router = express.Router();

//category routes
router.use("/categories", categoryRoutes);

//Product routes
router.use("/products", productRoutes);

//get products by category (special route)
router.get("/categories/:categoryId/products", productController.getByCategory);

export default router;
