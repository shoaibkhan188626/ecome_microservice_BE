import { BaseConfig } from "@ecommerce/common";

class Config extends BaseConfig {
  getRequiredEnvVars() {
    return ["PORT", "MONGODB_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];
  }

  get mongoUri() {
    return process.env.MONGODB_URI;
  }

  get redisUrl() {
    return process.env.REDIS_URL;
  }

  // JWT Configuration
  get jwt() {
    return {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
      refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    };
  }

  // Security Configuration
  get security() {
    return {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
      lockoutTime: parseInt(process.env.LOCKOUT_TIME, 10) || 900000,
    };
  }

  get roles() {
    return {
      SUPER_ADMIN: "super_admin",
      ADMIN: "admin",
      VENDOR: "vendor",
      CUSTOMER: "customer",
      GUEST: "guest",
    };
  }

  get permissions() {
    return {
      super_admin: ["*"],
      admin: [
        "users:read",
        "users:write",
        "users:delete",
        "products:read",
        "products:write",
        "orders:read",
        "orders:write",
      ],
      vendor: ["products:read", "products:write", "orders:read"],
      customer: [
        "products:read",
        "orders:read",
        "orders:write",
        "cart:read",
        "cart:write",
      ],
      guest: ["products:read"],
    };
  }
}

export default new Config();
