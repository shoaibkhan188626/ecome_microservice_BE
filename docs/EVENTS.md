# Events & Messaging

## Broker
- RabbitMQ provides asynchronous communication between services
- Management UI at `http://localhost:15672`

## Typical Flows
- Order Service publishes order lifecycle events (e.g., `order.placed`, `order.shipped`, `order.delivered`)
- Notification Service consumes relevant events to send emails/SMS/push

## Exchange/Queue Conventions
- Topic exchanges per domain: `order.events`, `notification.commands`
- Durable queues per consumer (e.g., `notification.email`)
- Routing keys follow `<entity>.<action>` (e.g., `order.placed`)

## Event Payloads (example)
```json
{
  "id": "ORD-123",
  "userId": "USR-456",
  "status": "placed",
  "items": [{ "sku": "SKU-001", "qty": 2 }],
  "total": 129.99,
  "createdAt": "2025-01-01T10:00:00Z"
}
```

## Reliability
- Use acknowledgements and dead-letter queues for resilience
- Consumers should be idempotent
