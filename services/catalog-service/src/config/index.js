import dotenv from "dotenv";
dotenv.config();

/**
 * Centralized configuration management for catalog Service
 * All environment variables are validated on Startup
 */

class Config {
  constructor() {
    this.validateRequiredEnvVars();
  }

  validateRequiredEnvVars() {
    const required = ["PORT", "MONGODB_URI"];
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
    return parseInt(process.env.PORT, 10) || 3002;
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

  //pagination
  get pagination() {
    return {
      defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
      maxPageSize: parseInt(process.env.MAX_PAGE_SIZE, 10) || 100,
    };
  }

  get cache() {
    return {
      ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
      enabled: process.env.REDIS_URL ? true : false,
    };
  }

  get images() {
    return {
      maxSize: parseInt(process.env.MAX_IMAGE_SIZE, 10) || 5242880,
      allowedTypes: (
        process.env.ALLOWED_IMAGE_TYPES || "image/jpeg,image/png,image/webp"
      ).split(","),
      thumbnailSizes:
        process.env.THUMBNAIL_SIZES || "200x200,400x400,800x800".split(","),
    };
  }

  get search() {
    return {
      enabled: process.env.ENABLE_SEARCH === "true",
    };
  }
}

export default new Config();
