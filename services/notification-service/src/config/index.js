import { BaseConfig } from "@ecommerce/common";

class Config extends BaseConfig {
  getRequiredEnvVars() {
    return ["PORT", "MONGODB_URI", "RABBITMQ_URL"];
  }

  get mongoUri() {
    return process.env.MONGODB_URI;
  }

  get redisUrl() {
    return process.env.REDIS_URL;
  }

  get rabbitmqUrl() {
    return process.env.RABBITMQ_URL;
  }

  get email() {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.EMAIL_FROM || "E-commerce <noreply@ecommerce.com>",
    };
  }

  // SMS Configuration (Fonoster)
  get sms() {
    return {
      fonosterUrl:
        process.env.FONOSTER_API_URL || "https://api.fonoster.io/v1beta1",
      apiKey: process.env.FONOSTER_API_KEY,
      apiSecret: process.env.FONOSTER_API_SECRET,
      senderId: process.env.FONOSTER_SENDER_ID, // Your Fonoster number
      // Advanced settings
      maxRetries: parseInt(process.env.SMS_MAX_RETRIES, 10) || 3,
      retryDelay: parseInt(process.env.SMS_RETRY_DELAY, 10) || 1000,
      batchSize: parseInt(process.env.SMS_BATCH_SIZE, 10) || 50,
      rateLimitDelay: parseInt(process.env.SMS_RATE_LIMIT_DELAY, 10) || 200,
    };
  }

  get push() {
    return {
      firebaseServerKey: process.env.FIREBASE_SERVER_KEY,
    };
  }

  get notification() {
    return {
      maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS, 10) || 3,
      retryDelay: parseInt(process.env.RETRY_DELAY_MS, 10) || 5000,
    };
  }
}

export default new Config();
