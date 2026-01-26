import express from "express";
import categoryRoutes from "./categoryRoutes.js";
import productRoutes from "./productRoutes.js";
import productController from "../controllers/productController.js";

const router = express.Router();

//category routes
router.use("/categories", categoryRoutes);

//Product routes
router.use("/products", productRoutes);

//get products by category (special route)
router.get("/categories/:categoryId/products", productController.getByCategory);

export default router;
