import dotenv from "dotenv";
dotenv.config();

class Config {
  constructor() {
    this.validateRequiredEnvVars();
  }

  validateRequiredEnvVars() {
    const required = [
      "PORT",
      "MONGODB_URI",
      "JWT_SECRET",
      "JWT_REFRESH_SECRET",
    ];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }
  }

  get nodeEnv() {
    return process.env.NODE_ENV || "development";
  }

  get port() {
    return parseInt(process.env.PORT, 10) || 3001;
  }

  get mongoUri() {
    return process.env.MONGODB_URI;
  }

  get redisUrl() {
    return process.env.REDIS_URL;
  }

  get logLevel() {
    return process.env.LOG_LEVEL || "info";
  }

  get isDevelopment() {
    return this.nodeEnv === "development";
  }

  get isProduction() {
    return this.nodeEnv === "production";
  }

  get jwt() {
    return {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiry: process.env.JWT_ACCESS_EXPIRES || "15m",
      refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    };
  }

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
