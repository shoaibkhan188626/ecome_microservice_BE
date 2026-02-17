import config from './config/index.js';
import {
  createLogger,
  MongoConnection,
  OutboxPublisher,
  initTracing,
  shutdownTracing,
  initBusinessMetrics,
} from '@ecommerce/common';

import { PaymentServiceApp } from './app.js';

const logger = createLogger('payment-service', config.logLevel, config.isProduction);

class PaymentServer {
  constructor() {
    this.logger = logger;
    this.config = config;
    this.dbConnection = new MongoConnection(logger);
    this.app = new PaymentServiceApp(config, logger);
    this.server = null;
    this.OutboxPublisher = null;
  }

  async start() {
    try {
      const metricsPort = parseInt(this.config.port) + 1000;
      initTracing('payment-service', metricsPort);
      initBusinessMetrics();

      await this.dbConnection.connect(this.config.mongoUri);
      this.logger.info('Database connected');

      this.app.setDependencies({
        dbConnection: this.dbConnection,
      });

      this.outboxPublisher = new OutboxPublisher({
        rabbitmqurl: this.config.rabbitmqUrl,
        exchange: 'payment.events',
        logger: this.logger,
      });

      await this.outboxPublisher.start();
      this.logger.info('Outbox publisher started');

      this.server = this.app.getApp().listen(this.config.port, () => {
        this.logger.info(`Payment Service running on port ${this.config.port}`);
        this.logger.info(`📊 Metrics available at http://localhost:${metricsPort}/metrics`);
        this.logger.info(`🔧 Environment: ${this.config.nodeEnv}`);
        this.logger.info(`🆔 Process ID: ${process.pid}`);
        this.logger.info(`🔒 Idempotency: Enabled`);
        this.logger.info(`🎫 Webhook Protection: Signature + Deduplication`);
        this.logger.info(`💰 Gateways: Razorpay, Stripe`);
      });
    } catch (error) {
      this.logger.error('Failed to start Payment service:', err);
      process.exit(1);
    }
  }

  async stop() {
    this.logger.info('Stop payment service...');
    try {
      await shutdownTracing();

      if (this.server) {
        await new Promise((resolve) => this.server.close(resolve));
        this.logger.info('HTTP server closed');
      }

      if (this.outboxPublisher) {
        await this.outboxPublisher.stop();
        this.logger.info('Outbox publisher stopped');
      }

      await this.dbConnection.disconnect();
      this.logger.info('Database disconnected');
    } catch (err) {
      this.logger.error('Error during shutdown', err);
    }
    process.exit(0);
  }
}

const server = new PaymentServer();

server.start().catch((err) => {
  logger.error('Startup failure:', err);
  process.exit(1);
});

process.on('SIGINT', () => server.stop());
process.on('SIGTERM', () => server.stop());

process.on('uncaughtException', (err) => {
  logger.error('uncaught exception:', err);
  server.stop();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { reason });
  server.stop();
});
