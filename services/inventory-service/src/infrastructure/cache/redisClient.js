import Redis from "ioredis";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";

/**
 * Redis client for caching and distributed locking
 */

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    try {
      this.client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
        },
      });

      this.client.on("connect", () => {
        logger.info("Redis connected successfully");
        this.isConnected = true;
      });

      this.client.on("error", (err) => {
        logger.error("Redis connection error:", err);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        logger.warn("Redis connection closed");
        this.isConnected = false;
      });

      return this.client;
    } catch (error) {
      logger.error("Failed to create redis client:", error);
      throw error;
    }
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = config.cache.ttl) {
    try {
      if (ttl) {
        await this.client.set(key, value, "EX", ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return 0;
    }
  }

  async incr(key) {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return null;
    }
  }

  async decr(key) {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error(`Redis DECR error for key ${key}:`, error);
      return null;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      logger.info("Redis connection closed");
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.client?.status || "disconnected",
    };
  }
}

export default new RedisClient();
