import { describe, it, expect } from "vitest";
import { validators } from "./commonValidators.js";

describe("validators", () => {
  describe("isEmail", () => {
    it("should return true for valid emails", () => {
      expect(validators.isEmail("test@example.com")).toBe(true);
      expect(validators.isEmail("user.name@domain.co")).toBe(true);
    });

    it("should return false for invalid emails", () => {
      expect(validators.isEmail("invalid")).toBe(false);
      expect(validators.isEmail("@nodomain.com")).toBe(false);
      expect(validators.isEmail("noatsign.com")).toBe(false);
    });
  });

  describe("isStrongPassword", () => {
    it("should return true for strong passwords", () => {
      expect(validators.isStrongPassword("Password1")).toBe(true);
      expect(validators.isStrongPassword("MyP@ss123")).toBe(true);
    });

    it("should return false for weak passwords", () => {
      expect(validators.isStrongPassword("short")).toBe(false);
      expect(validators.isStrongPassword("nouppercase1")).toBe(false);
      expect(validators.isStrongPassword("NOLOWERCASE1")).toBe(false);
      expect(validators.isStrongPassword("NoNumbers")).toBe(false);
    });
  });

  describe("isValidSKU", () => {
    it("should return true for valid SKUs", () => {
      expect(validators.isValidSKU("SKU-123")).toBe(true);
      expect(validators.isValidSKU("ABC123")).toBe(true);
    });

    it("should return false for invalid SKUs", () => {
      expect(validators.isValidSKU("sku with spaces")).toBe(false);
      expect(validators.isValidSKU("invalid!")).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it("should return true for valid phone formats", () => {
      expect(validators.isValidPhone("+1234567890")).toBe(true);
      expect(validators.isValidPhone("(555) 123-4567")).toBe(true);
    });
  });

  describe("isPositiveNumber", () => {
    it("should return true for positive numbers", () => {
      expect(validators.isPositiveNumber(1)).toBe(true);
      expect(validators.isPositiveNumber(0.5)).toBe(true);
    });

    it("should return false for non-positive", () => {
      expect(validators.isPositiveNumber(0)).toBe(false);
      expect(validators.isPositiveNumber(-1)).toBe(false);
      expect(validators.isPositiveNumber("1")).toBe(false);
    });
  });

  describe("isValidMongoId", () => {
    it("should return true for valid ObjectIds", () => {
      expect(validators.isValidMongoId("507f1f77bcf86cd799439011")).toBe(true);
    });

    it("should return false for invalid ObjectIds", () => {
      expect(validators.isValidMongoId("short")).toBe(false);
      expect(validators.isValidMongoId("507f1f77bcf86cd799439011zz")).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("should trim and limit length", () => {
      expect(validators.sanitizeString("  hello  ")).toBe("hello");
      expect(validators.sanitizeString("a".repeat(300), 10)).toBe("a".repeat(10));
    });

    it("should return empty string for non-string", () => {
      expect(validators.sanitizeString(123)).toBe("");
    });
  });

  describe("isValidURL", () => {
    it("should return true for valid URLs", () => {
      expect(validators.isValidURL("https://example.com")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(validators.isValidURL("not-a-url")).toBe(false);
    });
  });
});
