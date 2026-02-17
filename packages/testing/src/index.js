// ═══════════════════════════════════════════════════
// @ecommerce/testing
// Shared test utilities for all services
// ═══════════════════════════════════════════════════

// Fixtures
export {
  createTestUser,
  createTestAdmin,
  createTestProduct,
  createTestCategory,
  createTestCart,
  createTestOrder,
  createTestPayment,
  createTestInventory,
} from './fixtures/index.js';

// Helpers
export {
  generateTestAccessToken,
  generateTestRefreshToken,
  generateAdminToken,
  generateExpiredToken,
  getAuthHeader,
} from './helpers/auth-helper.js';

export {
  buildUrl,
  createJsonBody,
  expectSuccessResponse,
  expectErrorResponse,
} from './helpers/api-helper.js';

// Mocks
export { createRedisMock } from './mocks/redis-mock.js';
export { createRabbitMQMock } from './mocks/rabbitmq-mock.js';
