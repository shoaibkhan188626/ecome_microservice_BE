import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
  initTracing,
  shutdownTracing,
  initBusinessMetrics,
} from "@ecommerce/common";
import healthRoutes, { dbConnection } from "./api/routes/health-routes.js";
import notificationRoutes from "./api/routes/notification-routes.js";
import notificationConsumer from "./consumers/notification-consumer.js";

const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isProduction,
);

class NotificationServiceApp {
  constructor() {
    this.app = express();
    this.server = null; // ADDED: Store server instance for graceful shutdown
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
    this.app.use(cookieParser());
    this.app.use(requestIdMiddleware);

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        requestId: res.locals?.requestId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      next();
    });
  }

  setupRoutes() {
    this.app.use("/", healthRoutes);

    this.app.get("/", (req, res) => {
      res.json({
        service: "Notification Service",
        version: "1.0.0",
        status: "operational",
        features: {
          observability: "OpenTelemetry + Prometheus", // ADDED
          email: "SMTP-based email notifications",
          sms: "Fonoster/Twilio SMS",
          push: "Firebase Cloud Messaging",
          eventDriven: "RabbitMQ consumer for async events",
        },
        endpoints: {
          health: "/health",
          ready: "/ready",
          live: "/live",
          send: "POST /notifications/send (admin)",
          my: "GET /notifications/my",
          markRead: "PATCH /notifications/:id/read",
          retryFailed: "POST /notifications/retry-failed (admin)",
          metrics: "GET /metrics", // ADDED
        },
      });
    });

    this.app.use("/notifications", notificationRoutes);

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Endpoint not found",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: res.locals?.requestId,
        },
      });
    });
  }

  setupErrorHandling() {
    this.app.use(createErrorHandler(logger, config.isProduction));
  }

  async start() {
    try {
      // ADDED: Initialize OpenTelemetry FIRST (before DB/RabbitMQ connections)
      const metricsPort = parseInt(config.port) + 1000; // 3007 -> 4007
      initTracing("notification-service", metricsPort);
      initBusinessMetrics();

      await dbConnection.connect(config.mongoUri);

      // Start RabbitMQ consumer for event-driven notifications
      await notificationConsumer.start();

      // ADDED: Store server instance
      this.server = this.app.listen(config.port, () => {
        logger.info(`✅ Notification Service running on port ${config.port}`);
        logger.info(
          `📊 Metrics available at http://localhost:${metricsPort}/metrics`,
        );
        logger.info(`🔧 Environment: ${config.nodeEnv}`);
        logger.info(`🆔 Process ID: ${process.pid}`);
        logger.info(`📬 RabbitMQ consumer: Active`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  // ADDED: Graceful shutdown method
  async stop() {
    logger.info("🛑 Stopping Notification Service...");
    try {
      await shutdownTracing(); // ADDED: Shutdown OpenTelemetry

      if (this.server) {
        await new Promise((resolve) => this.server.close(resolve));
        logger.info("HTTP server closed");
      }

      // Stop RabbitMQ consumer
      await notificationConsumer.stop();
      logger.info("RabbitMQ consumer stopped");

      await dbConnection.disconnect();
      logger.info("Database disconnected");
    } catch (e) {
      logger.error("Error during shutdown:", e);
    }
    process.exit(0);
  }
}

const notificationServiceApp = new NotificationServiceApp();
notificationServiceApp.start();

// UPDATED: Use stop() method for graceful shutdown
process.on("SIGTERM", () => notificationServiceApp.stop());
process.on("SIGINT", () => notificationServiceApp.stop()); // ADDED: Handle Ctrl+C

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  notificationServiceApp.stop(); // UPDATED: Call stop() instead of immediate exit
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  notificationServiceApp.stop(); // UPDATED: Call stop() instead of immediate exit
});
