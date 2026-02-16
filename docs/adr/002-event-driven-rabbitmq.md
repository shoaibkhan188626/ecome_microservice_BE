# ADR-002: Event-Driven Communication via RabbitMQ

## Status
Accepted

## Date
2026-02-17

## Context
Microservices need to communicate. Options:
- Synchronous HTTP calls between services
- Asynchronous messaging via message broker
- Hybrid approach

## Decision
Use RabbitMQ as the primary communication mechanism between services.
Use the Outbox Pattern for reliable event publishing.
HTTP is only used by the API Gateway to proxy client requests.

## Consequences

### Positive
- Services are loosely coupled
- Better fault tolerance (messages are queued if consumer is down)
- Natural support for eventual consistency
- Outbox pattern prevents dual-write problems

### Negative
- Eventual consistency is harder to reason about
- Need to handle duplicate messages (idempotency)
- Debugging message flows is more complex
- Additional infrastructure dependency (RabbitMQ)

## Alternatives Considered
1. **Apache Kafka** - Rejected for now due to operational complexity;
   RabbitMQ is simpler for our current scale
2. **Direct HTTP** - Rejected due to tight coupling and cascade failures
