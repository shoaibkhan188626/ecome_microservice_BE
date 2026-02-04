import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSlug, generateUniqueSlug } from "./slugify.js";

describe("generateSlug", () => {
  it("should convert text to lowercase slug", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("should replace spaces with hyphens", () => {
    expect(generateSlug("foo bar baz")).toBe("foo-bar-baz");
  });

  it("should remove special characters", () => {
    expect(generateSlug("Hello! @World#")).toBe("hello-world");
  });

  it("should collapse multiple hyphens", () => {
    expect(generateSlug("foo   bar")).toBe("foo-bar");
  });

  it("should trim leading and trailing hyphens", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world");
  });

  it("should handle numbers", () => {
    expect(generateSlug("Product 123")).toBe("product-123");
  });
});

describe("generateUniqueSlug", () => {
  it("should return base slug when no collision", async () => {
    const MockModel = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const result = await generateUniqueSlug(MockModel, "my-product");
    expect(result).toBe("my-product");
    expect(MockModel.findOne).toHaveBeenCalledWith({ slug: "my-product" });
  });

  it("should append counter when slug exists", async () => {
    const MockModel = {
      findOne: vi
        .fn()
        .mockResolvedValueOnce({ _id: "existing" })
        .mockResolvedValueOnce(null),
    };
    const result = await generateUniqueSlug(MockModel, "my-product");
    expect(result).toBe("my-product-1");
    expect(MockModel.findOne).toHaveBeenCalledTimes(2);
  });

  it("should exclude id when provided", async () => {
    const MockModel = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    await generateUniqueSlug(MockModel, "my-product", "abc123");
    expect(MockModel.findOne).toHaveBeenCalledWith({
      slug: "my-product",
      _id: { $ne: "abc123" },
    });
  });
});
