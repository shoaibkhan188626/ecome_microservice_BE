import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import {
  requestIdMiddleware,
  createErrorHandler,
  ErrorCodes,
  ResponseHandler
} from '@ecommerce/common';
import paymentRoutes from './api/routes/payment-routes.js';
import { errorHandler } from './api/middlewares/error-handler.js';

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
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: this.config.isProduction ? undefined : false,
    }));

    this.app.use(cors({
      origin: this.config.isDevelopment ? '*' : this.config.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID'],
    }));

    // Request Parsing
    this.app.use(express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        // Store raw body for webhook signature verification
        if (req.originalUrl.startsWith('/api/payments/webhooks')) {
          req.rawBody = buf;
        }
      }
    }));

    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb'
    }));

    // Observability
    this.app.use(requestIdMiddleware());

    // Request Logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();

      // Log on response finish
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.logger.info({
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration,
          requestId: res.locals.requestId,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        }, `${req.method} ${req.originalUrl}`);
      });

      next();
    });
  }

  setupRoutes() {
    // Health Check
    this.app.get('/health', async (req, res) => {
      const health = {
        service: 'payment-service',
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: this.config.version,
        environment: this.config.nodeEnv,
        uptime: process.uptime(),
        features: {
          observability: 'OpenTelemetry + Prometheus',
          gateways: ['razorpay', this.config.isStripeEnabled && 'stripe'].filter(Boolean),
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
      } catch (error) {
        health.database = 'unknown';
        health.status = 'degraded';
        this.logger.error({ err: error }, 'Health check database error');
      }

      const statusCode = health.status === 'operational' ? 200 : 503;
      ResponseHandler.success(res, health, statusCode);
    });

    // Service Info
    this.app.get('/', (req, res) => {
      ResponseHandler.success(res, {
        service: 'Payment Service',
        version: this.config.version,
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
            ...(this.config.isStripeEnabled && {
              stripe: 'POST /api/payments/webhooks/stripe'
            }),
          },
          health: '/health',
          metrics: 'GET /metrics',
        },
      });
    });

    // API Routes
    this.app.use('/api/payments', paymentRoutes);

    // 404 Handler
    this.app.use((req, res) => {
      ResponseHandler.error(res, {
        code: ErrorCodes.ROUTE_NOT_FOUND,
        message: `Cannot ${req.method} ${req.originalUrl}`,
        statusCode: 404,
      });
    });
  }

  setupErrorHandling() {
    // Use our custom error handler
    this.app.use(errorHandler);

    // Fallback error handler from common package
    this.app.use(createErrorHandler(this.logger, this.config.isProduction));
  }

  setDependencies({ dbConnection }) {
    this.dbConnection = dbConnection;
  }

  getApp() {
    return this.app;
  }
}
