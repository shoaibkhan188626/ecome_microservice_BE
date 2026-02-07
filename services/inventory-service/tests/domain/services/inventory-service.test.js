import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/domain/entities/inventory.js", () => ({
  default: {
    findOne: vi.fn(),
    findBySKU: vi.fn(),
    findByProduct: vi.fn(),
    reserveStock: vi.fn(),
  },
}));

vi.mock("../../../src/domain/entities/StockMovement.js", () => ({
  default: { recordMovement: vi.fn() },
}));

vi.mock("@ecommerce/common", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  };
});

vi.mock("../../../src/config/index.js", () => ({
  default: {
    logLevel: "info",
    isProduction: false,
    inventory: { reservationTTL: 900 },
  },
}));

const Inventory = (await import("../../../src/domain/entities/inventory.js")).default;

describe("InventoryService", () => {
  let inventoryService;
  let mockLockManager;
  let mockRedis;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLockManager = {
      withLock: vi.fn((key, fn) => fn()),
    };
    mockRedis = {};
    const { default: InventoryService } = await import("../../../src/domain/services/inventory-service.js");
    inventoryService = new InventoryService(mockLockManager, mockRedis);
  });

  describe("getBySKU", () => {
    it("should return inventory when found", async () => {
      const mockInventory = { sku: "SKU-001", quantity: 10 };
      Inventory.findBySKU.mockResolvedValue(mockInventory);

      const result = await inventoryService.getBySKU("SKU-001");

      expect(Inventory.findBySKU).toHaveBeenCalledWith("SKU-001", "main");
      expect(result).toEqual(mockInventory);
    });

    it("should throw when inventory not found", async () => {
      Inventory.findBySKU.mockResolvedValue(null);

      await expect(inventoryService.getBySKU("INVALID")).rejects.toThrow(
        "Inventory not found"
      );
    });
  });

  describe("getByProduct", () => {
    it("should return inventory by product", async () => {
      const mockInventories = [{ sku: "SKU-001" }];
      Inventory.findByProduct.mockResolvedValue(mockInventories);

      const result = await inventoryService.getByProduct("product123");

      expect(Inventory.findByProduct).toHaveBeenCalledWith("product123", null);
      expect(result).toEqual(mockInventories);
    });
  });

  describe("checkAvailability", () => {
    it("should return true when stock available", async () => {
      const mockInventory = { canFulfill: vi.fn().mockReturnValue(true) };
      Inventory.findBySKU.mockResolvedValue(mockInventory);

      const result = await inventoryService.checkAvailability("SKU-001", 5);

      expect(result).toBe(true);
      expect(mockInventory.canFulfill).toHaveBeenCalledWith(5);
    });
  });
});
