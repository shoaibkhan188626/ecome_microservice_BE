import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret-key-for-testing-only-32chars';

export function generateTestToken(payload = {}, options = {}) {
  const defaultPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'customer',
    ...payload,
  };

  return jwt.sign(defaultPayload, options.secret || TEST_SECRET, {
    expiresIn: options.expiresIn || '1h',
  });
}

export function generateAdminToken(payload = {}) {
  return generateTestToken({ ...payload, role: 'admin' });
}
