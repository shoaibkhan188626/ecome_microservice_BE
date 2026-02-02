import Order from "../entities/Order.js";
import {
  OrderStates,
  OrderEvents,
  canTransition,
  getNextState,
} from "../state-machine/orderStates.js";
import { createLogger, HTTPClient, DateHelper } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "order-service",
  config.logLevel,
  config.isProduction,
);

/**
 * Order Service - Business Logic for Order Management
 *
 * Features:
 * - Order creation from cart
 * - State machine workflow
 * - Inventory reservation/commit
 * - Payment integration hooks
 * - Order history and tracking
 *
 * Patterns:
 * - State Machine for order workflow
 * - CQRS for read/write separation (queries vs commands)
 * - Event sourcing (state history)
 */
class OrderService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.cartService = new HTTPClient(config.services.cart);
    this.inventoryService = new HTTPClient(config.services.inventory);
    this.catalogService = new HTTPClient(config.services.catalog);
  }

  /**
   * Create order from cart (COMMAND)
   * Time Complexity: O(n) where n = cart items
   *
   * Steps:
   * 1. Get cart
   * 2. Validate cart items
   * 3. Reserve inventory
   * 4. Create order
   * 5. Clear cart
   */
  async createOrder(userId, orderData, idempotencyKey = null) {
    try {
      // Check idempotency
      if (idempotencyKey) {
        const existingOrder = await Order.findOne({ idempotencyKey });
        if (existingOrder) {
          logger.info(`Idempotent request detected: ${idempotencyKey}`);
          return existingOrder;
        }
      }

      // Get user's cart
      const cartResponse = await this.cartService.get("/api/cart", {
        headers: { Authorization: `Bearer ${orderData.token}` },
      });

      if (
        !cartResponse.success ||
        !cartResponse.data.items ||
        cartResponse.data.items.length === 0
      ) {
        throw new Error("Cart is empty");
      }

      const cart = cartResponse.data;

      // Reserve inventory for all items
      const reservationId = `order_${Date.now()}_${userId}`;
      const reservationPromises = cart.items.map((item) =>
        this.inventoryService.post("/api/inventory/reserve", {
          sku: item.sku,
          quantity: item.quantity,
          reservationId,
          ttl: config.order.expiryMinutes * 60, // Convert to seconds
        }),
      );

      try {
        await Promise.all(reservationPromises);
      } catch (error) {
        logger.error("Inventory reservation failed:", error);
        // Release any successful reservations
        await this.releaseInventoryReservations(reservationId, cart.items);
        throw new Error("Insufficient stock for one or more items");
      }

      // Calculate order totals
      const { shippingAddress, billingAddress, paymentMethod, shippingMethod } =
        orderData;

      const subtotal = cart.total;
      const tax = this.calculateTax(subtotal);
      const shippingCost = this.calculateShipping(
        shippingMethod,
        shippingAddress,
      );
      const discount = cart.discountTotal || 0;
      const total = subtotal + tax + shippingCost - discount;

      // Create order
      const order = new Order({
        userId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          attributes: item.attributes,
        })),
        subtotal,
        tax,
        shippingCost,
        discount,
        total,
        currency: "USD", // TODO: Make configurable
        shippingAddress,
        billingAddress,
        paymentMethod,
        shippingMethod: shippingMethod || "standard",
        status: OrderStates.PENDING,
        paymentStatus: "pending",
        reservationId,
        reservationExpiry: DateHelper.addMinutes(
          new Date(),
          config.order.expiryMinutes,
        ),
        expiresAt: DateHelper.addMinutes(
          new Date(),
          config.order.expiryMinutes,
        ),
        idempotencyKey,
      });

      // Add initial state to history
      order.stateHistory.push({
        to: OrderStates.PENDING,
        event: "order_created",
        timestamp: new Date(),
        reason: "Order created",
      });

      await order.save();

      // Clear user's cart
      try {
        await this.cartService.delete("/api/cart", {
          headers: { Authorization: `Bearer ${orderData.token}` },
        });
      } catch (error) {
        logger.warn("Failed to clear cart:", error);
        // Non-critical - continue
      }

      logger.info(`Order created: ${order.orderNumber} for user ${userId}`);

      return order;
    } catch (error) {
      logger.error("Create order error:", error);
      throw error;
    }
  }

  /**
   * Process payment (COMMAND)
   * Transitions: pending -> confirmed (payment success) or failed (payment failure)
   */
  async processPayment(orderId, paymentData) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      // Check if can transition
      if (!canTransition(order.status, OrderEvents.PAYMENT_RECEIVED)) {
        throw new Error(`Cannot process payment in ${order.status} state`);
      }

      // TODO: Call Payment Service to process payment
      // For now, mock payment success
      const paymentSuccess = true;

      if (paymentSuccess) {
        // Commit inventory reservations
        const commitPromises = order.items.map((item) =>
          this.inventoryService.post("/api/inventory/commit", {
            sku: item.sku,
            quantity: item.quantity,
            orderId: order.orderNumber,
          }),
        );

        await Promise.all(commitPromises);

        // Transition to confirmed
        const newState = getNextState(
          order.status,
          OrderEvents.PAYMENT_RECEIVED,
        );
        order.transitionTo(
          newState,
          OrderEvents.PAYMENT_RECEIVED,
          null,
          "Payment received",
        );
        order.paymentStatus = "paid";
        order.paymentId = paymentData.paymentId;
        order.paidAt = new Date();

        await order.save();

        logger.info(`Payment processed for order: ${order.orderNumber}`);

        return order;
      } else {
        // Payment failed - release reservations
        await this.releaseInventoryReservations(
          order.reservationId,
          order.items,
        );

        const newState = getNextState(order.status, OrderEvents.PAYMENT_FAILED);
        order.transitionTo(
          newState,
          OrderEvents.PAYMENT_FAILED,
          null,
          "Payment failed",
        );
        order.paymentStatus = "failed";

        await order.save();

        throw new Error("Payment failed");
      }
    } catch (error) {
      logger.error("Process payment error:", error);
      throw error;
    }
  }

  /**
   * Start order processing (COMMAND)
   * Transitions: confirmed -> processing
   */
  async startProcessing(orderId, performedBy = null) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      if (!canTransition(order.status, OrderEvents.START_PROCESSING)) {
        throw new Error(`Cannot start processing in ${order.status} state`);
      }

      const newState = getNextState(order.status, OrderEvents.START_PROCESSING);
      order.transitionTo(
        newState,
        OrderEvents.START_PROCESSING,
        performedBy,
        "Order processing started",
      );

      await order.save();

      logger.info(`Order processing started: ${order.orderNumber}`);

      return order;
    } catch (error) {
      logger.error("Start processing error:", error);
      throw error;
    }
  }

  /**
   * Ship order (COMMAND)
   * Transitions: processing -> shipped
   */
  async shipOrder(orderId, shippingData, performedBy = null) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      if (!canTransition(order.status, OrderEvents.SHIP_ORDER)) {
        throw new Error(`Cannot ship order in ${order.status} state`);
      }

      const newState = getNextState(order.status, OrderEvents.SHIP_ORDER);
      order.transitionTo(
        newState,
        OrderEvents.SHIP_ORDER,
        performedBy,
        "Order shipped",
        shippingData,
      );
      order.trackingNumber = shippingData.trackingNumber;
      order.shippedAt = new Date();

      await order.save();

      logger.info(
        `Order shipped: ${order.orderNumber} - Tracking: ${shippingData.trackingNumber}`,
      );

      // TODO: Send notification to customer

      return order;
    } catch (error) {
      logger.error("Ship order error:", error);
      throw error;
    }
  }

  /**
   * Mark order as delivered (COMMAND)
   * Transitions: shipped -> delivered
   */
  async deliverOrder(orderId, performedBy = null) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      if (!canTransition(order.status, OrderEvents.DELIVER_ORDER)) {
        throw new Error(`Cannot mark as delivered in ${order.status} state`);
      }

      const newState = getNextState(order.status, OrderEvents.DELIVER_ORDER);
      order.transitionTo(
        newState,
        OrderEvents.DELIVER_ORDER,
        performedBy,
        "Order delivered",
      );
      order.deliveredAt = new Date();

      await order.save();

      logger.info(`Order delivered: ${order.orderNumber}`);

      return order;
    } catch (error) {
      logger.error("Deliver order error:", error);
      throw error;
    }
  }

  /**
   * Cancel order (COMMAND)
   * Can be done in pending, confirmed, or processing states
   */
  async cancelOrder(orderId, reason, performedBy = null) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      if (!canTransition(order.status, OrderEvents.CANCEL_ORDER)) {
        throw new Error(`Cannot cancel order in ${order.status} state`);
      }

      // Release inventory reservations
      if (order.status === OrderStates.PENDING) {
        await this.releaseInventoryReservations(
          order.reservationId,
          order.items,
        );
      }

      // Refund if payment was made
      if (order.paymentStatus === "paid") {
        // TODO: Call Payment Service to process refund
        logger.info(`Refund initiated for order: ${order.orderNumber}`);
      }

      const newState = getNextState(order.status, OrderEvents.CANCEL_ORDER);
      order.transitionTo(
        newState,
        OrderEvents.CANCEL_ORDER,
        performedBy,
        reason,
      );
      order.cancelledAt = new Date();
      order.cancellationReason = reason;

      await order.save();

      logger.info(`Order cancelled: ${order.orderNumber} - Reason: ${reason}`);

      return order;
    } catch (error) {
      logger.error("Cancel order error:", error);
      throw error;
    }
  }

  /**
   * Get order by ID (QUERY)
   * Time Complexity: O(1) with index
   */
  async getOrderById(orderId, userId = null) {
    try {
      const query = { _id: orderId };

      // If userId provided, ensure user owns the order
      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query);

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    } catch (error) {
      logger.error("Get order error:", error);
      throw error;
    }
  }

  /**
   * Get order by order number (QUERY)
   * Time Complexity: O(1) with index
   */
  async getOrderByNumber(orderNumber, userId = null) {
    try {
      const query = { orderNumber };

      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query);

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    } catch (error) {
      logger.error("Get order by number error:", error);
      throw error;
    }
  }

  /**
   * Get user orders (QUERY)
   * Time Complexity: O(log n) with compound index
   */
  async getUserOrders(userId, options = {}) {
    try {
      const {
        status,
        page = 1,
        limit = 20,
        sort = "createdAt",
        order = "desc",
      } = options;

      const query = { userId };
      if (status) query.status = status;

      const skip = (page - 1) * limit;
      const sortObj = { [sort]: order === "asc" ? 1 : -1 };

      const [orders, total] = await Promise.all([
        Order.find(query).sort(sortObj).skip(skip).limit(limit),
        Order.countDocuments(query),
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Get user orders error:", error);
      throw error;
    }
  }

  /**
   * Get all orders (QUERY - Admin)
   * Time Complexity: O(log n)
   */
  async getAllOrders(options = {}) {
    try {
      const {
        status,
        paymentStatus,
        page = 1,
        limit = 20,
        sort = "createdAt",
        order = "desc",
        search,
      } = options;

      const query = {};

      if (status) query.status = status;
      if (paymentStatus) query.paymentStatus = paymentStatus;
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: "i" } },
          { "shippingAddress.fullName": { $regex: search, $options: "i" } },
        ];
      }

      const skip = (page - 1) * limit;
      const sortObj = { [sort]: order === "asc" ? 1 : -1 };

      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate("userId", "firstName lastName email"),
        Order.countDocuments(query),
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Get all orders error:", error);
      throw error;
    }
  }

  /**
   * Helper: Release inventory reservations
   */
  async releaseInventoryReservations(reservationId, items) {
    try {
      const releasePromises = items.map((item) =>
        this.inventoryService
          .post("/api/inventory/release", {
            sku: item.sku,
            quantity: item.quantity,
            reservationId,
          })
          .catch((err) => {
            logger.error(`Failed to release reservation for ${item.sku}:`, err);
          }),
      );

      await Promise.all(releasePromises);
    } catch (error) {
      logger.error("Release reservations error:", error);
    }
  }

  /**
   * Helper: Calculate tax
   */
  calculateTax(subtotal) {
    const taxRate = 0.1; // 10% - make configurable
    return Math.round(subtotal * taxRate * 100) / 100;
  }

  /**
   * Helper: Calculate shipping cost
   */
  calculateShipping(method, address) {
    const rates = {
      standard: 5.0,
      express: 15.0,
      overnight: 30.0,
    };

    return rates[method] || rates.standard;
  }
}

export default OrderService;
