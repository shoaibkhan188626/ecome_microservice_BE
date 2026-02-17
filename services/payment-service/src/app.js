import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestIdMiddleware, createErrorHandler } from '@ecommerce/common';
import paymentRoutes from './api/routes/payment-routes.js';

/**
 * Creates and configures the Express application
 */
export class PaymentServiceApp {
  constructor(config, logger) {
    this.app = express();
    this.config = config;
    this.logger = logger;
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: this.config.isDevelopment ? '*' : this.config.allowedOrigins || '*',
        credentials: true,
      }),
    );

    // Body parsing - JSON for regular API
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Raw body for webhook signature verification
    this.app.use(
      '/api/payments/webhooks',
      express.raw({
        type: 'application/json',
        limit: '10mb',
      }),
    );

    this.app.use(requestIdMiddleware);

    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.originalUrl}`, {
        requestId: res.locals.requestId,
        ip: req.ip,
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', async (req, res) => {
      const health = {
        service: 'payment-service',
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: this.config.nodeEnv,
        uptime: process.uptime(),
        features: {
          observability: 'OpenTelemetry + Prometheus',
          gateways: ['razorpay', 'stripe'],
          idempotency: 'Enabled via keys',
          webhooks: 'Signature verified + idempotent',
          refunds: 'Full and partial supported',
          capture: 'Manual capture flow',
          outboxPattern: 'Guaranteed event delivery',
        },
      };

      try {
        if (this.dbConnection?.isConnected?.()) {
          health.database = 'connected';
        } else {
          health.database = 'disconnected';
          health.status = 'degraded';
        }
      } catch {
        health.database = 'unknown';
      }

      const statusCode = health.status === 'operational' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Service info
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Payment Service',
        version: '1.0.0',
        description: 'Multi-gateway payment processing with webhook idempotency',
        status: 'operational',
        endpoints: {
          createPayment: 'POST /api/payments',
          getPayment: 'GET /api/payments/:paymentId',
          getStatus: 'GET /api/payments/:paymentId/status',
          refund: 'POST /api/payments/:paymentId/refund',
          capture: 'POST /api/payments/:paymentId/capture',
          methods: 'GET /api/payments/methods',
          webhooks: {
            razorpay: 'POST /api/payments/webhooks/razorpay',
            stripe: 'POST /api/payments/webhooks/stripe',
          },
          health: '/health',
          metrics: 'GET /metrics',
        },
      });
    });

    // API routes
    this.app.use('/api/payments', paymentRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          path: req.originalUrl,
          method: req.method,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: res.locals.requestId,
        },
      });
    });
  }

  setupErrorHandling() {
    this.app.use(createErrorHandler(this.logger, this.config.isProduction));
  }

  // Method to inject dependencies after construction
  setDependencies({ dbConnection }) {
    this.dbConnection = dbConnection;
  }

  // Get the Express app instance
  getApp() {
    return this.app;
  }
}
