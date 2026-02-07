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
        endpoints: {
          health: "/health",
          inventory: "GET /api/inventory/:sku",
          reserve: "POST /api/inventory/reserve",
          release: "POST /api/inventory/release",
          commit: "POST /api/inventory/commit",
          adjust: "POST /api/inventory/adjust",
          lowStock: "GET /api/inventory/low-stock",
        },
      });
    });

    //initialize dependencies and routes after Redis connects
    this.lockManager = new LockManager(redisClient);
    this.inventoryService = new InventoryService(this.lockManager, redisClient);
    this.inventoryController = new InventoryController(this.inventoryService);

    const inventoryRoutes = createInventoryRoutes(this.inventoryController);
    this.app.use("/api/inventory", inventoryRoutes);

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
        logger.info(`Inventory Service running on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`process ID :${process.pid}`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

const inventoryService = new InventoryServiceApp();
inventoryService.start();

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
  logger.error("unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
