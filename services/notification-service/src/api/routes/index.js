import express from "express";
import notificationRoutes from "./notification-routes.js";

const router = express.Router();

router.use("/", notificationRoutes);

export default router;
