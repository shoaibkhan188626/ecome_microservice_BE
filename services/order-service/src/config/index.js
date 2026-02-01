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

  get rabbitmqUrl() {
    return process.env.RABBITMQ_URL;
  }

  // Order Configuration
  get order() {
    return {
      expiryMinutes: parseInt(process.env.ORDER_EXPIRY_MINUTES, 10) || 15,
      maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS, 10) || 3,
      paymentTimeout: parseInt(process.env.PAYMENT_TIMEOUT, 10) || 300000, // 5 minutes
    };
  }

  // Service URLs
  get services() {
    return {
      cart: process.env.CART_SERVICE_URL || "http://localhost:3004",
      inventory: process.env.INVENTORY_SERVICE_URL || "http://localhost:3003",
      catalog: process.env.CATALOG_SERVICE_URL || "http://localhost:3002",
    };
  }
}

export default new Config();
