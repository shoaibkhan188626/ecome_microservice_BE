import dotenv from "dotenv";
dotenv.config();

/**
 * Base configuration class that all services can extend
 */
export class BaseConfig {
  constructor() {
    this.validateRequiredEnvVars();
  }

  validateRequiredEnvVars() {
    const required = this.getRequiredEnvVars();
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }
  }

  // Override in child classes
  getRequiredEnvVars() {
    return ["PORT", "NODE_ENV"];
  }

  get nodeEnv() {
    return process.env.NODE_ENV || "development";
  }

  get port() {
    return parseInt(process.env.PORT, 10) || 3000;
  }

  get isDevelopment() {
    return this.nodeEnv === "development";
  }

  get isProduction() {
    return this.nodeEnv === "production";
  }

  get logLevel() {
    return process.env.LOG_LEVEL || "info";
  }
}
