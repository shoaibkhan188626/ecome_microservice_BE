import Inventory from "../entities/Inventory.js";
import StockMovement from "../entities/StockMovement.js";
import lockManager from "../../infrastructure/cache/lockManager.js";
import redisClient from "../../infrastructure/cache/redisClient.js";
import logger from "../../utils/logger.js";
import config from "../../config/index.js";

/**
 * Inventory Service - Business Logic for Stock Management
 *
 * Features:
 * - Atomic stock operations with distributed locking
 * - Reservation system for cart/checkout
 * - Stock movement tracking
 * - Multi-warehouse support
 * - Low stock alerts
 *
 * Time Complexity: O(1) for most operations with proper locking
 */

class InventoryService {
  /**
   * create inventory record
   */

  async create(data) {
    try {
      const {
        productId,
        variantId,
        sku,
        quantity,
        warehouse,
        lowStockThreshold,
        reorderPoint,
        reorderQuantity,
        allowBackorder,
        location,
      } = data;

      //check if inventory already exists
      const existing = await Inventory.findOne({
        sku,
        warehouse: warehouse || "main",
      });

      if (existing) {
        throw new Error(
          "Inventory record already exists for this SKU and warehouse",
        );
      }

      const inventory = new Inventory({
        productId,
        variantId,
        sku,
        quantity: quantity || 0,
        warehouse: warehouse || "main",
        lowStockThreshold,
        reorderPoint,
        reorderQuantity,
        allowBackorder: allowBackorder || false,
        location,
        lastRestocked: quantity > 0 ? new Date() : null,
      });

      await inventory.save();

      //Record initial stock movement
      if (quantity > 0) {
        await StockMovement.recordMovement({
          inventoryId: inventory._id,
          productId,
          sku,
          type: "purchase",
          quantityBefore: 0,
          quantityChange: quantity,
          quantityAfter: quantity,
          warehouse: inventory.warehouse,
          reason: "Initial stock",
          performedBySystem: true,
        });
      }

      logger.info(`Inventory created : ${sku} - Qty :${quantity}`);

      return inventory;
    } catch (error) {
      logger.error("Create inventory error:", error);
      throw error;
    }
  }

  /**
   * Get inventory by SKU
   */

  async getBySKU(sku, warehouse = "main") {
    try {
      const inventory = await Inventory.findBySku(sku, warehouse);

      if (!inventory) {
        throw new Error("Inventory not found");
      }
      return inventory;
    } catch (error) {
      logger.error("Get inventory error:", error);
      throw error;
    }
  }

  /**
   * Get inventory by product
   */

  async getByProduct(productId, warehouse = null) {
    try {
      return await Inventory.findByProduct(productId, warehouse);
    } catch (error) {
      logger.error("Get inventory by product error:", error);
      throw error;
    }
  }

  /**
   * Check stock availability
   */

  async checkAvailability(sku, requestedQty, warehouse = "main") {
    try {
      const inventory = await this.getBySKU(sku, warehouse);
      return inventory.canFulfill(requestedQty);
    } catch (error) {
      logger.error("Check availability error:", error);
      throw error;
    }
  }

  /**
   * Reserve stock (with distributed lock)
   * CRITICAL: Prevents overselling
   * Time Complexity: O(1) with lock
   *
   * @param {String} sku - SKU to reserve
   * @param {Number} quantity - Quantity to reserve
   * @param {String} reservationId - Unique reservation ID (cart/order ID)
   * @param {Number} ttl - Reservation TTL in seconds
   */

  async reserveStock(
    sku,
    quantity,
    reservationId,
    ttl = config.inventory.reservationTTL,
  ) {
    const lockResource = `inventory;${sku}`;

    try {
      return await lockManager.withLock(lockResource, async () => {
        const inventory = await Inventory.reserveStock(
          sku,
          quantity,
          reservationId,
        );

        if (!inventory) {
          throw new Error("Insufficient stock or inventory not found");
        }

        //Record movement
        await StockMovement.recordMovement({
          inventoryId: inventory._id,
          productId: inventory.productId,
          sku,
          type: "reservation",
          quantityBefore: inventory.quantity,
          quantityChange: 0,
          quantityAfter: inventory.quantity,
          reservedBefore: inventory.reserved - quantity,
          reservedAfter: inventory.reserved,
          warehouse: inventory.warehouse,
          referenceId: reservationId,
          reason: "Stock reserved for checkout",
          performedBySystem: true,
        });

        const reservationKey = `reservation:${reservationId}:${sku}`;

        await redisClient.set(
          reservationId,
          JSON.stringify({
            sku,
            quantity,
            reservedAt: new Date().toISOString(),
          }),
          ttl,
        );
        logger.info(
          `Stock reserved;${sku} - Qty: ${quantity} - Reservation: ${reservationId}`,
        );

        return inventory;
      });
    } catch (error) {
      logger.error("Reservation stock error:", error);
      throw error;
    }
  }

