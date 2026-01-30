import { BaseConfig } from "@ecommerce/common";

class Config extends BaseConfig {
  getRequiredEnvVars() {
    return ["PORT", "REDIS_URL", "RABBITMQ_URL"];
  }

  get redisUrl() {
    return process.env.REDIS_URL;
  }

  get rabbitmqUrl() {
    return process.env.RABBITMQ_URL;
  }

  get rateLimiting() {
    return {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
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
