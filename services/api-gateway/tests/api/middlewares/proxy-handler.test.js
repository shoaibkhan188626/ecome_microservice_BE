import { describe, it, expect, vi } from "vitest";

vi.mock("http-proxy-middleware", () => ({
  createProxyMiddleware: vi.fn(() => vi.fn()),
}));

vi.mock("../../../../src/config/index.js", () => ({
  default: {
    logLevel: "info",
    isProduction: false,
    services: {
      auth: "http://localhost:3001",
      catalog: "http://localhost:3002",
      order: "http://localhost:3005",
    },
  },
}));

vi.mock("@ecommerce/common", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createLogger: () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  };
});

const { default: proxyHandler } = await import("../../../src/api/middlewares/proxyHandler.js");

describe("ProxyHandler", () => {
  describe("getRoutes", () => {
    it("should return all service routes", () => {
      const routes = proxyHandler.getRoutes();

      expect(routes).toBeInstanceOf(Array);
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.some((r) => r.path === "/api/auth" && r.service === "auth")).toBe(true);
      expect(routes.some((r) => r.path === "/api/orders" && r.service === "order")).toBe(true);
    });
  });

  describe("isCircuitOpen", () => {
    it("should return false when under threshold", () => {
      expect(proxyHandler.isCircuitOpen("auth")).toBe(false);
    });
  });

  describe("createProxy", () => {
    it("should return middleware function", () => {
      const middleware = proxyHandler.createProxy("auth", "/api/auth");
      expect(middleware).toBeTypeOf("function");
    });
  });
});
