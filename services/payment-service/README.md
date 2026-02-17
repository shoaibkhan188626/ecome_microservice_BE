# Payment Service

Handles payment processing, webhooks, and refunds for the e-commerce platform.

## Features

- Process payments via multiple gateways (Razorpay, Stripe)
- Handle payment gateway webhooks
- Process refunds
- Idempotent webhook handling
- Event-driven updates to other services

## API Endpoints

| Method | Path                        | Description              |
| ------ | --------------------------- | ------------------------ |
| POST   | /api/v1/payments            | Create a payment         |
| POST   | /api/v1/payments/verify     | Verify payment success   |
| POST   | /api/v1/payments/:id/refund | Refund a payment         |
| POST   | /api/v1/webhooks/razorpay   | Razorpay webhook handler |
| POST   | /api/v1/webhooks/stripe     | Stripe webhook handler   |
| GET    | /health                     | Health check endpoint    |

## Events Published

- `payment.initiated` - When payment is created
- `payment.succeeded` - When payment succeeds
- `payment.failed` - When payment fails
- `payment.refunded` - When payment is refunded

## Events Consumed

- `order.created` - Triggers payment creation
- `order.cancelled` - Triggers refund if applicable

## Environment Variables

```bash
# Server
PORT=3005
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/payment_db

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Stripe (optional)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```
