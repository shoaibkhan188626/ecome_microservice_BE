import dotenv from "dotenv";
dotenv.config();

class Config {
  constructor() {
    this.validateRequiredEnvVars();
  }

  validateRequiredEnvVars() {
    const required = ["PORT", "REDIS_URL", "RABBITMQ_URL"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }
  }

  get nodeEnv() {
    return process.env.NODE_ENV || "development";
  }

  get port() {
    return parseInt(process.env.PORT, 10) || 3000;
  }

  get redisUrl() {
    return process.env.REDIS_URL;
  }

  get rabbitmqUrl() {
    return process.env.RABBITMQ_URL;
  }

  get logLevel() {
    return process.env.LOG_LEVEL || "info";
  }

  get isDevelopment() {
    return this.nodeEnv === "development";
  }

  get isProduction() {
    return this.nodeEnv === "production";
  }

  get rateLimiting() {
    return {
      windowMs: 15 * 60 * 1000,
      maxRequest: 100,
      standardHeaders: true,
      legacyHeaders: false,
    };
  }

  get services() {
    return {
      auth: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
      catalog: process.env.CATALOG_SERVICE_URL || "http://localhost:3002",
      inventory: process.env.INVENTORY_SERVICE_URL || "http://localhost:3003",
      cart: process.env.CART_SERVICE_URL || "http://localhost:3004",
      order: process.env.ORDER_SERVICE_URL || "http://localhost:3005",
      notification:
        process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3006",
    };
  }
}

export default new Config();
