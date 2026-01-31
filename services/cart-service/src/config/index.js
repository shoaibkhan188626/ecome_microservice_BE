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

  //Cart Configuration
  get cart() {
    return {
      expiryDays: parseInt(process.env.CART_EXPIRY_DAYS, 10) || 7,
      maxItems: parseInt(process.env.MAX_CART_ITEMS, 10) || 50,
      guestCartExpiry: parseInt(process.env.GUEST_CART_EXPIRY, 10) || 86400,
    };
  }

  //Redis configuration
  get cache() {
    return {
      ttl: parseInt(process.env.REDIS_TTL, 10) || 604800,
    };
  }

  get services() {
    return {
      catalog: process.env.CATALOG_SERVICE_URL || "http://localhost:3002",
      inventory: process.env.INVENTORY_SERVICE_URL || "http://localhost:3003",
    };
  }
}

export default new Config();
