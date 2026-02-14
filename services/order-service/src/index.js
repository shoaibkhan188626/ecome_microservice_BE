import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
  initTracing,
  shutdownTracing,
  initBusinessMetrics,
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
 * - RELIABLE EVENT PUBLISHING (Outbox Pattern)
 *
 * Architecture:
 * - Domain-driven design
 * - Separation of concerns
 * - Atomic operations with transactions
 * - Guaranteed event delivery
 */
class OrderServiceApp {
  constructor() {
    this.app = express();
    this.server = null; // ADDED: Store server instance for graceful shutdown
    this.orderService = null;
    this.orderController = null;
    this.outboxPublisher = null;
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
          observability: "OpenTelemetry + Prometheus", // ADDED
          stateMachine: "Workflow-based order processing",
          cqrs: "Command/Query separation",
          eventSourcing: "Complete state history",
          idempotency: "Duplicate request protection",
          outboxPattern: "Guaranteed event delivery",
        },
        endpoints: {
          health: "/health",
          createOrder: "POST /orders",
          myOrders: "GET /orders/my-orders",
          orderDetails: "GET /orders/:orderId",
          processPayment: "POST /orders/:orderId/payment",
          cancelOrder: "POST /orders/:orderId/cancel",
          orderHistory: "GET /orders/:orderId/history",
          adminOrders: "GET /orders (admin)",
          shipOrder: "POST /orders/:orderId/ship (admin)",
          metrics: "GET /metrics", // ADDED
        },
      });
    });

    // Initialize dependencies
    this.orderService = new OrderService(redisClient);
    this.orderController = new OrderController(this.orderService);

    const orderRoutes = createOrderRoutes(this.orderController);
    this.app.use("/orders", orderRoutes);

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
      // ADDED: Initialize OpenTelemetry FIRST (before DB/Redis connections)
      const metricsPort = parseInt(config.port) + 1000; // 3005 -> 4005
      initTracing("order-service", metricsPort);
      initBusinessMetrics();

      // Connect to databases
      await dbConnection.connect(config.mongoUri);
      await redisClient.connect(config.redisUrl);

      // START OUTBOX PUBLISHER
      this.outboxPublisher = new OutboxPublisher({
        rabbitmqUrl: config.rabbitmqUrl,
        exchange: "order.events",
        intervalMs: 5000, // Check every 5 seconds
        batchSize: 100,
        logger,
      });
      await this.outboxPublisher.start();
      logger.info("📮 Outbox Publisher started");

      // ADDED: Store server instance
      this.server = this.app.listen(config.port, () => {
        logger.info(`✅ Order Service running on port ${config.port}`);
        logger.info(
          `📊 Metrics available at http://localhost:${metricsPort}/metrics`,
        );
        logger.info(`🔧 Environment: ${config.nodeEnv}`);
        logger.info(`🆔 Process ID: ${process.pid}`);
        logger.info(`🔄 State Machine: Enabled`);
        logger.info(`📝 Event Sourcing: Active`);
        logger.info(`📮 Outbox Pattern: Active`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  // ADDED: Graceful shutdown method
  async stop() {
    logger.info("🛑 Stopping Order Service...");
    try {
      await shutdownTracing(); // ADDED: Shutdown OpenTelemetry

      if (this.server) {
        await new Promise((resolve) => this.server.close(resolve));
        logger.info("HTTP server closed");
      }

      // Stop outbox publisher
      if (this.outboxPublisher) {
        await this.outboxPublisher.stop();
        logger.info("Outbox publisher stopped");
      }

      await redisClient.disconnect();
      logger.info("Redis disconnected");

      await dbConnection.disconnect();
      logger.info("Database disconnected");
    } catch (e) {
      logger.error("Error during shutdown:", e);
    }
    process.exit(0);
  }
}

const orderService = new OrderServiceApp();
orderService.start();

// UPDATED: Use stop() method for graceful shutdown
process.on("SIGTERM", () => orderService.stop());
process.on("SIGINT", () => orderService.stop()); // ADDED: Handle Ctrl+C

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  orderService.stop(); // UPDATED: Call stop() instead of immediate exit
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  orderService.stop(); // UPDATED: Call stop() instead of immediate exit
});
