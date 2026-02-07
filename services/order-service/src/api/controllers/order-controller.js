import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "order-service",
  config.logLevel,
  config.isProduction,
);

class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  /**
   * Create order from cart
   * POST /orders
   */

  async createOrder(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseHandler.error(
          res,
          "UNAUTHORIZED",
          "User authentication required",
          401,
        );
      }

      const { shippingAddress, billingAddress, paymentMethod, shippingMethod } =
        req.body;

      //Validation
      const errors = [];

      if (!shippingAddress) {
        errors.push({
          field: "shippingAddress",
          message: "Shipping address is required",
        });
      }

      if (!billingAddress) {
        errors.push({
          field: "billingAddress",
          message: "Billing address is required",
        });
      }

      if (!paymentMethod) {
        errors.push({
          field: "paymentMethod",
          message: "Payment method is required",
        });
      }

      if (errors.length > 0) {
        return ResponseHandler.validationError(res, errors);
      }

      //idempotency key from header
      const idempotencyKey = req.headers["idempotency-key"];

      const order = await this.orderService.createOrder(
        userId,
        {
          shippingAddress,
          billingAddress,
          paymentMethod,
          shippingMethod,
          token: req.headers.authorization?.split(" ")[1],
        },
        idempotencyKey,
      );
      return ResponseHandler.success(res, order, 201);
    } catch (error) {
      logger.error("Create order controller error:", error);

      if (error.message.includes("Cart is empty")) {
        return ResponseHandler.error(res, "EMPTY_CART", error.message, 400);
      }

      if (error.message.includes("Insufficient stock")) {
        return ResponseHandler.error(
          res,
          "INSUFFICIENT_STOCK",
          error.message,
          409,
        );
      }
      return ResponseHandler.error(
        res,
        "CREATE_ORDER_FAILED",
        error.message,
        400,
      );
    }
  }

  /**
   * Process payment for order
   * POST /orders/:orderId/payment
   */

  async processPayment(req, res) {
    try {
      const { orderId } = req.params;
      const { paymentId, paymentData } = req.body;

      if (!paymentId) {
        return ResponseHandler.validationError(res, [
          { field: "paymentId", message: "Payment ID is required" },
        ]);
      }

      const order = await this.orderService.processPayment(orderId, {
        paymentId,
        ...paymentData,
      });

      return ResponseHandler.success(res, order);
    } catch (error) {
      logger.error("Process payment controller error:", error);

      if (error.message.includes("not found")) {
        return ResponseHandler.notFound(res, "Order");
      }

      if (error.message.includes("Payment failed")) {
        return ResponseHandler.error(res, "PAYMENT_FAILED", error.message, 402);
      }

      if (error.message.includes("Cannot process payment")) {
        return ResponseHandler.error(res, "INVALID_STATE", error.message, 400);
      }

      return ResponseHandler.error(
        res,
        "PAYMENT_PROCESSING_FAILED",
        error.message,
        500,
      );
    }
  }

  /**
   * Get order by ID
   * GET /orders/:orderId
   */

  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      const order = await this.orderService.getOrderById(orderId, userId);

      return ResponseHandler.success(res, order);
    } catch (error) {
      logger.error("Get order controller error:", error);
      return ResponseHandler.notFound(res, "Order");
    }
  }

  /**
   * Get order by order number
   * GET /orders/number/:orderNumber
   */

  async getOrderByNumber(req, res) {
    try {
      const { orderNumber } = req.params;
      const userId = req.user?.id;

      const order = await this.order.getOrderByNumber(orderNumber, userId);

      return ResponseHandler.success(res, order);
    } catch (error) {
      logger.error("Get order by number error:", error);
      return ResponseHandler.notFound(res, "Order");
    }
  }

  /**
   * Get current user's orders
   * GET /orders/my-orders
   */

  async getMyOrders(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseHandler.error(
          res,
          "UNAUTHORIZED",
          "USer authentication required",
          401,
        );
      }

      const options = {
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || "createdAt",
        order: req.query.order || "desc",
      };

      const result = await this.orderService.getUserOrders(userId, options);

      return ResponseHandler.paginated(
        res,
        result.orders,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
      );
    } catch (error) {
      logger.error("Get my orders error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  /**
   * Get all orders
   * GET /orders
   */

  async getAllOrders(req, res) {
    try {
      const options = {
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || "createdAt",
        order: req.query.order || "desc",
        search: req.query.search,
      };

      const result = await this.orderService.getAllOrders(options);

      return ResponseHandler.paginated(
        res,
        result.orders,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
      );
    } catch (error) {
      logger.error("Get all orders error:", error);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  /**
   * Start order processing (Admin)
   * POST /orders/:orderId/process
   */

  async startProcessing(req, res) {
    try {
      const { orderId } = req.params;
      const performedBy = req.user?.id;

      const order = await this.orderService.startProcessing(
        orderId,
        performedBy,
      );

      return ResponseHandler.success(res, order);
    } catch (error) {
      logger.error("Start processing error:", error);

      if (error.message.includes("not found")) {
        return ResponseHandler.notFound(res, "Order");
      }

      if (error.message.includes("Cannot start processing")) {
        return ResponseHandler.error(res, "INVALID_STATE", error.message, 400);
      }

      return ResponseHandler.error(res, "PROCESS_FAILED", error.message, 400);
    }
  }

  /**
   * Ship order (admin)
   * POST /orders/:orderId/ship
   */

  async shipOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { trackingNumber, carrier } = req.body;
      const performedBy = req.user?.id;

      if (!trackingNumber) {
        return ResponseHandler.validationError(res, [
          { field: "trackingNumber", message: "Tracking number is required" },
        ]);
      }

      const order = await this.orderService.shipOrder(
        orderId,
        { trackingNumber, carrier },
        performedBy,
      );

      return ResponseHandler.success(res, order);
    } catch (error) {
      logger.error("Ship order error:", error);

      if (error.message.includes("not found")) {
        return ResponseHandler.notFound(res, "Order");
      }

      if (error.message.includes("Cannot ship")) {
        return ResponseHandler.error(res, "INVALID_STATE", error.message, 400);
      }

      return ResponseHandler.error(res, "SHIP_FAILED", error.message, 400);
    }
  }

  /**
   * Mark order as delivered (Admin)
   * POST /orders/:orderId/deliver
   */

  async deliverOrder(req, res) {
    try {
      const { orderId } = req.params;
      const performedBy = req.user?.id;

      const order = await this.orderService.deliverOrder(orderId, performedBy);

      return ResponseHandler.success(res, order);
    } catch (error) {
      logger.error("Deliver order error:", error);

      if (error.message.includes("not found")) {
        return ResponseHandler.notFound(res, "Order");
      }

      if (error.message.includes("Cannot mark as delivered")) {
        return ResponseHandler.error(res, "INVALID_STATE", error.message, 400);
      }

      return ResponseHandler.error(res, "DELIVER_FAILED", error.message, 400);
    }
  }

  /**
   * Cancel order
   * POST /orders/:orderId/cancel
   */

  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const performedBy = req.user?.id;

      if (!user) {
        return ResponseHandler.validationError(res, [
          { field: "reason", message: "Cancellation reason is required" },
        ]);
      }

      const order = await this.orderService.cancelOrder(
        orderId,
        reason,
        performedBy,
      );

      return ResponseHandler.success(res, order);
    } catch (error) {
      logger.error("Cancel order error:", error);

      if (error.message.includes("not found")) {
        return ResponseHandler.notFound(res, "Order");
      }

      if (error.message.includes("Cannot cancel")) {
        return ResponseHandler.error(res, "INVALID_STATE", error.message, 400);
      }

      return ResponseHandler.error(res, "CANCEL_FAILED", error.message, 400);
    }
  }

  /**
   * Get order status history
   * GET /orders/:orderId/history
   */

  async getOrderHistory(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      const order = await this.orderService.getOrderById(orderId, userId);

      return ResponseHandler.success(res, {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        history: order.stateHistory,
      });
    } catch (error) {
      logger.error("Get order history error:", error);
      return ResponseHandler.notFound(res, "Order");
    }
  }
}

export default OrderController;
