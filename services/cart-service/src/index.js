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
import healthRoutes, {
  dbConnection,
  redisClient,
} from "./api/routes/health-routes.js";
import createCartRoutes from "./api/routes/cart-routes.js";
import CartService from "./domain/services/cart-service.js";
import CartController from "./api/controllers/cart-controller.js";

const logger = createLogger(
  "cart-service",
  config.logLevel,
  config.isProduction,
);

class CartServiceApp {
  constructor() {
    this.app = express();
    this.server = null; // ADDED: Store server instance for graceful shutdown
    this.cartService = null;
    this.cartController = null;
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
        service: "Cart Service",
        version: "1.0.0",
        status: "operational",
        features: {
          observability: "OpenTelemetry + Prometheus", // ADDED
        },
        endpoints: {
          health: "/health",
          cart: "GET /cart",
          addItem: "POST /cart/items",
          updateItem: "PUT /cart/items/:productId",
          removeItem: "DELETE /cart/items/:productId",
          clearCart: "DELETE /cart",
          mergeCart: "POST /cart/merge",
          validateCart: "POST /cart/validate",
          itemCount: "GET /cart/count",
          metrics: "GET /metrics", // ADDED
        },
      });
    });

    //initialize dependencies
    this.cartService = new CartService(redisClient);
    this.cartController = new CartController(this.cartService);

    const cartRoutes = createCartRoutes(this.cartController);
    this.app.use("/cart", cartRoutes);

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
      const metricsPort = parseInt(config.port) + 1000; // 3004 -> 4004
      initTracing("cart-service", metricsPort);
      initBusinessMetrics();

      await dbConnection.connect(config.mongoUri);
      await redisClient.connect(config.redisUrl);

      // ADDED: Store server instance
      this.server = this.app.listen(config.port, () => {
        logger.info(`✅ Cart Service running on port ${config.port}`);
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
    logger.info("🛑 Stopping Cart Service...");
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

const cartService = new CartServiceApp();
cartService.start();

// UPDATED: Use stop() method for graceful shutdown
process.on("SIGTERM", () => cartService.stop());
process.on("SIGINT", () => cartService.stop()); // ADDED: Handle Ctrl+C

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  cartService.stop(); // UPDATED: Call stop() instead of immediate exit
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  cartService.stop(); // UPDATED: Call stop() instead of immediate exit
});
