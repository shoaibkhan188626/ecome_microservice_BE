import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRoutes from '../../../src/api/routes/health-routes.js';

describe('Health Routes', () => {
  const app = express();
  app.use('/health', healthRoutes);

  it('should return healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      service: 'payment-service',
      status: 'healthy',
    });
    expect(response.body.data.timestamp).toBeDefined();
    expect(response.body.data.uptime).toBeTypeOf('number');
  });
});
