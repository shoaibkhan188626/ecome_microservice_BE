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
import authRoutes from "./api/routes/auth-routes.js";

const logger = createLogger(
  "auth-service",
  config.logLevel,
  config.isProduction,
);

class AuthService {
  constructor() {
    this.app = express();
    this.server = null; // ADDED: Store server instance
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
        service: "Auth Service",
        version: "1.0.0",
        status: "operational",
        features: {
          observability: "OpenTelemetry + Prometheus", // ADDED
        },
        endpoints: {
          health: "/health",
          register: "POST /auth/register",
          login: "POST /auth/login",
          refresh: "POST /auth/refresh",
          logout: "POST /auth/logout",
          me: "GET /auth/me",
          metrics: "GET /metrics", // ADDED
        },
      });
    });

    this.app.use("/auth", authRoutes);

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
      // ADDED: Initialize OpenTelemetry metrics
      const metricsPort = parseInt(config.port) + 1000; // 3001 -> 4001
      initTracing("auth-service", metricsPort);
      initBusinessMetrics();

      await dbConnection.connect(config.mongoUri);

      // ADDED: Store server instance
      this.server = this.app.listen(config.port, () => {
        logger.info(`🚀 Auth Service running on port ${config.port}`);
        logger.info(
          `📊 Metrics available at http://localhost:${metricsPort}/metrics`,
        ); // ADDED
        logger.info(`🔍 Environment: ${config.nodeEnv}`);
        logger.info(`👷 Process ID: ${process.pid}`);
      });
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  }

  // ADDED: Graceful shutdown method
  async stop() {
    logger.info("🛑 Stopping Auth Service...");
    try {
      await shutdownTracing(); // ADDED

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

const authService = new AuthService();
authService.start();

// UPDATED: Use stop() method for graceful shutdown
process.on("SIGTERM", () => authService.stop());
process.on("SIGINT", () => authService.stop()); // ADDED

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  authService.stop(); // UPDATED
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  authService.stop(); // UPDATED
});
