# eCom_BE — Production-Grade E‑Commerce Microservices (Monorepo)

eCom_BE is a modular backend for e‑commerce built as independent Node.js microservices in a single repository. It is designed for scalability, resiliency, and developer productivity with clear boundaries between domains, shared tooling, and Docker‑based orchestration.

## Features
- Microservices for Auth, Catalog, Inventory, Cart, Orders, Notifications
- API Gateway as a single entrypoint with routing and cross‑cutting concerns
- Asynchronous messaging via RabbitMQ
- MongoDB for persistence, Redis for caching/sessions
- Shared common package for utilities, errors, helpers, and base configs
- Standardized testing with Vitest in each service
- Docker Compose for local development

## Architecture
- High‑level architecture explained in [ARCHITECTURE.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/ARCHITECTURE.md)
- Communication patterns:
  - HTTP via API Gateway for synchronous calls
  - RabbitMQ for event‑driven, asynchronous flows
- Per‑service databases for loose coupling

## Repository Structure
- services/api-gateway — gateway and proxy middleware
- services/auth-service — authentication, tokens, profiles
- services/catalog-service — products, categories, search
- services/inventory-service — stock and availability
- services/cart-service — cart operations and totals
- services/order-service — order lifecycle, events
- services/notification-service — email/SMS/push notifications
- packages/common — shared utilities and base config
- docs/ — development, testing, configuration, events, security

## Quick Start
### With Docker Compose
1. Install and start Docker
2. From repo root: `docker compose up --build -d`
3. Services:
   - API Gateway: http://localhost:3000
   - Auth: http://localhost:3001
   - Catalog: http://localhost:3002
   - Inventory: http://localhost:3003
   - Cart: http://localhost:3004
   - Order: http://localhost:3005
   - Notification: http://localhost:3006
4. Infrastructure:
   - MongoDB: 27017
   - Redis: 6379
   - RabbitMQ: 5672 (AMQP), 15672 (management UI)

### Without Docker
- From each service directory:
  - `npm install`
  - Set required env vars (see service README or docker-compose.yml)
  - `npm run test` then `npm start`

## Configuration
- Services extend BaseConfig from `@ecommerce/common`
- Environment variables are set in [docker-compose.yml](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/docker-compose.yml)
- Detailed guidance in [docs/CONFIG.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/docs/CONFIG.md)

## Development
- Workflow and conventions in [docs/DEVELOPMENT.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/docs/DEVELOPMENT.md)
- Code lives under `src/**` per service; tests in `tests/**`
- Prefer importing shared logic from `@ecommerce/common`

## Testing
- Runner: Vitest per service and common package
- Tests in `tests/**/*.test.js`
- Usage and patterns in [docs/TESTING.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/docs/TESTING.md)

## Events & Messaging
- Event conventions and payload examples in [docs/EVENTS.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/docs/EVENTS.md)
- Use RabbitMQ management UI at http://localhost:15672 (admin/admin123 by default)

## Security
- JWT for auth; do not commit secrets
- Rate limiting and validation recommended at gateway/services
- Details in [docs/SECURITY.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/docs/SECURITY.md)

## Service READMEs
- API Gateway: [services/api-gateway/README.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/api-gateway/README.md)
- Auth: [services/auth-service/README.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/auth-service/README.md)
- Catalog: [services/catalog-service/README.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/catalog-service/README.md)
- Inventory: [services/inventory-service/README.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/inventory-service/README.md)
- Cart: [services/cart-service/README.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/cart-service/README.md)
- Order: [services/order-service/README.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/order-service/README.md)
- Notification: [services/notification-service/README.md](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/notification-service/README.md)

## License
- MIT 
