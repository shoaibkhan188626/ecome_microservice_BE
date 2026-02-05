import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
  MongoConnection,
} from "@ecommerce/common";

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
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: "*",
        credentials: false,
      }),
    );
    this.app.use(express.json({ limit: "1mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "1mb" }));
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
    // Simple root route for now
    this.app.get("/", (req, res) => {
      res.json({
        service: "Payment Service",
        version: "1.0.0",
        status: "operational",
      });
    });

    // TODO: mount /api/payments routes & /webhooks/* in next step

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Endpoint not found" },
      });
    });
  }

  setupErrorHandling() {
    this.app.use(createErrorHandler(logger, config.isProduction));
  }

  async start() {
    try {
      await dbConnection.connect(config.mongoUri);

      this.server = this.app.listen(config.port, () => {
        logger.info(`🚀 Payment Service running on port ${config.port}`);
        logger.info(`📊 Environment: ${config.nodeEnv}`);
      });
    } catch (err) {
      logger.error("Failed to start Payment Service:", err);
      process.exit(1);
    }
  }

  async stop() {
    logger.info("🛑 Stopping Payment Service...");
    try {
      await dbConnection.disconnect();
      if (this.server) {
        await new Promise((resolve) => this.server.close(resolve));
      }
    } catch (e) {
      logger.error("Error during shutdown:", e);
    }
    process.exit(0);
  }
}

const app = new PaymentServiceApp();
app.start().catch((err) => {
  logger.error("Startup failure:", err);
  process.exit(1);
});

process.on("SIGINT", () => app.stop());
process.on("SIGTERM", () => app.stop());
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", { reason });
  process.exit(1);
});
