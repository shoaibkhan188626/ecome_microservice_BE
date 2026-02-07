import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
  OutboxPublisher, // ADDED
} from "@ecommerce/common";
import healthRoutes, {
  dbConnection,
  redisClient,
} from "./api/routes/health-routes.js";
import createOrderRoutes from "./api/routes/order-routes.js";
import OrderService from "./domain/services/order-service.js";
import OrderController from "./api/controllers/order-controller.js";

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
 * - RELIABLE EVENT PUBLISHING (Outbox Pattern) // ADDED
 *
 * Architecture:
 * - Domain-driven design
 * - Separation of concerns
 * - Atomic operations with transactions
 * - Guaranteed event delivery // ADDED
 */
class OrderServiceApp {
  constructor() {
    this.app = express();
    this.orderService = null;
    this.orderController = null;
    this.outboxPublisher = null; // ADDED
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
          outboxPattern: "Guaranteed event delivery", // ADDED
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
      // Connect to databases
      await dbConnection.connect(config.mongoUri);
      redisClient.connect(config.redisUrl);

      // START OUTBOX PUBLISHER (ADDED)
      this.outboxPublisher = new OutboxPublisher({
        rabbitmqUrl: config.rabbitmqUrl,
        exchange: "order.events",
        intervalMs: 5000, // Check every 5 seconds
        batchSize: 100,
        logger,
      });
      await this.outboxPublisher.start();
      logger.info("📮 Outbox Publisher started");

      // Start HTTP server
      this.server = this.app.listen(config.port, () => {
        logger.info(`🚀 Order Service running on port ${config.port}`);
        logger.info(`📊 Environment: ${config.nodeEnv}`);
        logger.info(`👷 Process ID: ${process.pid}`);
        logger.info(`🔄 State Machine: Enabled`);
        logger.info(`📝 Event Sourcing: Active`);
        logger.info(`📮 Outbox Pattern: Active`); // ADDED
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  // ADDED: Graceful shutdown method
  async stop() {
    logger.info("Shutting down gracefully...");

    // Stop accepting new connections
    if (this.server) {
      this.server.close(() => {
        logger.info("HTTP server closed");
      });
    }

    // Stop outbox publisher
    if (this.outboxPublisher) {
      await this.outboxPublisher.stop();
      logger.info("Outbox publisher stopped");
    }

    // Disconnect databases
    await dbConnection.disconnect();
    await redisClient.disconnect();
    logger.info("Database connections closed");

    process.exit(0);
  }
}

const orderService = new OrderServiceApp();
orderService.start();

// UPDATED: Graceful shutdown handlers
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received");
  await orderService.stop();
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received");
  await orderService.stop();
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  orderService.stop().then(() => process.exit(1));
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  orderService.stop().then(() => process.exit(1));
});
