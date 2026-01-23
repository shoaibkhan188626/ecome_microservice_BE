import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import logger from "./utils/logger.js";
import requestIdMiddleware from "./api/middlewares/requestId.js";
import rateLimiter, {
  strictRateLimiter,
} from "./api/middlewares/rateLimiter.js";
import errorHandler from "./api/middlewares/errorHandler.js";
import proxyHandler from "./api/middlewares/proxyHandler";
import healthRouter from "./api/routes/health.js";
import cluster, { worker } from "cluster";
import os from "os";

/**
 * API Gateway - entry point for all client requests
 * implementation of clustering for multi core utilization
 *
 * Architectural Pattern : API Gateway + Reverse Proxy
 * Performance : Utilizes all cpu corse via node.js cluster module
 */

class ApiGateway {
  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configuration of essential middlewares
   * Here order matters the most - because these run in sequence for each request
   */

  setupMiddlewares() {
    //Security Headers
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

    //request ID for distributed tracing
    this.app.use(requestIdMiddleware);

    //global Rate limiting (can be overridden per route)
    this.app.use(rateLimiter);

    //request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        requestId: res.locals.requestId,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      next();
    });
  }

  /**
   * setup of all routes and proxies
   * Dynamic routing to microservices
   */

  setupRoutes() {
    this.app.use("/", healthRouter);

    //Welcome route
    this.app.get("/", (req, res) => {
      res.json({
        message: "E-commerce API Gateway",
        version: "1.0.0",
        status: "operational",
        endPoints: {
          health: "/health",
          ready: "/ready",
          live: "/live",
        },
      });
    });

    //Apply strict rate limit to auth endpoints
    this.app.use("/api/auth", strictRateLimiter);

    //Dynamic proxy routes to microservices

    const routes = proxyHandler.getRoutes();
    routes.forEach(({ path, service }) => {
      logger.info(`Registration prosy route: ${path} -> ${service}`);
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

  /**
   * setup global error handler (must always be last)
   */

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  /**
   * server's actual code starts from here
   */

  start() {
    this.app.listen(config.port, () => {
      logger.info(`API gateway running successfully on port ${config.port}`);
      logger.info(`Environment ${config.nodeEnv}`);
      logger.info(`Worker PID ; ${process.pid}`);
    });
  }
}

/**
 * clustering for production performance
 * spawns a worker process for each CPU cors
 */

if (config.isProduction && cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  logger.info(` Master process starting. CPUs: ${numCPUs}`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  //respawn the dead workers

  cluster.on("exit", (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died. spawning replacement`);
    cluster.fork();
  });
} else {
  const gateway = new ApiGateway();
  gateway.start();
}

//graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});
