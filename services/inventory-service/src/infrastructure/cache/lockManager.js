import redisClient from "./redisClient.js";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";
import { randomBytes } from "crypto";

/**
 * distributed lock manager using redis
 * implement redlock algo for distributed locking
 * use case : prevent race condition when updating the inventory
 */

class LockManager {
  constructor() {
    this.locks = new Map();
  }

  /**
   * Acquire a distributed lock
   * Time Complexity: O(1)
   *
   * @param {String} resource - Resource to lock (e.g., 'inventory:product:123')
   * @param {Number} ttl - Lock TTL in milliseconds
   * @returns {Promise<String|null>} Lock identifier or null if failed
   */

  async acquireLock(resource, ttl = config.lock.ttl) {
    const lockKey = `lock:${resource}`;
    const lockValue = randomBytes(16).toString("hex");
    const retryCount = config.lock.retryCount;
    const retryDelay = config.lock.retryDelay;

    for (let i = 0; i < retryCount; i++) {
      try {
        // SET NX (only if not exists) with expiry
        const result = await redisClient.client.set(
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

  /**
   * Release a distributed lock
   * Time Complexity: O(1)
   *
   * @param {String} resource - Resource to unlock
   * @param {String} lockValue - Lock identifier from acquireLock
   * @returns {Promise<Boolean>} True if unlocked successfully
   */

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

      const result = await redisClient.client.eval(
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
      logger.warn(`Failed to release lock :${lockKey} (lock value mismatch)`);
      return false;
    } catch (error) {
      logger.error(` Lock release error for ${resource}:`, error);
      return false;
    }
  }

  /**
   * Execute function with lock
   * Automatically acquires and releases lock
   *
   * @param {String} resource - Resource to lock
   * @param {Function} fn - Function to execute
   * @param {Number} ttl - Lock TTL
   * @returns {Promise<any>} Result of fn
   */

  async withLock(resource, fn, ttl = config.lock.ttl) {
    const lockValue = await this.acquireLock(resource, ttl);

    if (!lockValue) {
      throw new Error(`unable to acquire lock for ${resource}`);
    }
    try {
      return await fn();
    } finally {
      await this.releaseLock(resource, lockValue);
    }
  }

  /**
   * Check if resource is closed
   * 
   * @param {String} resource - Resource to check
   * @returns {Promise<Boolean>}
   */

  async isLocked (resource){
    const lockKey=`lock: ${resource}`;
    return await redisClient.exists(lockKey)===1
  }
}


export default new LockManager()