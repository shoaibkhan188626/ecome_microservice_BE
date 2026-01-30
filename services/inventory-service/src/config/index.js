import { BaseConfig } from "@ecommerce/common";

class Config extends BaseConfig {
  getRequiredEnvVars() {
    return ["PORT", "MONGODB_URI", "REDIS_URL"];
  }

  get mongoUri() {
    return process.env.MONGODB_URI;
  }

  get redisUrl() {
    return process.env.REDIS_URL;
  }

  // Inventory Configuration
  get inventory() {
    return {
      reservationTTL: parseInt(process.env.RESERVATION_TTL, 10) || 900,
      lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 10,
      enableBackorders: process.env.ENABLE_BACKORDERS === "true",
    };
  }

  // Redlock Configuration
  get lock() {
    return {
      ttl: parseInt(process.env.LOCK_TTL, 10) || 10000,
      retryCount: parseInt(process.env.LOCK_RETRY_COUNT, 10) || 3,
      retryDelay: parseInt(process.env.LOCK_RETRY_DELAY, 10) || 200,
    };
  }

  // Cache Configuration
  get cache() {
    return {
      ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
    };
  }
}

export default new Config();
