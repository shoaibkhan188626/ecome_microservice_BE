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
import healthRoutes, { dbConnection } from "./api/routes/health-routes.js";
import apiRoutes from "./api/routes/index.js";

const logger = createLogger(
  "catalog-service",
  config.logLevel,
  config.isProduction,
);

class CatalogService {
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
        features: {
          observability: "OpenTelemetry + Prometheus", // ADDED
        },
        endpoints: {
          health: "/health",
          categories: "GET /categories",
          categoryTree: "GET /categories/tree",
          products: "GET /products",
          productsByCategory: "GET /categories/:id/products",
          search: "GET /products/search?q=keyword",
          featured: "GET /products/featured",
          metrics: "GET /metrics", // ADDED
        },
      });
    });

    this.app.use("/", apiRoutes);

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
      // ADDED: Initialize OpenTelemetry FIRST (before DB connections)
      const metricsPort = parseInt(config.port) + 1000; // 3002 -> 4002
      initTracing("catalog-service", metricsPort);
      initBusinessMetrics();

      await dbConnection.connect(config.mongoUri);

      // ADDED: Store server instance
      this.server = this.app.listen(config.port, () => {
        logger.info(`✅ Catalog Service running on port ${config.port}`);
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
    logger.info("🛑 Stopping Catalog Service...");
    try {
      await shutdownTracing(); // ADDED: Shutdown OpenTelemetry

      if (this.server) {
        await new Promise((resolve) => this.server.close(resolve));
        logger.info("HTTP server closed");
      }

      await dbConnection.disconnect();
      logger.info("Database disconnected");
    } catch (e) {
      logger.error("Error during shutdown:", e);
    }
    process.exit(0);
  }
}

const catalogService = new CatalogService();
catalogService.start();

// UPDATED: Use stop() method for graceful shutdown
process.on("SIGTERM", () => catalogService.stop());
process.on("SIGINT", () => catalogService.stop()); // ADDED: Handle Ctrl+C

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  catalogService.stop(); // UPDATED: Call stop() instead of immediate exit
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  catalogService.stop(); // UPDATED: Call stop() instead of immediate exit
});