  /**
   * Release reservation (cancel it basically)
   */

  async releaseReservation(sku, quantity, reservationId) {
    const lockResource = `invwntory:${sku}`;

    try {
      return await lockManager.withLock(lockResource, async () => {
        const inventory = await Inventory.releaseReservation(sku, quantity);

        if (!inventory) {
          throw new Error("Inventory not found");
        }

        await StockMovement.recordMovement({
          inventoryId: inventory._id,
          productId: inventory.productId,
          sku,
          type: "release",
          quantifyBefore: inventory.quantity,
          quantityChange: 0,
          quantityAfter: inventory.quantity,
          reservedBefore: inventory.reserved + quantity,
          reservedAfter: inventory.reserved,
          warehouse: inventory.warehouse,
          referenceType: "order",
          referenceId: reservationId,
          reason: "Reservation cancelled",
          performBySystem: true,
        });

        const reservationKey = `reservation:${reservationId}:${sku}`;
        await redisClient.del(reservationKey);

        logger.info(`Reservation released:${sku} - Qty : ${quantity}`);

        return inventory;
      });
    } catch (error) {
      logger.error("Release reservation error : ", error);
      throw error;
    }
  }

  /**
   * commit reservation (convert it to sale)
   */

  async commitReservation(sku, quantity, orderId) {
    const lockResource = `inventory:${sku}`;

    try {
      return await lockManager.withLock(lockResource, async () => {
        const inventory = await Inventory.commitReservation(sku, quantity);

        if (!inventory) {
          throw new Error("Insufficient reserved stock");
        }

        await StockMovement.recordMovement({
          inventoryId: inventory._id,
          productId: inventory.productId,
          sku,
          type: "commit",
          quantityBefore: inventory.quantity + quantity,
          quantityChange: -quantity,
          quantityAfter: inventory.quantity,
          reservedBefore: inventory.reserved + quantity,
          reservedAfter: inventory.reserved,
          warehouse: inventory.warehouse,
          referenceType: "order",
          referenceId: orderId,
          reason: "Order completed",
          performedBySystem: true,
        });

        //remove reservation from redis
        const reservationKey = `reservation:${orderId}:${sku}`;
        await redisClient.del(reservationKey);

        logger.info(
          `Reservation committed: ${sku} - Qty ${quantity} - Order: ${orderId}`,
        );
        return inventory;
      });
    } catch (error) {
      logger.error("Commit reservation error:", error);
      throw error;
    }
  }

  /**
   * Adjust stock manually
   */

  async adjustStock(sku, quantity, reason, userId = null) {
    const lockResource = `inventory: ${sku}`;

    try {
      return await lockManager.withLock(lockResource, async () => {
        const inventoryBefore = await this.getBySKU(sku);
        const inventory = await Inventory.adjustStock(sku, quantity, reason);

        if (!inventory) {
          throw new Error("Inventory not found");
        }

        await StockMovement.recordMovement({
          inventoryId: inventory._id,
          productId: inventory.productId,
          sku,
          type: "adjustment",
          quantityBefore: inventoryBefore.quantity,
          quantityChange: quantity,
          quantityAfter: inventory.quantity,
          warehouse: inventory.warehouse,
          reason,
          performedBy: userId,
          performedBySystem: userId ? false : true,
        });

        logger.info(
          `Stock adjusted :${sku} - Change:${quantity} - Reason: ${reason}`,
        );

        return inventory;
      });
    } catch (error) {
      logger.error("Adjust stock error:", error);
      throw error;
    }
  }

  /**
   * Get low stock
   */

  async getLowStock(warehouse = null) {
    try {
      return await Inventory.findLowStock(warehouse);
    } catch (error) {
      logger.error("Get low stock error:", error);
      throw error;
    }
  }

  /**
   * Get stock movements
   */

  async getMovements(productId, options = {}) {
    try {
      return await StockMovement.findByProduct(productId, options);
    } catch (error) {
      logger.error("Get movements error:", error);
      throw error;
    }
  }

  /**
   * Update inventory settings
   */

  async updateSettings(sku, settings) {
    try {
      const inventory = await this.getBySKU(sku);

      const {
        lowStockThreshold,
        reorderPoint,
        reorderQuantity,
        allowBackorder,
        location,
      } = settings;

      if (lowStockThreshold !== undefined)
        inventory.lowStockThreshold = lowStockThreshold;
      if (reorderPoint !== undefined) inventory.reorderPoint = reorderPoint;
      if (reorderQuantity !== undefined)
        inventory.reorderQuantity = reorderQuantity;
      if (allowBackorder !== undefined)
        inventory.allowBackorder = allowBackorder;
      if (location !== undefined) inventory.location = location;

      await inventory.save();

      logger.info(`Inventory settings updated: ${sku}`);

      return inventory;
    } catch (error) {
      logger.error("Updated settings error;", error);
      throw error;
    }
  }
}

export default new InventoryService();
