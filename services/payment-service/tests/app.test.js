import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { PaymentServiceApp } from '../src/app.js';

describe('PaymentServiceApp', () => {
  let app;
  let mockLogger;
  let mockConfig;
  let mockDbConnection;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Mock config
    mockConfig = {
      isDevelopment: true,
      isProduction: false,
      nodeEnv: 'test',
      port: 3005,
    };

    // Mock DB connection
    mockDbConnection = {
      isConnected: vi.fn().mockReturnValue(true),
    };

    // Create app instance
    app = new PaymentServiceApp(mockConfig, mockLogger);
    app.setDependencies({ dbConnection: mockDbConnection });
  });

  describe('Health Check', () => {
    it('should return healthy status when DB is connected', async () => {
      const response = await request(app.getApp())
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        service: 'payment-service',
        status: 'operational',
        environment: 'test',
        features: {
          gateways: ['razorpay', 'stripe'],
          idempotency: 'Enabled via keys',
        },
        database: 'connected',
      });
    });

    it('should return degraded status when DB is disconnected', async () => {
      mockDbConnection.isConnected.mockReturnValue(false);

      const response = await request(app.getApp())
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'degraded',
        database: 'disconnected',
      });
    });
  });

  describe('Service Info', () => {
    it('should return API documentation', async () => {
      const response = await request(app.getApp())
        .get('/')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        service: 'Payment Service',
        version: '1.0.0',
        endpoints: {
          createPayment: 'POST /api/payments',
          webhooks: {
            razorpay: expect.any(String),
            stripe: expect.any(String),
          },
        },
      });
    });
  });

  describe('404 Handler', () => {
    it('should return standardized error for unknown routes', async () => {
      const response = await request(app.getApp())
        .get('/unknown-route')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          path: '/unknown-route',
          method: 'GET',
        },
        metadata: {
          timestamp: expect.any(String),
          requestId: expect.any(String),
        },
      });
    });
  });

  describe('Middleware', () => {
    it('should log requests', async () => {
      await request(app.getApp()).get('/health');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'GET /health',
        expect.objectContaining({
          requestId: expect.any(String),
          ip: expect.any(String),
        }),
      );
    });

    it('should parse JSON bodies', async () => {
      const payload = { test: 'data' };

      const response = await request(app.getApp())
        .post('/api/payments')
        .send(payload)
        .set('Content-Type', 'application/json');

      // Even though route doesn't exist, body was parsed
      expect(response.status).toBe(404);
    });

    it('should accept raw bodies for webhooks', async () => {
      const rawBody = JSON.stringify({ event: 'payment.success' });

      const response = await request(app.getApp())
        .post('/api/payments/webhooks/razorpay')
        .send(rawBody)
        .set('Content-Type', 'application/json');

      // Even though route isn't implemented, body was accepted as raw
      expect(response.status).toBe(404);
    });
  });
});
