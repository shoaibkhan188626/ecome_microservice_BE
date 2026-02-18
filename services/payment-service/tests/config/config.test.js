import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Config from '../../src/config/index.js';

describe('Config', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Set required env vars
    process.env = {
      PORT: '3005',
      MONGODB_URI: 'mongodb://localhost:27017/payment_test',
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
      RAZORPAY_KEY_ID: 'test_key',
      RAZORPAY_KEY_SECRET: 'test_secret',
      RAZORPAY_WEBHOOK_SECRET: 'test_webhook',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should validate required environment variables', () => {
    const config = new Config();
    expect(config.port).toBe(3005);
    expect(config.mongoUri).toBe('mongodb://localhost:27017/payment_test');
  });

  it('should provide default values', () => {
    const config = new Config();
    expect(config.nodeEnv).toBe('development');
    expect(config.logLevel).toBe('info');
    expect(config.defaultCurrency).toBe('INR');
    expect(config.defaultProvider).toBe('razorpay');
  });

  it('should validate Stripe config when enabled', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';

    expect(() => new Config()).toThrow(/STRIPE_WEBHOOK_SECRET.*required/);

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

    const config = new Config();
    expect(config.isStripeEnabled).toBe(true);
    expect(config.stripe.secretKey).toBe('sk_test_123');
  });

  it('should throw error for invalid port', () => {
    process.env.PORT = '999999';
    expect(() => new Config()).toThrow(/PORT must be a valid port number/);
  });

  it('should throw error for invalid MongoDB URI', () => {
    process.env.MONGODB_URI = 'invalid-uri';
    expect(() => new Config()).toThrow(/MONGODB_URI must be a valid URI/);
  });

  it('should throw error for invalid environment', () => {
    process.env.NODE_ENV = 'invalid';
    expect(() => new Config()).toThrow(/NODE_ENV.*must be one of/);
  });

  it('should handle payment provider configuration', () => {
    const config = new Config();

    expect(config.razorPay).toEqual({
      keyId: 'test_key',
      keySecret: 'test_secret',
      webhookSecret: 'test_webhook',
    });

    expect(config.isStripeEnabled).toBe(false);
  });
});
