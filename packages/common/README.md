# @ecommerce/common

## Overview
- Shared package with utilities, helpers, errors, middleware, and base configs
- Imported as `@ecommerce/common` by services

## Key Modules
- `src/errors/AppError.js` — standardized error classes
- `src/helpers/asyncHandler.js`, `pagination.js`, `slugify.js`
- `src/utils/dateHelper.js`, `responseHandler.js`, `jwtHelper.js`, `logger.js`
- `src/validators/commonValidators.js`
- `src/config` — base configuration utilities (e.g., BaseConfig)

## Usage
- Prefer `@ecommerce/common` imports over duplicating logic in services
- Follow partial mocking patterns in tests to preserve BaseConfig and other exports

## Testing
- `npm run test` in `packages/common`
- Coverage enabled via Vitest config
