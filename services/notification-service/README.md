# Notification Service

## Overview
- Consumes events and delivers notifications via email/SMS/push
- Manages templates and logs

## Environment
- `PORT`
- `MONGODB_URI`
- `RABBITMQ_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `ADMIN_EMAIL`

## Endpoints
- Health: `/health`, `/live` in [health routes](file:///c:/Users/shoai/OneDrive/Desktop/eCom_BE/services/notification-service/src/api/routes/healthRoutes.js)

## Development
- `npm run test`
- Consumers in `src/consumers/**` and templates in `src/templates/**`
