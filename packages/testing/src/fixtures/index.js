import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════
// Test Fixtures
// Reusable fake data for all service tests
// ═══════════════════════════════════════════════════

// --- User Fixtures ---
export function createTestUser(overrides = {}) {
  return {
    _id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    role: 'customer',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestAdmin(overrides = {}) {
  return createTestUser({
    email: 'admin@example.com',
    name: 'Test Admin',
    role: 'admin',
    ...overrides,
  });
}

// --- Product Fixtures ---
export function createTestProduct(overrides = {}) {
  return {
    _id: randomUUID(),
    name: 'Test Product',
    slug: 'test-product',
    description: 'A test product description',
    price: 999,
    currency: 'INR',
    category: randomUUID(),
    stock: 100,
    images: ['https://example.com/image.jpg'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestCategory(overrides = {}) {
  return {
    _id: randomUUID(),
    name: 'Test Category',
    slug: 'test-category',
    description: 'A test category',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- Cart Fixtures ---
export function createTestCart(overrides = {}) {
  return {
    _id: randomUUID(),
    userId: randomUUID(),
    items: [
      {
        productId: randomUUID(),
        name: 'Test Product',
        price: 999,
        quantity: 1,
        image: 'https://example.com/image.jpg',
      },
    ],
    totalAmount: 999,
    currency: 'INR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- Order Fixtures ---
export function createTestOrder(overrides = {}) {
  return {
    _id: randomUUID(),
    userId: randomUUID(),
    items: [
      {
        productId: randomUUID(),
        name: 'Test Product',
        quantity: 1,
        price: 999,
      },
    ],
    totalAmount: 999,
    currency: 'INR',
    status: 'pending',
    shippingAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      country: 'India',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- Payment Fixtures ---
export function createTestPayment(overrides = {}) {
  return {
    _id: randomUUID(),
    orderId: randomUUID(),
    userId: randomUUID(),
    amount: 999,
    currency: 'INR',
    gateway: 'razorpay',
    status: 'pending',
    gatewayPaymentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// --- Inventory Fixtures ---
export function createTestInventory(overrides = {}) {
  return {
    _id: randomUUID(),
    productId: randomUUID(),
    sku: 'TEST-SKU-001',
    quantity: 100,
    reserved: 0,
    available: 100,
    lowStockThreshold: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
