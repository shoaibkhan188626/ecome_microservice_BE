import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./src/config/index.js";
import {
  createLogger,
  requestIdMiddleware,
  createErrorHandler,
} from "@ecommerce/common";

import rateLimiter, {
  strictRateLimiter,
} from "./src/api/middlewares/rate-limiter.js";

import proxyHandler from "./src/api/middlewares/proxy-handler.js";
import healthRouter from "./src/api/routes/health.js";
import cluster from "cluster";
import os from "os";

const logger = createLogger(
  "api-gateway",
  config.logLevel,
  config.isProduction,
);

class ApiGateway {
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
    this.app.use(rateLimiter);

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
    this.app.use("/", healthRouter);

    this.app.get("/", (req, res) => {
      res.json({
        message: "E-commerce API Gateway",
        version: "1.0.0",
        status: "operational",
        endpoints: {
          health: "/health",
          ready: "/ready",
          live: "/live",
        },
      });
    });

    this.app.use("/api/auth", strictRateLimiter);

    const routes = proxyHandler.getRoutes();
    routes.forEach(({ path, service }) => {
      logger.info(`Registering proxy route: ${path} -> ${service}`);
      this.app.use(path, proxyHandler.createProxy(service, path));
    });

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

  start() {
    this.app.listen(config.port, () => {
      logger.info(`🚀 API Gateway running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`👷 Worker PID: ${process.pid}`);
    });
  }
}

if (config.isProduction && cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  logger.info(`🖥️  Master process starting. CPUs: ${numCPUs}`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died. Spawning replacement...`);
    cluster.fork();
  });
} else {
  const gateway = new ApiGateway();
  gateway.start();
}

process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
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
