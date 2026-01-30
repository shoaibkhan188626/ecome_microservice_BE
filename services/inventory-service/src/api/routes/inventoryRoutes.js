import express from "express";
import {
  validateInventory,
  validateReservation,
  validateAdjustment,
} from "../middlewares/validate.js";

const createInventoryRoutes = (inventoryController) => {
  const router = express.Router();

  router.get(
    "/low-stock",
    inventoryController.getLowStock.bind(inventoryController),
  );

  router.post(
    "/check",
    inventoryController.checkAvailability.bind(inventoryController),
  );

  router.post(
    "/reserve",
    validateReservation,
    inventoryController.reserveStock.bind(inventoryController),
  );

  router.post(
    "/release",
    validateReservation,
    inventoryController.releaseReservation.bind(inventoryController),
  );

  router.post(
    "/commit",
    validateReservation,
    inventoryController.commitReservation.bind(inventoryController),
  );

  router.post(
    "/adjust",
    validateAdjustment,
    inventoryController.adjustStock.bind(inventoryController),
  );

  router.get(
    "/product/:productId",
    inventoryController.getByProduct.bind(inventoryController),
  );

  router.get(
    "/:productId/movements",
    inventoryController.getMovements.bind(inventoryController),
  );

  router.get("/:sku", inventoryController.getBySKU.bind(inventoryController));

  router.put(
    "/:sku/settings",
    inventoryController.updateSettings.bind(inventoryController),
  );

  router.post(
    "/",
    validateInventory,
    inventoryController.create.bind(inventoryController),
  );

  return router;
};

export default createInventoryRoutes;
