# Cart Service

## Overview
- Manages user carts: add, update, remove items; totals

## Environment
- `PORT`
- `MONGODB_URI`
- `REDIS_URL`
- `CATALOG_SERVICE_URL`
- `INVENTORY_SERVICE_URL`

## Endpoints
- Health: `/health`, `/live` in [health routes](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/cart-service/src/api/routes/healthRoutes.js)

## Development
- `npm run test`
- Domain logic in `src/domain/**` and config in `src/config/index.js`
