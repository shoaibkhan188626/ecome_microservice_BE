import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
  MongoConnection,
  OutboxPublisher,
  initTracing,
  shutdownTracing,
  initBusinessMetrics,
  recordPayment, // This is a function that records metrics
} from "@ecommerce/common";
import paymentRoutes from "./api/routes/payment-routes.js";

const logger = createLogger(
  "payment-service",
  config.logLevel,
  config.isProduction,
);

const dbConnection = new MongoConnection(logger);

class PaymentServiceApp {
  constructor() {
    this.app = express();
    this.server = null;
    this.outboxPublisher = null;
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: config.isDevelopment ? "*" : config.allowedOrigins || "*",
        credentials: true,
      }),
    );

    // Body parsing - JSON for regular API
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Raw body for webhook signature verification
    this.app.use(
      "/api/payments/webhooks",
      express.raw({
        type: "application/json",
        limit: "10mb",
      }),
    );

    this.app.use(requestIdMiddleware);

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.originalUrl}`, {
        requestId: res.locals.requestId,
        ip: req.ip,
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get("/health", async (req, res) => {
      const health = {
        service: "payment-service",
        status: "operational",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: config.nodeEnv,
        uptime: process.uptime(),
        features: {
          observability: "OpenTelemetry + Prometheus",
          gateways: ["razorpay", "stripe"],
          idempotency: "Enabled via keys",
          webhooks: "Signature verified + idempotent",
          refunds: "Full and partial supported",
          capture: "Manual capture flow",
          outboxPattern: "Guaranteed event delivery",
        },
      };

      try {
        if (dbConnection.isConnected?.()) {
          health.database = "connected";
        } else {
          health.database = "disconnected";
          health.status = "degraded";
        }
      } catch {
        health.database = "unknown";
      }

      const statusCode = health.status === "operational" ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Service info
    this.app.get("/", (req, res) => {
      res.json({
        service: "Payment Service",
        version: "1.0.0",
        description:
          "Multi-gateway payment processing with webhook idempotency",
        status: "operational",
        endpoints: {
          createPayment: "POST /api/payments",
          getPayment: "GET /api/payments/:paymentId",
          getStatus: "GET /api/payments/:paymentId/status",
          refund: "POST /api/payments/:paymentId/refund",
          capture: "POST /api/payments/:paymentId/capture",
          methods: "GET /api/payments/methods",
          webhooks: {
            razorpay: "POST /api/payments/webhooks/razorpay",
            stripe: "POST /api/payments/webhooks/stripe",
          },
          health: "/health",
          metrics: "GET /metrics",
        },
      });
    });

    // API routes
    this.app.use("/api/payments", paymentRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Endpoint not found",
          path: req.originalUrl,
          method: req.method,
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
      // ADDED: Initialize OpenTelemetry FIRST (before DB connections)
      const metricsPort = parseInt(config.port) + 1000; // 3006 -> 4006
      initTracing("payment-service", metricsPort);
      initBusinessMetrics();

      // 1. Connect to Database
      await dbConnection.connect(config.mongoUri);
      logger.info("✅ Database connected");

      // 2. Start Outbox Publisher
      this.outboxPublisher = new OutboxPublisher({
        rabbitmqUrl: config.rabbitmqUrl,
        exchange: "payment.events",
        logger,
      });
      await this.outboxPublisher.start();
      logger.info("📮 Outbox Publisher started");

      // 3. Start Server
      this.server = this.app.listen(config.port, () => {
        logger.info(`💳 Payment Service running on port ${config.port}`);
        logger.info(
          `📊 Metrics available at http://localhost:${metricsPort}/metrics`,
        );
        logger.info(`🔧 Environment: ${config.nodeEnv}`);
        logger.info(`🆔 Process ID: ${process.pid}`);
        logger.info(`🔒 Idempotency: Enabled`);
        logger.info(`🎫 Webhook Protection: Signature + Deduplication`);
        logger.info(`💰 Gateways: Razorpay, Stripe`);
      });
    } catch (err) {
      logger.error("Failed to start Payment Service:", err);
      process.exit(1);
    }
  }

  // ADDED: Graceful shutdown method
  async stop() {
    logger.info("🛑 Stopping Payment Service...");
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

      await dbConnection.disconnect();
      logger.info("Database disconnected");
    } catch (e) {
      logger.error("Error during shutdown:", e);
    }
    process.exit(0);
  }
}

// Start the service
const app = new PaymentServiceApp();
app.start().catch((err) => {
  logger.error("Startup failure:", err);
  process.exit(1);
});

// UPDATED: Use stop() method for graceful shutdown
process.on("SIGINT", () => app.stop());
process.on("SIGTERM", () => app.stop());

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  app.stop();
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", { reason });
  app.stop();
});
