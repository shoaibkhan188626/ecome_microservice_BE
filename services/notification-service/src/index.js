import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
} from "@ecommerce/common";
import healthRoutes, { dbConnection } from "./api/routes/healthRoutes.js";
import notificationRoutes from "./api/routes/notificationRoutes.js";
import notificationConsumer from "./consumers/notificationConsumer.js";

const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isProduction,
);

class NotificationServiceApp {
  constructor() {
    this.app = express();
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
      })
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
          email: "SMTP-based email notifications",
          sms: "Fonoster/Twilio SMS",
          push: "Firebase Cloud Messaging",
          eventDriven: "RabbitMQ consumer for async events",
        },
        endpoints: {
          health: "/health",
          ready: "/ready",
          live: "/live",
          send: "POST /api/notifications/send (admin)",
          my: "GET /api/notifications/my",
          markRead: "PATCH /api/notifications/:id/read",
          retryFailed: "POST /api/notifications/retry-failed (admin)",
        },
      });
    });

    this.app.use("/api/notifications", notificationRoutes);

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
      await dbConnection.connect(config.mongoUri);

      // Start RabbitMQ consumer for event-driven notifications
      await notificationConsumer.start();

      this.app.listen(config.port, () => {
        logger.info(`🚀 Notification Service running on port ${config.port}`);
        logger.info(`📊 Environment: ${config.nodeEnv}`);
        logger.info(`👷 Process ID: ${process.pid}`);
        logger.info(`📬 RabbitMQ consumer: Active`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

const notificationServiceApp = new NotificationServiceApp();
notificationServiceApp.start();

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  await notificationConsumer.stop();
  await dbConnection.disconnect();
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
