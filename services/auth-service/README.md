# Auth Service

## Overview
- User registration, login, token issuance, profile management

## Environment
- `PORT`
- `MONGODB_URI`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

## Endpoints
- Health: `/health`, `/live` in [health routes](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/auth-service/src/api/routes/healthRoutes.js)
- Auth controllers in [authController.js](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/auth-service/src/api/controllers/authController.js)

## Development
- `npm run test`
- Config in `src/config/index.js` extending BaseConfig
