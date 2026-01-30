import { BaseConfig } from "@ecommerce/common";

class Config extends BaseConfig {
  getRequiredEnvVars() {
    return ["PORT", "MONGODB_URI"];
  }

  get mongoUri() {
    return process.env.MONGODB_URI;
  }

  get redisUrl() {
    return process.env.REDIS_URL;
  }

  // Pagination Configuration
  get pagination() {
    return {
      defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
      maxPageSize: parseInt(process.env.MAX_PAGE_SIZE, 10) || 100,
    };
  }

  // Redis Cache Configuration
  get cache() {
    return {
      ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
      enabled: process.env.REDIS_URL ? true : false,
    };
  }

  // Image Processing Configuration
  get images() {
    return {
      maxSize: parseInt(process.env.MAX_IMAGE_SIZE, 10) || 5242880,
      allowedTypes: (
        process.env.ALLOWED_IMAGE_TYPES || "image/jpeg,image/png,image/webp"
      ).split(","),
      thumbnailSizes: (
        process.env.THUMBNAIL_SIZES || "200x200,400x400,800x800"
      ).split(","),
    };
  }

  // Search Configuration
  get search() {
    return {
      enabled: process.env.ENABLE_SEARCH === "true",
    };
  }
}

export default new Config();
