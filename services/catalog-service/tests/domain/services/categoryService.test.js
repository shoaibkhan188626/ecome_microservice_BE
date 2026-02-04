import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/domain/entities/Category.js", () => ({
  default: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findRoots: vi.fn(),
    findChildren: vi.fn(),
    findDescendants: vi.fn(),
    getTree: vi.fn(),
    find: vi.fn(),
    updateMany: vi.fn(),
    bulkWrite: vi.fn(),
  },
}));

vi.mock("@ecommerce/common", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  };
});

vi.mock("../../../src/config/index.js", () => ({ default: { logLevel: "info", isProduction: false } }));

const Category = (await import("../../../src/domain/entities/Category.js")).default;
const { default: categoryService } = await import("../../../src/domain/services/categoryService.js");

describe("CategoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRoots", () => {
    it("should return root categories", async () => {
      const mockRoots = [{ name: "Electronics", level: 0 }];
      Category.findRoots.mockResolvedValue(mockRoots);

      const result = await categoryService.getRoots();

      expect(Category.findRoots).toHaveBeenCalled();
      expect(result).toEqual(mockRoots);
    });
  });

  describe("getTree", () => {
    it("should return category tree", async () => {
      const mockTree = [{ name: "Root", children: [] }];
      Category.getTree.mockResolvedValue(mockTree);

      const result = await categoryService.getTree();

      expect(Category.getTree).toHaveBeenCalledWith(null);
      expect(result).toEqual(mockTree);
    });

    it("should pass rootId when provided", async () => {
      Category.getTree.mockResolvedValue([]);

      await categoryService.getTree("root123");

      expect(Category.getTree).toHaveBeenCalledWith("root123");
    });
  });

  describe("search", () => {
    it("should search categories by name", async () => {
      const mockResults = [{ name: "Electronics", slug: "electronics" }];
      const mockChain = {
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue(mockResults),
      };
      Category.find.mockReturnValue(mockChain);

      const result = await categoryService.search("elec");

      expect(Category.find).toHaveBeenCalledWith({
        name: expect.objectContaining({ $regex: "elec", $options: "i" }),
        isActive: true,
      });
      expect(result).toEqual(mockResults);
    });
  });
});
