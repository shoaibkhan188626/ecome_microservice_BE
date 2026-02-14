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
} from "@ecommerce/common";
import healthRoutes, {
  dbConnection,
  redisClient,
} from "./api/routes/health-routes.js";
import createInventoryRoutes from "./api/routes/inventory-routes.js";
import LockManager from "./infrastructure/cache/lock-manager.js";
import InventoryService from "./domain/services/inventory-service.js";
import InventoryController from "./api/controllers/inventory-controller.js";

const logger = createLogger(
  "inventory-service",
  config.logLevel,
  config.isProduction,
);

class InventoryServiceApp {
  constructor() {
    this.app = express();
    this.server = null; // ADDED: Store server instance for graceful shutdown
    this.lockManager = null;
    this.inventoryService = null;
    this.inventoryController = null;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
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
        service: "Inventory Service",
        version: "1.0.0",
        status: "operational",
        features: {
          observability: "OpenTelemetry + Prometheus", // ADDED
        },
        endpoints: {
          health: "/health",
          inventory: "GET /inventory/:sku",
          reserve: "POST /inventory/reserve",
          release: "POST /inventory/release",
          commit: "POST /inventory/commit",
          adjust: "POST /inventory/adjust",
          lowStock: "GET /inventory/low-stock",
          metrics: "GET /metrics", // ADDED
        },
      });
    });

    //initialize dependencies and routes after Redis connects
    this.lockManager = new LockManager(redisClient);
    this.inventoryService = new InventoryService(this.lockManager, redisClient);
    this.inventoryController = new InventoryController(this.inventoryService);

    const inventoryRoutes = createInventoryRoutes(this.inventoryController);
    this.app.use("/inventory", inventoryRoutes);

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
      const metricsPort = parseInt(config.port) + 1000; // 3003 -> 4003
      initTracing("inventory-service", metricsPort);
      initBusinessMetrics();

      await dbConnection.connect(config.mongoUri);
      await redisClient.connect(config.redisUrl);

      // ADDED: Store server instance
      this.server = this.app.listen(config.port, () => {
        logger.info(`✅ Inventory Service running on port ${config.port}`);
        logger.info(
          `📊 Metrics available at http://localhost:${metricsPort}/metrics`,
        );
        logger.info(`🔧 Environment: ${config.nodeEnv}`);
        logger.info(`🆔 Process ID: ${process.pid}`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  // ADDED: Graceful shutdown method
  async stop() {
    logger.info("🛑 Stopping Inventory Service...");
    try {
      await shutdownTracing(); // ADDED: Shutdown OpenTelemetry

      if (this.server) {
        await new Promise((resolve) => this.server.close(resolve));
        logger.info("HTTP server closed");
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

const inventoryService = new InventoryServiceApp();
inventoryService.start();

// UPDATED: Use stop() method for graceful shutdown
process.on("SIGTERM", () => inventoryService.stop());
process.on("SIGINT", () => inventoryService.stop()); // ADDED: Handle Ctrl+C

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  inventoryService.stop(); // UPDATED: Call stop() instead of immediate exit
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  inventoryService.stop(); // UPDATED: Call stop() instead of immediate exit
});
