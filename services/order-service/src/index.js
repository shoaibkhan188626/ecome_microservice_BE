import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
} from "@ecommerce/common";
import healthRoutes, {
  dbConnection,
  redisClient,
} from "./api/routes/healthRoutes.js";
import createOrderRoutes from "./api/routes/orderRoutes.js";
import OrderService from "./domain/services/orderService.js";
import OrderController from "./api/controllers/orderController.js";

const logger = createLogger(
  "order-service",
  config.logLevel,
  config.isProduction,
);

/**
 * Order Management Service
 *
 * Features:
 * - State machine-based order workflow
 * - CQRS pattern (Commands vs Queries)
 * - Event sourcing (state history)
 * - Idempotency support
 * - Inventory reservation/commit
 * - Multi-state transitions
 *
 * Architecture:
 * - Domain-driven design
 * - Separation of concerns
 * - Atomic operations
 */
class OrderServiceApp {
  constructor() {
    this.app = express();
    this.orderService = null;
    this.orderController = null;
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: config.isDevelopment
          ? "*"
          : process.env.ALLOWED_ORIGINS?.split(","),
        credentials: true,
      }),
    );

    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(requestIdMiddleware);

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        requestId: res.locals.requestId,
        ip: req.ip,
      });
      next();
    });
  }

  setupRoutes() {
    this.app.use("/", healthRoutes);

    this.app.get("/", (req, res) => {
      res.json({
        service: "Order Management Service",
        version: "1.0.0",
        status: "operational",
        features: {
          stateMachine: "Workflow-based order processing",
          cqrs: "Command/Query separation",
          eventSourcing: "Complete state history",
          idempotency: "Duplicate request protection",
        },
        endpoints: {
          health: "/health",
          createOrder: "POST /api/orders",
          myOrders: "GET /api/orders/my-orders",
          orderDetails: "GET /api/orders/:orderId",
          processPayment: "POST /api/orders/:orderId/payment",
          cancelOrder: "POST /api/orders/:orderId/cancel",
          orderHistory: "GET /api/orders/:orderId/history",
          adminOrders: "GET /api/orders (admin)",
          shipOrder: "POST /api/orders/:orderId/ship (admin)",
        },
      });
    });

    // Initialize dependencies
    this.orderService = new OrderService(redisClient);
    this.orderController = new OrderController(this.orderService);

    const orderRoutes = createOrderRoutes(this.orderController);
    this.app.use("/api/orders", orderRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Endpoint not found",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: res.locals.requestId,
        },
      });
    });
  }

  setupErrorHandling() {
    this.app.use(createErrorHandler(logger, config.isProduction));
  }

  async start() {
    try {
      await dbConnection.connect(config.mongoUri);
      redisClient.connect(config.redisUrl);

      this.app.listen(config.port, () => {
        logger.info(`🚀 Order Service running on port ${config.port}`);
        logger.info(`📊 Environment: ${config.nodeEnv}`);
        logger.info(`👷 Process ID: ${process.pid}`);
        logger.info(`🔄 State Machine: Enabled`);
        logger.info(`📝 Event Sourcing: Active`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

const orderService = new OrderServiceApp();
orderService.start();

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  await dbConnection.disconnect();
  await redisClient.disconnect();
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
