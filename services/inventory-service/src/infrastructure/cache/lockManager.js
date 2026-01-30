import config from "../../config/index.js";
import { createLogger } from "@ecommerce/common";
import { randomBytes } from "crypto";

const logger = createLogger(
  "inventory-service",
  config.logLevel,
  config.isProduction,
);

class LockManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.locks = new Map();
  }

  async acquireLock(resource, ttl = config.lock.ttl) {
    const lockKey = `lock:${resource}`;
    const lockValue = randomBytes(16).toString("hex");
    const retryCount = config.lock.retryCount;
    const retryDelay = config.lock.retryDelay;

    for (let i = 0; i < retryCount; i++) {
      try {
        const result = await this.redis.client.set(
          lockKey,
          lockValue,
          "PX",
          ttl,
          "NX",
        );

        if (result === "OK") {
          this.locks.set(lockKey, lockValue);
          logger.debug(`Lock acquired: ${lockKey}`);
          return lockValue;
        }

        if (i < retryCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        logger.error(`Lock acquisition error for ${resource}:`, error);
      }
    }

    logger.warn(
      `Failed to acquire lock: ${lockKey} after ${retryCount} attempts`,
    );
    return null;
  }

  async releaseLock(resource, lockValue) {
    const lockKey = `lock:${resource}`;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.client.eval(
        script,
        1,
        lockKey,
        lockValue,
      );

      if (result === 1) {
        this.locks.delete(lockKey);
        logger.debug(`Lock released: ${lockKey}`);
        return true;
      }

      logger.warn(`Failed to release lock: ${lockKey} (lock value mismatch)`);
      return false;
    } catch (error) {
      logger.error(`Lock release error for ${resource}:`, error);
      return false;
    }
  }

  async withLock(resource, fn, ttl = config.lock.ttl) {
    const lockValue = await this.acquireLock(resource, ttl);

    if (!lockValue) {
      throw new Error(`Unable to acquire lock for ${resource}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(resource, lockValue);
    }
  }

  async isLocked(resource) {
    const lockKey = `lock:${resource}`;
    return (await this.redis.exists(lockKey)) === 1;
  }
}

export default LockManager;
