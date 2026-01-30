import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
} from "@ecommerce/common";
import healthRoutes, { dbConnection } from "./api/routes/healthRoutes.js";
import apiRoutes from "./api/routes/index.js";

const logger = createLogger(
  "catalog-service",
  config.logLevel,
  config.isProduction,
);

class CatalogService {
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
      }),
    );

    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    this.app.use(requestIdMiddleware);

    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        requestId: res.locals.requestId,
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
        service: "Catalog Service",
        version: "1.0.0",
        status: "operational",
        endpoints: {
          health: "/health",
          categories: "GET /api/categories",
          categoryTree: "GET /api/categories/tree",
          products: "GET /api/products",
          productsByCategory: "GET /api/categories/:id/products",
          search: "GET /api/products/search?q=keyword",
          featured: "GET /api/products/featured",
        },
      });
    });

    this.app.use("/api", apiRoutes);

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

      this.app.listen(config.port, () => {
        logger.info(`🚀 Catalog Service running on port ${config.port}`);
        logger.info(`📊 Environment: ${config.nodeEnv}`);
        logger.info(`👷 Process ID: ${process.pid}`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

const catalogService = new CatalogService();
catalogService.start();

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
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
