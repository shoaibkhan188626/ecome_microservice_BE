# Testing Guide

## Framework
- Vitest is used in every service and the common package
- Tests are placed under `tests/**/*.test.js`
- Configuration: `vitest.config.js` with:
  - `environment: "node"`
  - `globals: true`
  - `include: ["tests/**/*.test.js"]`

## Running Tests
- Common package: `cd packages/common && npm run test`
- Each service: `cd services/<service> && npm run test`

## Patterns
- Prefer partial mocks using `vi.mock(import("@ecommerce/common"), async (importOriginal) => ({ ...await importOriginal(), /* overrides */ }))`
- Health route tests verify `/health` and `/live`
- Domain tests validate business logic (e.g., order state machine)

## CI Integration
- Recommend running `npm run test` for each service job
- Optionally collect coverage in the common package via `coverage` config
