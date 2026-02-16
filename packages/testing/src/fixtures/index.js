import { randomUUID } from 'crypto';

export function createTestUser(overrides = {}) {
  return {
    _id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    role: 'customer',
    isVerified: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestProduct(overrides = {}) {
  return {
    _id: randomUUID(),
    name: 'Test Product',
    slug: 'test-product',
    price: 999,
    currency: 'INR',
    category: 'test-category',
    stock: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestOrder(overrides = {}) {
  return {
    _id: randomUUID(),
    userId: randomUUID(),
    items: [
      {
        productId: randomUUID(),
        quantity: 1,
        price: 999,
      },
    ],
    totalAmount: 999,
    currency: 'INR',
    status: 'pending',
    shippingAddress: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      pincode: '123456',
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestPayment(overrides = {}) {
  return {
    _id: randomUUID(),
    orderId: randomUUID(),
    userId: randomUUID(),
    amount: 999,
    currency: 'INR',
    gateway: 'razorpay',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
