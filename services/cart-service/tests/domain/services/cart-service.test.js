import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../src/domain/entities/cart.js", () => ({
  default: {
    findByUser: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("@ecommerce/common", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
    HTTPClient: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
    })),
    DateHelper: {
      addDays: (d, days) => {
        const result = new Date(d);
        result.setDate(result.getDate() + days);
        return result;
      },
    },
  };
});

vi.mock("../../../../src/config/index.js", () => ({
  default: {
    logLevel: "info",
    isProduction: false,
    cart: { expiryDays: 7 },
    services: {
      catalog: "http://localhost:3002",
      inventory: "http://localhost:3003",
    },
  },
}));

const Cart = (await import("../../../src/domain/entities/cart.js")).default;

describe("CartService", () => {
  let cartService;
  let mockRedis;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedis = {
      get: vi.fn(),
      set: vi.fn(),
    };
    const { default: CartService } = await import("../../../src/domain/services/cart-service.js");
    cartService = new CartService(mockRedis);
  });

  describe("getGuestCart", () => {
    it("should return empty cart when no session data", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cartService.getGuestCart("session123");

      expect(result).toHaveProperty("sessionId", "session123");
      expect(result).toHaveProperty("items");
      expect(result.items).toEqual([]);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return parsed cart when session data exists", async () => {
      const storedCart = {
        sessionId: "session123",
        items: [{ sku: "SKU-001", quantity: 2 }],
        total: 99.99,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(storedCart));

      const result = await cartService.getGuestCart("session123");

      expect(result).toEqual(storedCart);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
