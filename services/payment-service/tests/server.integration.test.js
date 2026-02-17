import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { PaymentServer } from '../src/server.js';

describe('PaymentServer Integration', () => {
  let server;
  const TEST_PORT = 3999;

  beforeAll(async () => {
    // Mock config for testing
    vi.mock('../src/config/index.js', () => ({
      default: {
        port: TEST_PORT,
        nodeEnv: 'test',
        mongoUri: 'mongodb://localhost:27017/payment_test',
        rabbitmqUrl: 'amqp://localhost:5672',
        logLevel: 'silent',
        isProduction: false,
      },
    }));

    server = new PaymentServer();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should start and respond to health checks', async () => {
    const response = await request(`http://localhost:${TEST_PORT}`).get('/health').expect(200);

    expect(response.body).toMatchObject({
      service: 'payment-service',
      status: 'operational',
    });
  });

  it('should handle graceful shutdown', async () => {
    const stopPromise = server.stop();
    await expect(stopPromise).resolves.not.toThrow();
  });
});
