// packages/common/src/config/base-config.js

import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

/**
 * Base configuration class that all services extend
 * Provides common configuration validation and parsing
 */
export class BaseConfig {
  constructor() {
    this._config = {};
    this.validateRequiredEnvVars();
    this.validateAndParseConfig();
  }

  /**
   * Validate presence of required environment variables
   * @throws {Error} If required variables are missing
   */
  validateRequiredEnvVars() {
    const required = this.getRequiredEnvVars();
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
          `Please check your .env file and environment configuration.`,
      );
    }
  }

  /**
   * Validate and parse configuration using Joi schema
   * @throws {Error} If validation fails
   */
  validateAndParseConfig() {
    const { error, value } = this.getConfigSchema().validate(
      {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        logLevel: process.env.LOG_LEVEL,
        serviceName: process.env.SERVICE_NAME,
        version: process.env.VERSION,
        ...this.getAdditionalEnvVars(),
      },
      {
        abortEarly: false,
        convert: true,
      },
    );

    if (error) {
      const details = error.details.map((detail) => `  - ${detail.message}`).join('\n');

      throw new Error(
        `Configuration validation failed:\n${details}\n\n` +
          `Please check your .env file and environment configuration.`,
      );
    }

    this._config = Object.freeze(value);
  }

  /**
   * Get the Joi schema for base configuration
   * @returns {Joi.ObjectSchema} Base configuration schema
   */
  getConfigSchema() {
    return Joi.object({
      nodeEnv: Joi.string()
        .valid('development', 'test', 'staging', 'production')
        .default('development'),

      port: Joi.number().port().default(3000),

      logLevel: Joi.string().valid('error', 'warn', 'info', 'debug', 'silly').default('info'),

      serviceName: Joi.string().required().description('Name of the microservice'),

      version: Joi.string().default('1.0.0').description('Service version'),
    });
  }

  /**
   * Get list of required environment variables
   * @returns {string[]} Array of required env var names
   */
  getRequiredEnvVars() {
    return ['PORT', 'NODE_ENV', 'SERVICE_NAME'];
  }

  /**
   * Override to add service-specific environment variables
   * @returns {Object} Additional environment variables
   */
  getAdditionalEnvVars() {
    return {};
  }

  /**
   * Get validated node environment
   */
  get nodeEnv() {
    return this._config.nodeEnv;
  }

  /**
   * Get validated port number
   */
  get port() {
    return this._config.port;
  }

  /**
   * Check if running in development
   */
  get isDevelopment() {
    return this.nodeEnv === 'development';
  }

  /**
   * Check if running in test
   */
  get isTest() {
    return this.nodeEnv === 'test';
  }

  /**
   * Check if running in staging
   */
  get isStaging() {
    return this.nodeEnv === 'staging';
  }

  /**
   * Check if running in production
   */
  get isProduction() {
    return this.nodeEnv === 'production';
  }

  /**
   * Get validated log level
   */
  get logLevel() {
    return this._config.logLevel;
  }

  /**
   * Get service name
   */
  get serviceName() {
    return this._config.serviceName;
  }

  /**
   * Get service version
   */
  get version() {
    return this._config.version;
  }

  /**
   * Get all validated config as frozen object
   */
  get all() {
    return this._config;
  }
}
