import express from "express";
import { optionalAuth } from "../middlewares/optionalAuth.js";
import { sessionMiddleware } from "../middlewares/sessionMiddleware.js";

const createRoutes = (cartController) => {
  const router = express.Router();

  router.use(sessionMiddleware);
  router.use(optionalAuth);

  router.get("/", cartController.getCart.bind(cartController));
  router.get("/count", cartController.getItemCount.bind(cartController));
  router.post("/validate", cartController.validateCart.bind(cartController));
  router.post("/merge", cartController.mergeCart.bind(cartController));
  router.post("/items", cartController.addItem.bind(cartController));
  router.put(
    "/items/:productId",
    cartController.updateItemQuantity.bind(cartController),
  );
  router.delete(
    "/items/:productId",
    cartController.removeItem.bind(cartController),
  );
  router.delete("/", cartController.clearCart.bind(cartController));
  return router;
};

export default createRoutes;
