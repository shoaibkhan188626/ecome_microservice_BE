import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "inventory-service",
  config.logLevel,
  config.isProduction,
);

class InventoryController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  async create(req, res) {
    try {
      const inventory = await this.inventoryService.create(req.body);
      return ResponseHandler.success(res, inventory, 201);
    } catch (error) {
      logger.error("Create inventory controller error:", error);
      if (error.message.includes("already exists")) {
        return ResponseHandler.conflict(res, error.message);
      }
      return ResponseHandler.error(res, "CREATE_FAILED", error.message, 400);
    }
  }

  async getBySKU(req, res) {
    try {
      const { sku } = req.params;
      const { warehouse } = req.query;

      const inventory = await this.inventoryService.getBySKU(sku, warehouse);
      return ResponseHandler.success(res, inventory);
    } catch (error) {
      logger.error("Get inventory controller error:", error);
      return ResponseHandler.notFound(res, "Inventory");
    }
  }

  async getByProduct(req, res) {
    try {
      const { productId } = req.params;
      const { warehouse } = req.query;

      const inventories = await this.inventoryService.getByProduct(
        productId,
        warehouse,
      );
      return ResponseHandler.success(res, inventories);
    } catch (error) {
      logger.error("Get inventory by product error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  async checkAvailability(req, res) {
    try {
      const { sku, quantity, warehouse } = req.body;

      if (!sku || !quantity) {
        return ResponseHandler.validationError(res, [
          { field: "sku", message: "SKU is required" },
          { field: "quantity", message: "Quantity is required" },
        ]);
      }

      const availability = await this.inventoryService.checkAvailability(
        sku,
        quantity,
        warehouse,
      );
      return ResponseHandler.success(res, availability);
    } catch (error) {
      logger.error("Check availability error:", error);
      return ResponseHandler.error(res, "CHECK_FAILED", error.message, 400);
    }
  }

  async reserveStock(req, res) {
    try {
      const { sku, quantity, reservationId, ttl } = req.body;

      const inventory = await this.inventoryService.reserveStock(
        sku,
        quantity,
        reservationId,
        ttl,
      );
      return ResponseHandler.success(res, {
        inventory,
        message: "Stock reserved successfully",
        reservationId,
      });
    } catch (error) {
      logger.error("Reserve stock controller error:", error);
      if (error.message.includes("Insufficient")) {
        return ResponseHandler.error(
          res,
          "INSUFFICIENT_STOCK",
          error.message,
          409,
        );
      }
      if (error.message.includes("lock")) {
        return ResponseHandler.error(
          res,
          "LOCK_FAILED",
          "Unable to acquire lock, try again",
          503,
        );
      }
      return ResponseHandler.error(res, "RESERVE_FAILED", error.message, 400);
    }
  }

  async releaseReservation(req, res) {
    try {
      const { sku, quantity, reservationId } = req.body;

      const inventory = await this.inventoryService.releaseReservation(
        sku,
        quantity,
        reservationId,
      );
      return ResponseHandler.success(res, {
        inventory,
        message: "Reservation released successfully",
      });
    } catch (error) {
      logger.error("Release reservation error:", error);
      return ResponseHandler.error(res, "RELEASE_FAILED", error.message, 400);
    }
  }

  async commitReservation(req, res) {
    try {
      const { sku, quantity, orderId } = req.body;

      if (!orderId) {
        return ResponseHandler.validationError(res, [
          { field: "orderId", message: "Order ID is required" },
        ]);
      }

      const inventory = await this.inventoryService.commitReservation(
        sku,
        quantity,
        orderId,
      );
      return ResponseHandler.success(res, {
        inventory,
        message: "Reservation committed successfully",
        orderId,
      });
    } catch (error) {
      logger.error("Commit reservation error:", error);
      if (error.message.includes("Insufficient")) {
        return ResponseHandler.error(res, "COMMIT_FAILED", error.message, 409);
      }
      return ResponseHandler.error(res, "COMMIT_FAILED", error.message, 400);
    }
  }

  async adjustStock(req, res) {
    try {
      const { sku, quantity, reason } = req.body;
      const userId = req.user?.id || null;

      const inventory = await this.inventoryService.adjustStock(
        sku,
        quantity,
        reason,
        userId,
      );
      return ResponseHandler.success(res, {
        inventory,
        message: "Stock adjusted successfully",
      });
    } catch (error) {
      logger.error("Adjust stock error:", error);
      return ResponseHandler.error(res, "ADJUST_FAILED", error.message, 400);
    }
  }

  async getLowStock(req, res) {
    try {
      const { warehouse } = req.query;

      const items = await this.inventoryService.getLowStock(warehouse);
      return ResponseHandler.success(res, items);
    } catch (error) {
      logger.error("Get low stock error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  async getMovements(req, res) {
    try {
      const { productId } = req.params;
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        type: req.query.type,
        warehouse: req.query.warehouse,
        limit: parseInt(req.query.limit) || 100,
      };

      const movements = await this.inventoryService.getMovements(
        productId,
        options,
      );
      return ResponseHandler.success(res, movements);
    } catch (error) {
      logger.error("Get movements error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  async updateSettings(req, res) {
    try {
      const { sku } = req.params;
      const inventory = await this.inventoryService.updateSettings(
        sku,
        req.body,
      );
      return ResponseHandler.success(res, inventory);
    } catch (error) {
      logger.error("Update settings error:", error);
      return ResponseHandler.error(res, "UPDATE_FAILED", error.message, 400);
    }
  }
}

export default InventoryController;
