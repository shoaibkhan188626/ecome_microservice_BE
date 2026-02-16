# Inventory Service

## Overview
- Tracks stock levels, availability, and reservations

## Environment
- `PORT`
- `MONGODB_URI`
- `REDIS_URL`

## Endpoints
- Health: `/health`, `/live` in [health routes](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/inventory-service/src/api/routes/healthRoutes.js)

## Development
- `npm run test`
- Domain logic in `src/domain/**` and config in `src/config/index.js`
