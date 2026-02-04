import { describe, it, expect } from "vitest";
import { DateHelper } from "../../src/utils/dateHelper.js";

describe("DateHelper", () => {
  describe("addDays", () => {
    it("should add days to date", () => {
      const date = new Date("2024-01-15");
      const result = DateHelper.addDays(date, 5);
      expect(result.getDate()).toBe(20);
      expect(result.getMonth()).toBe(0);
    });
    it("should handle month overflow", () => {
      const date = new Date("2024-01-30");
      const result = DateHelper.addDays(date, 5);
      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(1);
    });
  });

  describe("addHours", () => {
    it("should add hours to date", () => {
      const date = new Date("2024-01-15T10:00:00");
      const result = DateHelper.addHours(date, 3);
      expect(result.getHours()).toBe(13);
    });
  });

  describe("addMinutes", () => {
    it("should add minutes to date", () => {
      const date = new Date("2024-01-15T10:30:00");
      const result = DateHelper.addMinutes(date, 45);
      expect(result.getHours()).toBe(11);
      expect(result.getMinutes()).toBe(15);
    });
  });

  describe("isExpired", () => {
    it("should return true for past date", () => {
      const past = new Date(Date.now() - 86400000);
      expect(DateHelper.isExpired(past)).toBe(true);
    });
    it("should return false for future date", () => {
      const future = new Date(Date.now() + 86400000);
      expect(DateHelper.isExpired(future)).toBe(false);
    });
  });

  describe("formatDateTime", () => {
    it("should return ISO string", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      expect(DateHelper.formatDateTime(date)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("getStartOfDay", () => {
    it("should set time to 00:00:00.000", () => {
      const date = new Date("2024-01-15T14:30:45");
      const result = DateHelper.getStartOfDay(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe("getEndOfDay", () => {
    it("should set time to 23:59:59.999", () => {
      const date = new Date("2024-01-15T14:30:45");
      const result = DateHelper.getEndOfDay(date);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });

  describe("daysBetween", () => {
    it("should return correct day difference", () => {
      const d1 = new Date("2024-01-01");
      const d2 = new Date("2024-01-11");
      expect(DateHelper.daysBetween(d1, d2)).toBe(10);
    });
    it("should return absolute value regardless of order", () => {
      const d1 = new Date("2024-01-15");
      const d2 = new Date("2024-01-10");
      expect(DateHelper.daysBetween(d1, d2)).toBe(5);
    });
  });
});
