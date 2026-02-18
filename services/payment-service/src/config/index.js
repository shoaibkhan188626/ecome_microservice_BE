import { BaseConfig } from '@ecommerce/common';
import { configSchema } from './config-schema.js';

class Config extends BaseConfig {
  constructor() {
    super();
    this.validateEnv();
  }

  validateEnv() {
    const { error, value } = configSchema.validate(process.env, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message).join('\n');
      throw new Error(`Configuration validation failed:\n${errors}`);
    }

    // Store validated values
    this._validatedEnv = value;
  }

  getRequiredEnvVars() {
    return [
      'PORT',
      'MONGODB_URI',
      'REDIS_URL',
      'RABBITMQ_URL',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
    ];
  }

  get port() {
    return this._validatedEnv.PORT;
  }

  get nodeEnv() {
    return this._validatedEnv.NODE_ENV;
  }

  get isDevelopment() {
    return this.nodeEnv !== 'production';
  }

  get isProduction() {
    return this.nodeEnv === 'production';
  }

  get logLevel() {
    return this._validatedEnv.LOG_LEVEL;
  }

  get mongoUri() {
    return this._validatedEnv.MONGODB_URI;
  }

  get redisUrl() {
    return this._validatedEnv.REDIS_URL;
  }

  get rabbitmqUrl() {
    return this._validatedEnv.RABBITMQ_URL;
  }

  get allowedOrigins() {
    return this._validatedEnv.ALLOWED_ORIGINS;
  }

  get razorPay() {
    return {
      keyId: this._validatedEnv.RAZORPAY_KEY_ID,
      keySecret: this._validatedEnv.RAZORPAY_KEY_SECRET,
      webhookSecret: this._validatedEnv.RAZORPAY_WEBHOOK_SECRET,
    };
  }

  get stripe() {
    return {
      secretKey: this._validatedEnv.STRIPE_SECRET_KEY,
      webhookSecret: this._validatedEnv.STRIPE_WEBHOOK_SECRET,
      publishableKey: this._validatedEnv.STRIPE_PUBLISHABLE_KEY,
    };
  }

  get defaultCurrency() {
    return this._validatedEnv.DEFAULT_CURRENCY;
  }

  get defaultProvider() {
    return this._validatedEnv.DEFAULT_PROVIDER;
  }

  get isStripeEnabled() {
    return Boolean(this._validatedEnv.STRIPE_SECRET_KEY);
  }
}

export default new Config();
