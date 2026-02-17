// Infrastructure - Database
export {
  MongoConnection,
  OutboxEvent,
  TransactionManager,
} from './infrastructure/database/index.js';

// Infrastructure - Cache
export { RedisClient } from './infrastructure/cache/index.js';

// Infrastructure - Messaging
export { RabbitMQClient, OutboxPublisher } from './infrastructure/messaging/index.js';

// Infrastructure - Payment
export { PaymentGateway } from './infrastructure/payment/payment-gateway.js';
export { default as RazorpayAdapter } from './infrastructure/payment/razorpay-adapter.js';

// Infrastructure - Observability
export {
  initTracing,
  shutdownTracing,
  getPrometheusExporter,
} from './infrastructure/observability/tracing.js';

export {
  createCounter,
  createUpDownCounter,
  createHistogram,
  createGauge,
  initBusinessMetrics,
  recordOrder,
  recordPayment,
  recordInventory,
  recordNotification,
} from './infrastructure/observability/metrics.js';

// Errors
export { AppError } from './errors/app-error.js';

// Middlewares
export { createErrorHandler } from './middlewares/error-handler.js';
export { requestIdMiddleware } from './middlewares/request-id.js';

// Utils
export { createLogger } from './utils/logger.js';
export { HTTPClient } from './utils/http-client.js';
export { JWTHelper } from './utils/jwt-helper.js';
export { ResponseHandler } from './utils/response-handler.js';
export { DateHelper } from './utils/date-helper.js';
export { PasswordHelper } from './utils/password-helper.js';

// Helpers
export { asyncHandler } from './helpers/async-handler.js';
export { CacheHelper } from './helpers/cache-helper.js';
export { PaginationHelper } from './helpers/pagination.js';
export { generateSlug, generateUniqueSlug } from './helpers/slugify.js';

// Validators
export { validators } from './validators/common-validators.js';

// Config
export { BaseConfig } from './config/base-config.js';

// Webhook
export { default as WebhookEvent } from './infrastructure/database/webhook-event.js';
export { webhookIdempotency } from './middlewares/webhook-idempotency.js';

// ─── NEW: Constants ───────────────────────────────────────────────────────────
export { ErrorCodes } from './constants/error-codes.js';
export { EventTypes } from './constants/event-types.js';

// ─── NEW: Event Contracts ─────────────────────────────────────────────────────
export { createEvent } from './contracts/events/base-event.js';

// Order Events
export {
  createOrderCreatedEvent,
  createOrderConfirmedEvent,
  createOrderCancelledEvent,
} from './contracts/events/order-events.js';

// Payment Events
export {
  createPaymentSucceededEvent,
  createPaymentFailedEvent,
  createPaymentRefundedEvent,
} from './contracts/events/payment-events.js';

// Inventory Events
export {
  createStockReservedEvent,
  createStockReleasedEvent,
  createStockDeductedEvent,
  createStockLowEvent,
} from './contracts/events/inventory-events.js';

// Notification Events
export {
  createSendEmailEvent,
  createSendSmsEvent,
} from './contracts/events/notification-events.js';
