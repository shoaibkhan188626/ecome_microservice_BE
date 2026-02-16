# Development Guide

## Prerequisites
- Node.js 18+
- Docker Desktop
- Git

## Local Orchestration
- From repo root: `docker compose up --build -d`
- Access RabbitMQ UI at http://localhost:15672 (admin/admin123 by default)

## Service Development
- Edit code in `services/<service>/src/**`
- Each service uses a configuration class extending BaseConfig from the common package
- Run tests: `npm run test` inside each service directory
- For live development without Docker, export environment variables and run `npm start` (check each service's package.json)

## Adding a New Service
- Create `services/<new-service>` with standard layout:
  - `src/api/routes`
  - `src/api/controllers`
  - `src/domain/**`
  - `src/config/index.js` extending BaseConfig
  - `tests/**` and `vitest.config.js` with `include: ["tests/**/*.test.js"]`
- Integrate with API Gateway via service URL, and optionally RabbitMQ/Redis/Mongo

## Shared Code
- Use `packages/common` for reusable helpers, errors, middleware, and clients
- Prefer importing `@ecommerce/common` over duplicating logic
