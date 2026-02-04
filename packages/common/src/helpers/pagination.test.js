import { describe, it, expect } from "vitest";
import { PaginationHelper } from "./pagination.js";

describe("PaginationHelper", () => {
  describe("getPaginationParams", () => {
    it("should return default values when query is empty", () => {
      const result = PaginationHelper.getPaginationParams({});
      expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    it("should use custom defaults when provided", () => {
      const result = PaginationHelper.getPaginationParams(
        {},
        { page: 2, limit: 10 }
      );
      expect(result).toEqual({ page: 2, limit: 10, skip: 10 });
    });

    it("should parse page and limit from query", () => {
      const result = PaginationHelper.getPaginationParams({
        page: "3",
        limit: "15",
      });
      expect(result).toEqual({ page: 3, limit: 15, skip: 30 });
    });

    it("should cap limit at 100", () => {
      const result = PaginationHelper.getPaginationParams({ limit: "500" });
      expect(result.limit).toBe(100);
    });

    it("should handle invalid values by using defaults", () => {
      const result = PaginationHelper.getPaginationParams({
        page: "abc",
        limit: "xyz",
      });
      expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
    });
  });

  describe("getPaginationMeta", () => {
    it("should return correct meta for first page", () => {
      const result = PaginationHelper.getPaginationMeta(1, 20, 100);
      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      });
    });

    it("should return correct meta for middle page", () => {
      const result = PaginationHelper.getPaginationMeta(3, 20, 100);
      expect(result).toEqual({
        page: 3,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it("should return correct meta for last page", () => {
      const result = PaginationHelper.getPaginationMeta(5, 20, 100);
      expect(result).toEqual({
        page: 5,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNext: false,
        hasPrev: true,
      });
    });

    it("should handle empty results", () => {
      const result = PaginationHelper.getPaginationMeta(1, 20, 0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
    });
  });
});
