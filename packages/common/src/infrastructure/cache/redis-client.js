import Redis from "ioredis";

/**
 * Shared Redis Client Factory
 */
export class RedisClient {
  constructor(logger) {
    this.logger = logger;
    this.client = null;
    this.isConnected = false;
  }

  connect(redisUrl) {
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on("connect", () => {
        this.logger.info("✅ Redis connected successfully");
        this.isConnected = true;
      });

      this.client.on("error", (err) => {
        this.logger.error("❌ Redis connection error:", err);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        this.logger.warn("⚠️  Redis connection closed");
        this.isConnected = false;
      });

      return this.client;
    } catch (error) {
      this.logger.error("Failed to create Redis client:", error);
      throw error;
    }
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (ttl) {
        await this.client.set(key, value, "EX", ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.logger.info("👋 Redis connection closed");
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      status: this.client?.status || "disconnected",
    };
  }
}
