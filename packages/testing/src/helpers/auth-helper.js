import jwt from 'jsonwebtoken';

// ═══════════════════════════════════════════════════
// Auth Test Helper
// Generate JWT tokens for testing protected routes
// ═══════════════════════════════════════════════════

const TEST_ACCESS_SECRET = 'test-access-secret-key-for-testing-only-32chars';
const TEST_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-32chars';

export function generateTestAccessToken(payload = {}, options = {}) {
  const defaultPayload = {
    userId: 'test-user-id-123',
    email: 'test@example.com',
    role: 'customer',
    ...payload,
  };

  return jwt.sign(defaultPayload, options.secret || TEST_ACCESS_SECRET, {
    expiresIn: options.expiresIn || '1h',
    issuer: 'ecommerce-platform-test',
  });
}

export function generateTestRefreshToken(payload = {}, options = {}) {
  const defaultPayload = {
    userId: 'test-user-id-123',
    ...payload,
  };

  return jwt.sign(defaultPayload, options.secret || TEST_REFRESH_SECRET, {
    expiresIn: options.expiresIn || '7d',
    issuer: 'ecommerce-platform-test',
  });
}

export function generateAdminToken(payload = {}) {
  return generateTestAccessToken({
    userId: 'test-admin-id-123',
    email: 'admin@example.com',
    role: 'admin',
    ...payload,
  });
}

export function generateExpiredToken(payload = {}) {
  return generateTestAccessToken(payload, {
    expiresIn: '-1s',
  });
}

export function getAuthHeader(token) {
  return { Authorization: `Bearer ${token}` };
}
