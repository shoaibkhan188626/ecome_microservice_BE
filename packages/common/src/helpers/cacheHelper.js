/**
 * Cache Helper - Common caching patterns
 */
export class CacheHelper {
  constructor(redisClient, defaultTTL = 3600) {
    this.redis = redisClient;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get or Set pattern (cache-aside)
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    // Try to get from cache
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from source
    const data = await fetchFunction();

    // Store in cache
    await this.redis.set(key, JSON.stringify(data), ttl);

    return data;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    const keys = await this.redis.client.keys(pattern);

    if (keys.length > 0) {
      await this.redis.client.del(...keys);
    }
  }

  /**
   * Cache lock (prevent cache stampede)
   */
  async withLock(key, fn, lockTTL = 10000) {
    const lockKey = `lock:${key}`;
    const acquired = await this.redis.client.set(
      lockKey,
      "1",
      "PX",
      lockTTL,
      "NX",
    );

    if (!acquired) {
      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.withLock(key, fn, lockTTL);
    }

    try {
      return await fn();
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
