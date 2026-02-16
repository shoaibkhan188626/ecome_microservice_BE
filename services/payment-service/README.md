# Payment Service

Handles payment processing, webhook handling, and refunds.

## Responsibilities

- Process payments via Razorpay/Stripe
- Handle payment webhooks (idempotent)
- Process refunds
- Emit payment events

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/payments/create | Create a payment |
| POST | /api/v1/payments/verify | Verify a payment |
| POST | /api/v1/webhooks/razorpay | Razorpay webhook |
| GET | /health | Health check |

## Events Published

- `payment.succeeded`
- `payment.failed`
- `payment.refunded`

## Events Consumed

- `order.created` (triggers payment creation)
