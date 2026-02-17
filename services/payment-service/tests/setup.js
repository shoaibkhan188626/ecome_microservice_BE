import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3005';
process.env.MONGODB_URI = 'mongodb://localhost:27017/payment_test';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';
process.env.RAZORPAY_KEY_ID = 'test_key';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';

// Mock common package functions
vi.mock('@ecommerce/common', async () => {
  const actual = await vi.importActual('@ecommerce/common');
  return {
    ...actual,
    createLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
    MongoConnection: class {
      constructor() {}
      connect() {
        return Promise.resolve();
      }
      disconnect() {
        return Promise.resolve();
      }
      isConnected() {
        return true;
      }
    },
    OutboxPublisher: class {
      constructor() {}
      start() {
        return Promise.resolve();
      }
      stop() {
        return Promise.resolve();
      }
    },
    initTracing: vi.fn(),
    shutdownTracing: vi.fn(),
    initBusinessMetrics: vi.fn(),
  };
});
