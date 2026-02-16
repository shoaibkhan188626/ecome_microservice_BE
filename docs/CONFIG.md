# Configuration Guide

## BaseConfig Pattern
- Services extend `BaseConfig` from `@ecommerce/common`
- Each service defines `getRequiredEnvVars()` and reads env securely

## Environment Variables
- Defined in `docker-compose.yml` for local orchestration
- Auth Service:
  - `PORT`, `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- API Gateway:
  - `PORT`, `REDIS_URL`, `RABBITMQ_URL`, downstream service URLs
- Catalog Service:
  - `PORT`, `MONGODB_URI`, `REDIS_URL`
- Inventory Service:
  - `PORT`, `MONGODB_URI`, `REDIS_URL`
- Cart Service:
  - `PORT`, `MONGODB_URI`, `REDIS_URL`, `CATALOG_SERVICE_URL`, `INVENTORY_SERVICE_URL`
- Order Service:
  - `PORT`, `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, downstream service URLs
- Notification Service:
  - `PORT`, `MONGODB_URI`, `RABBITMQ_URL`, `SMTP_*`, `EMAIL_FROM`, `ADMIN_EMAIL`

## Secrets
- Use environment variables; do not commit secrets
- In production, use a secrets manager (e.g., Vault, AWS Secrets Manager)

## Logging
- `createLogger` from common package standardizes structured logging
- Services can set `logLevel` and `isProduction` flags in config
