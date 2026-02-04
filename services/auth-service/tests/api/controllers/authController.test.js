import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/domain/services/authService.js", () => ({
  default: {
    register: vi.fn(),
    login: vi.fn(),
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    getUserById: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));
vi.mock("@ecommerce/common", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponseHandler: { success: vi.fn(), error: vi.fn() },
    createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  };
});

const { default: authController } = await import("../../../src/api/controllers/authController.js");
const authService = (await import("../../../src/domain/services/authService.js")).default;
const { ResponseHandler } = await import("@ecommerce/common");

describe("AuthController", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { body: {}, ip: "127.0.0.1" };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  });

  describe("register", () => {
    it("should return 201 on successful registration", async () => {
      const userData = {
        user: { email: "test@test.com" },
        accessToken: "token",
        refreshToken: "refresh",
      };
      authService.register.mockResolvedValue(userData);
      mockReq.body = {
        email: "test@test.com",
        password: "Password1",
        firstName: "Test",
        lastName: "User",
      };

      await authController.register(mockReq, mockRes);

      expect(authService.register).toHaveBeenCalledWith(mockReq.body);
      expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, userData, 201);
    });

    it("should return 409 when user already exists", async () => {
      authService.register.mockRejectedValue(new Error("User with this email already exists"));
      mockReq.body = {
        email: "existing@test.com",
        password: "Password1",
        firstName: "Test",
        lastName: "User",
      };

      await authController.register(mockReq, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "USER_EXISTS",
        expect.any(String),
        409
      );
    });
  });

  describe("login", () => {
    it("should return success on valid login", async () => {
      const loginResult = { user: {}, accessToken: "token", refreshToken: "refresh" };
      authService.login.mockResolvedValue(loginResult);
      mockReq.body = { email: "test@test.com", password: "Password1" };

      await authController.login(mockReq, mockRes);

      expect(authService.login).toHaveBeenCalledWith("test@test.com", "Password1", expect.any(String));
      expect(ResponseHandler.success).toHaveBeenCalledWith(mockRes, loginResult);
    });

    it("should return 401 on invalid credentials", async () => {
      authService.login.mockRejectedValue(new Error("Invalid credentials"));
      mockReq.body = { email: "test@test.com", password: "wrong" };

      await authController.login(mockReq, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(
        mockRes,
        "LOGIN_FAILED",
        "Invalid credentials",
        401
      );
    });
  });
});
