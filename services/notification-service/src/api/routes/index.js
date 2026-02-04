import express from "express";
import notificationRoutes from "./notificationRoutes.js";

const router = express.Router();

router.use("/", notificationRoutes);

export default router;
