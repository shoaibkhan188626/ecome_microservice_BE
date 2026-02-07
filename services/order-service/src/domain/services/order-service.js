import Order from "../entities/order.js";
import {
  OrderStates,
  OrderEvents,
  canTransition,
  getNextState,
} from "../state-machine/order-states.js";
import {
  createLogger,
  HTTPClient,
  DateHelper,
  TransactionManager,
  AppError,
} from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "order-service",
  config.logLevel,
  config.isProduction,
);

/**
 * Order Service - Business Logic for Order Management
 *
 * UPDATED: Now uses TransactionManager with Outbox Pattern for reliability
 */
class OrderService {
  constructor(redisClient) {
    this.redis = redisClient;
    this.cartService = new HTTPClient(config.services.cart);
    this.inventoryService = new HTTPClient(config.services.inventory);
    this.catalogService = new HTTPClient(config.services.catalog);
    this.transactionManager = new TransactionManager(); // ADDED
  }

  /**
   * Create order from cart (COMMAND) - WITH TRANSACTION & OUTBOX
   *
   * Key Changes:
   * 1. Uses MongoDB transaction for atomicity
   * 2. Creates outbox event in same transaction
   * 3. Background worker publishes event to RabbitMQ
   */
  async createOrder(userId, orderData, idempotencyKey = null) {
    try {
      // Check idempotency first (outside transaction - fast check)
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
        throw new AppError("Cart is empty", 400);
      }

      const cart = cartResponse.data;

      // Reserve inventory BEFORE transaction (external service call)
      const reservationId = `order_${Date.now()}_${userId}`;
      const reservationPromises = cart.items.map((item) =>
        this.inventoryService.post("/api/inventory/reserve", {
          sku: item.sku,
          quantity: item.quantity,
          reservationId,
          ttl: config.order.expiryMinutes * 60,
        }),
      );

      try {
        await Promise.all(reservationPromises);
      } catch (error) {
        logger.error("Inventory reservation failed:", error);
        throw new AppError("Insufficient stock for one or more items", 400);
      }

      // START TRANSACTION WITH OUTBOX EVENT
      const { result: order, outboxEvent } =
        await this.transactionManager.withOutboxEvent(
          async (session) => {
            // Calculate order totals
            const {
              shippingAddress,
              billingAddress,
              paymentMethod,
              shippingMethod,
            } = orderData;

            const subtotal = cart.total;
            const tax = this.calculateTax(subtotal);
            const shippingCost = this.calculateShipping(
              shippingMethod,
              shippingAddress,
            );
            const discount = cart.discountTotal || 0;
            const total = subtotal + tax + shippingCost - discount;

            // Create order (within transaction)
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
              currency: "USD",
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

            await order.save({ session });

            return order;
          },
          {
            eventType: "order.created", // This will be published to RabbitMQ
            aggregateType: "order",
            payload: {
              orderId: null, // Will be set to order._id after creation
              orderNumber: null, // Will be set after creation
              userId,
              total: cart.total,
              itemCount: cart.items.length,
              items: cart.items.map((i) => ({
                sku: i.sku,
                quantity: i.quantity,
                price: i.price,
              })),
              reservationId,
              status: "pending",
            },
            correlationId: idempotencyKey || `corr_${Date.now()}`,
          },
        );

      // Update outbox payload with actual order ID and number
      outboxEvent.payload.orderId = order._id.toString();
      outboxEvent.payload.orderNumber = order.orderNumber;
      outboxEvent.aggregateId = order._id.toString();
      await outboxEvent.save();

      // Clear cart (non-critical, outside transaction)
      try {
        await this.cartService.delete("/api/cart", {
          headers: { Authorization: `Bearer ${orderData.token}` },
        });
      } catch (error) {
        logger.warn("Failed to clear cart:", error);
        // Non-critical - continue
      }

      logger.info(
        `Order created: ${order.orderNumber} for user ${userId}, outbox event: ${outboxEvent.eventId}`,
      );

      return order;
    } catch (error) {
      logger.error("Create order error:", error);
      throw error;
    }
  }

  /**
   * Process payment (COMMAND) - WITH TRANSACTION & OUTBOX
   */
  async processPayment(orderId, paymentData) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new AppError("Order not found", 404);
      }

      if (!canTransition(order.status, OrderEvents.PAYMENT_RECEIVED)) {
        throw new AppError(
          `Cannot process payment in ${order.status} state`,
          400,
        );
      }

      // TODO: Call Payment Service to process payment
      const paymentSuccess = true;

      if (paymentSuccess) {
        // Commit inventory and update order in transaction
        const { result: updatedOrder } =
          await this.transactionManager.withOutboxEvent(
            async (session) => {
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

              await order.save({ session });

              return order;
            },
            {
              eventType: "order.payment_confirmed",
              aggregateType: "order",
              aggregateId: order._id.toString(),
              payload: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                userId: order.userId,
                paymentId: paymentData.paymentId,
                amount: order.total,
                paidAt: new Date().toISOString(),
              },
            },
          );

        logger.info(`Payment processed for order: ${order.orderNumber}`);

        return updatedOrder;
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

        throw new AppError("Payment failed", 400);
      }
    } catch (error) {
      logger.error("Process payment error:", error);
      throw error;
    }
  }

  /**
   * Cancel order (COMMAND) - WITH TRANSACTION & OUTBOX
   */
  async cancelOrder(orderId, reason, performedBy = null) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw new AppError("Order not found", 404);
      }

      if (!canTransition(order.status, OrderEvents.CANCEL_ORDER)) {
        throw new AppError(`Cannot cancel order in ${order.status} state`, 400);
      }

      // Release inventory reservations if still pending
      if (order.status === OrderStates.PENDING) {
        await this.releaseInventoryReservations(
          order.reservationId,
          order.items,
        );
      }

      // Refund if payment was made (outside transaction - external service)
      if (order.paymentStatus === "paid") {
        // TODO: Call Payment Service to process refund
        logger.info(`Refund initiated for order: ${order.orderNumber}`);
      }

      // Update order in transaction with outbox event
      const { result: updatedOrder } =
        await this.transactionManager.withOutboxEvent(
          async (session) => {
            const newState = getNextState(
              order.status,
              OrderEvents.CANCEL_ORDER,
            );
            order.transitionTo(
              newState,
              OrderEvents.CANCEL_ORDER,
              performedBy,
              reason,
            );
            order.cancelledAt = new Date();
            order.cancellationReason = reason;

            await order.save({ session });

            return order;
          },
          {
            eventType: "order.cancelled",
            aggregateType: "order",
            aggregateId: order._id.toString(),
            payload: {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              userId: order.userId,
              reason,
              cancelledAt: new Date().toISOString(),
              refundRequired: order.paymentStatus === "paid",
            },
          },
        );

      logger.info(`Order cancelled: ${order.orderNumber} - Reason: ${reason}`);

      return updatedOrder;
    } catch (error) {
      logger.error("Cancel order error:", error);
      throw error;
    }
  }

  // ... keep all other methods (getOrderById, getUserOrders, etc.) unchanged ...
  // Just add AppError instead of generic Error for consistency

  /**
   * Get order by ID (QUERY)
   */
  async getOrderById(orderId, userId = null) {
    try {
      const query = { _id: orderId };

      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query);

      if (!order) {
        throw new AppError("Order not found", 404);
      }

      return order;
    } catch (error) {
      logger.error("Get order error:", error);
      throw error;
    }
  }

  /**
   * Get order by order number (QUERY)
   */
  async getOrderByNumber(orderNumber, userId = null) {
    try {
      const query = { orderNumber };

      if (userId) {
        query.userId = userId;
      }

      const order = await Order.findOne(query);

      if (!order) {
        throw new AppError("Order not found", 404);
      }

      return order;
    } catch (error) {
      logger.error("Get order by number error:", error);
      throw error;
    }
  }

  // ... keep rest of helper methods unchanged ...
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

  calculateTax(subtotal) {
    const taxRate = 0.1;
    return Math.round(subtotal * taxRate * 100) / 100;
  }

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
