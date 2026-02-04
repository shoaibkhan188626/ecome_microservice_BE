import { describe, it, expect, vi } from "vitest";

vi.mock("@ecommerce/common", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    JWTHelper: vi.fn().mockImplementation(() => ({
      generateAccessToken: vi.fn().mockReturnValue("mock-access-token"),
      generateRefreshToken: vi.fn().mockReturnValue("mock-refresh-token"),
      verifyAccessToken: vi.fn().mockReturnValue({ sub: "user123", email: "test@test.com" }),
      verifyRefreshToken: vi.fn().mockReturnValue({ sub: "user123" }),
      decodeToken: vi.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    })),
  };
});

vi.mock("../../../../src/config/index.js", () => ({
  default: {
    jwt: {
      secret: "test-secret",
      refreshSecret: "test-refresh-secret",
      accessExpiry: "15m",
      refreshExpiry: "7d",
    },
    permissions: {
      customer: ["products:read"],
      admin: ["products:read", "products:write"],
    },
  },
}));

const { default: tokenService } = await import("../../../src/domain/services/tokenService.js");

describe("TokenService", () => {
  const mockUser = {
    _id: { toString: () => "user123" },
    email: "test@example.com",
    role: "customer",
  };

  describe("generateAccessToken", () => {
    it("should generate access token with user payload", () => {
      const token = tokenService.generateAccessToken(mockUser);
      expect(token).toBe("mock-access-token");
    });
  });

  describe("generateTokenPair", () => {
    it("should return access and refresh tokens", () => {
      const result = tokenService.generateTokenPair(mockUser);
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("refreshTokenData");
      expect(result.refreshTokenData).toHaveProperty("jti");
      expect(result.refreshTokenData).toHaveProperty("expiresAt");
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify and decode access token", () => {
      const decoded = tokenService.verifyAccessToken("valid-token");
      expect(decoded).toHaveProperty("sub", "user123");
      expect(decoded).toHaveProperty("email", "test@test.com");
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify refresh token", () => {
      const decoded = tokenService.verifyRefreshToken("valid-refresh");
      expect(decoded).toHaveProperty("sub", "user123");
    });
  });

  describe("isTokenExpired", () => {
    it("should return false for future expiry", () => {
      const decoded = { exp: Math.floor(Date.now() / 1000) + 3600 };
      expect(tokenService.isTokenExpired(decoded)).toBe(false);
    });

    it("should return true for past expiry", () => {
      const decoded = { exp: Math.floor(Date.now() / 1000) - 3600 };
      expect(tokenService.isTokenExpired(decoded)).toBe(true);
    });

    it("should return true when no exp", () => {
      expect(tokenService.isTokenExpired({})).toBe(true);
    });
  });
});
