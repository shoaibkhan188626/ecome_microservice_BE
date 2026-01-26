import dotenv from "dotenv";
dotenv.config();

class Config {
  constructor() {
    this.validateRequiredEnvVariables();
  }

  validateRequiredEnvVariables() {
    const required = ["PORT", "MONGODB_URI", "REDIS_URL"];
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
    return parseInt(process.env.PORT, 10) || 3003;
  }

  get mongoUri() {
    return process.env.MONGODB_URI;
  }

  get redisUrl() {
    return process.env.REDIS_URL;
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

  //inventory configuration
  get inventory() {
    return {
      reservationTTL: parseInt(process.env.RESERVATION_TTL, 10) || 900,
      lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 10,
      enableBackorders: process.env.ENABLE_BACKORDERS === "true",
    };
  }

  //Redlock configuration
  get lock() {
    return {
      ttl: parseInt(process.env.LOCK_TTL, 10) || 10000,
      retryCount: parseInt(process.env.LOCK_RETRY_COUNT) || 3,
      retryDelay: parseInt(process.env.LOCK_RETRY_DELAY) || 200,
    };
  }

  get cache() {
    return {
      ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
    };
  }
}

export default new Config();
