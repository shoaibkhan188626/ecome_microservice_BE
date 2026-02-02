import express from "express";
import { authenticate, optionalAuth } from "../middlewares/authenticate.js";
import { requireAdmin } from "../middlewares/authorize.js";

const createOrderRoutes = (orderController) => {
  const router = express.Router();

  // Public routes (guest order tracking)
  router.get(
    "/number/:orderNumber",
    optionalAuth,
    orderController.getOrderByNumber.bind(orderController),
  );

  // Protected routes (require authentication)
  router.use(authenticate);

  // Customer routes
  router.post("/", orderController.createOrder.bind(orderController));
  router.get("/my-orders", orderController.getMyOrders.bind(orderController));
  router.get("/:orderId", orderController.getOrderById.bind(orderController));
  router.get(
    "/:orderId/history",
    orderController.getOrderHistory.bind(orderController),
  );
  router.post(
    "/:orderId/payment",
    orderController.processPayment.bind(orderController),
  );
  router.post(
    "/:orderId/cancel",
    orderController.cancelOrder.bind(orderController),
  );

  // Admin routes
  router.get(
    "/",
    requireAdmin,
    orderController.getAllOrders.bind(orderController),
  );
  router.post(
    "/:orderId/process",
    requireAdmin,
    orderController.startProcessing.bind(orderController),
  );
  router.post(
    "/:orderId/ship",
    requireAdmin,
    orderController.shipOrder.bind(orderController),
  );
  router.post(
    "/:orderId/deliver",
    requireAdmin,
    orderController.deliverOrder.bind(orderController),
  );

  return router;
};

export default createOrderRoutes;
