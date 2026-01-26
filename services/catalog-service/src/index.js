import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import logger from "./utils/logger.js";
import databaseConnection from "./infrastructure/database/connection.js";
import requestIdMiddleware from "./api/middlewares/requestId.js";
import errorHandler from "./api/middlewares/errorHandler.js";
import healthRoutes from "./api/routes/healthRoutes.js";
import apiRoutes from "./api/routes/index.js";

/**
 * Catalog service - Product & category management
 *
 * Features:
 * - Infinite category nesting with materialized path
 * - EAV pattern for dynamic product attributes
 * - Full-text search (basic - Atlas Search ready)
 * - Product variants for configurable products
 * - Image management
 * - Advanced filtering and pagination
 */

class CatalogService {
  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    //security headers
    this.app.use(helmet());

    //CORS configuration
    this.app.use(
      cors({
        origin: config.isDevelopment
          ? "*"
          : process.env.ALLOWED_ORIGINS?.split(","),
        credentials: true,
      }),
    );

    //body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    //Request ID for distributed tracing
    this.app.use(requestIdMiddleware);

    //Request logging
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
    //Health check routes
    this.app.use("/", healthRoutes);

    //welcome routes
    this.app.get("/", (req, res) => {
      res.json({
        service: "Catalog Service",
        version: "1.0.0",
        status: "operational",
        endpoint: {
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

    //API routes
    this.app.use("/api", apiRoutes);

    //404 handler
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
    this.app.use(errorHandler);
  }

  async start() {
    try {
      //connection to database
      await databaseConnection.connect();

      //start http server
      this.app.listen(config.port, () => {
        logger.info(`catalog service running on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Process ID: ${process.pid}`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

//initialize and start the service
const catalogService = new CatalogService();
catalogService.start();

//graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. shutting down gracefully...");
  await databaseConnection.disconnect();
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
