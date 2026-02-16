# Order Service

## Overview
- Orchestrates order lifecycle: create, process, ship, deliver, cancel
- Publishes events for downstream consumers

## Environment
- `PORT`
- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- Downstream URLs: `CART_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `CATALOG_SERVICE_URL`

## Endpoints
- Health: `/health`, `/live` in [health routes](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/order-service/src/api/routes/healthRoutes.js)

## Development
- `npm run test`
- State machine in `src/domain/state-machine/orderState.js`
