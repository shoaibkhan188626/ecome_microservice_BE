import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
  MongoConnection,
  OutboxPublisher, // <--- ADDED: Critical for Event Architecture
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
    this.outboxPublisher = null; // <--- ADDED: To store the publisher instance
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
    // Health check (Restored your detailed version)
    this.app.get("/health", async (req, res) => {
      const health = {
        service: "payment-service",
        status: "operational",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: config.nodeEnv,
        uptime: process.uptime(),
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

    // Service info (Restored your detailed version)
    this.app.get("/", (req, res) => {
      res.json({
        service: "Payment Service",
        version: "1.0.0",
        description:
          "Multi-gateway payment processing with webhook idempotency",
        status: "operational",
        features: {
          gateways: ["razorpay", "stripe"],
          idempotency: "Enabled via keys",
          webhooks: "Signature verified + idempotent",
          refunds: "Full and partial supported",
          capture: "Manual capture flow",
        },
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
          health: "GET /health",
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
      // 1. Connect to Database
      await dbConnection.connect(config.mongoUri);
      logger.info("✅ Database connected");

      // 2. Start Outbox Publisher (ADDED: Critical for Order Service integration)
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
        logger.info(`📊 Environment: ${config.nodeEnv}`);
        logger.info(`👷 Process ID: ${process.pid}`);
        logger.info(`🔒 Idempotency: Enabled`);
        logger.info(`🎫 Webhook Protection: Signature + Deduplication`);
        logger.info(`💰 Gateways: Razorpay, Stripe`);
      });
    } catch (err) {
      logger.error("Failed to start Payment Service:", err);
      process.exit(1);
    }
  }

  async stop() {
    logger.info("🛑 Stopping Payment Service...");
    try {
      if (this.server) {
        await new Promise((resolve) => this.server.close(resolve));
        logger.info("HTTP server closed");
      }

      // 4. Stop Publisher Gracefully (ADDED)
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

// Graceful shutdown handlers
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
