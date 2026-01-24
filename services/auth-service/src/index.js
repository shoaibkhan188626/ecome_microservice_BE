import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import databaseConnection from "./infrastructure/database/connection.js";
import requestMiddleware from "./api/middlewares/requestId.js";
import errorHandler from "./api/middlewares/errorHandler.js";
import authRoutes from "./api/routes/authRoutes.js";
import healthRoutes from "./api/routes/healthRoutes.js";
import logger from "./utils/logger.js";

/**
 * Auth service - Microservice for authentication and authorization
 *
 * features:
 *  - JWT-based authentication with refresh token
 *  - Role-based access control (RBAC)
 *  - password hashing with bcrypt
 *  - account lockout after failed attempts
 *  - token rotation for security
 *
 * Performance:
 *  - non blocking async/await operations
 *  - database connection pooling
 *  - indexed queries fo lookups
 */

class AuthService {
  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * configuration of essential middlewares
   */

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

    //Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request ID for distributed system tracing
    this.app.use(requestMiddleware);

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
   * setup of all routes
   */
  setupRoutes() {
    //health check routes
    this.app.use("/", healthRoutes);

    //welcome route
    this.app.get("/", (req, res) => {
      res.json({
        service: "Auth-service",
        version: "1.0.0",
        status: "operational",
        endpoints: {
          health: "/health",
          register: "POST /auth/register",
          login: "POST /auth/login",
          refresh: "POST auth/refresh",
          logout: "POST /auth/logout",
          me: "GET /auth/me",
        },
      });
    });

    //Auth Routes
    this.app.use("/auth", authRoutes);

    //temporarily printing all of working

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

  /**setup global error handler (this should be at very last) */
  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  /**
   * Starting the server
   */

  async start() {
    try {
      //connecting to database first
      await databaseConnection.connect();

      //start HTTP server
      this.app.listen(config.port, () => {
        logger.info(`Auth service running on PORT : ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`process ID : ${process.pid}`);
      });
    } catch (error) {
      logger.error("Failed to start the server:", error);
      process.exit(1);
    }
  }
}

//initialization and start of the service

const authService = new AuthService();
authService.start();

//graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  await databaseConnection.disconnect();
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});
