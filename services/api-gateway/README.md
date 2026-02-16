# API Gateway

## Overview
- Single entrypoint for clients, routing to downstream services
- Handles routing, authentication, rate limiting, and aggregation

## Environment
- `PORT`
- `REDIS_URL`
- `RABBITMQ_URL`
- Downstream URLs: `AUTH_SERVICE_URL`, `CATALOG_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `CART_SERVICE_URL`, `ORDER_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`

## Endpoints
- Health: `/health`, `/live` in [health routes](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/api-gateway/src/api/routes/health.js)

## Development
- `npm run test`
- Configure routes in `src/api/middlewares/proxyHandler.js`
