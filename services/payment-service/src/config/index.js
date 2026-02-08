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

  get rabbitmqUrl() {
    return process.env.RABBITMQ_URL;
  }

  get razorPay() {
    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    };
  }

  get stripe() {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      publishableKey:process.env.STRIPE_PUBLISHABLE_KEY
    };
  }

  get defaultCurrency() {
    return "INR";
  }
}

export default new Config();
