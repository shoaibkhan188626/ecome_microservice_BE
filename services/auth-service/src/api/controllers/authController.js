import authService from "../../domain/services/authService.js";
import ResponseHandler from "../../utils/responseHandler.js";
import logger from "../../utils/logger.js";

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 *
 * all methods follow async/await pattern for non-blocking I/O
 */

class AuthController {
  /**
   * Register new user
   * POST /auth/register
   */

  async register(req, res) {
    try {
      const { email, password, firstName, lastName, phone, role } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
      });

      logger.info(`User registered: ${email}`);

      return ResponseHandler.success(res, result, 201);
    } catch (error) {
      logger.error(`Register controller error:`, error);

      if (error.message.includes("already exists")) {
        return ResponseHandler.error(res, "USER_EXISTS", error.message, 409);
      }
      return ResponseHandler.error(
        res,
        "REGISTRATION_FAILED",
        error.message,
        400,
      );
    }
  }

  /**
   * Login user
   * POST /auth/login
   */

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await authService.login(email, password, ipAddress);

      logger.info(`User logged in: ${email}`);
      return ResponseHandler.success(res, result);
    } catch (error) {
      logger.error("Login controller error:", error);
      if (error.message.includes("locked")) {
        return ResponseHandler.error(res, "ACCOUNT_LOCKED", error.message, 423);
      }
      return ResponseHandler.error(
        res,
        "LOGIN_FAILED",
        "Invalid credentials",
        401,
      );
    }
  }

  /**
   * Refresh Access Token
   * POST /auth/refresh
   */

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshAccessToken(refreshToken);

      return ResponseHandler.success(res, result);
    } catch (error) {
      logger.error("Refresh token controller error:", error);
      return ResponseHandler.error(
        res,
        "REFRESH_FAILED",
        "invalid or expired token",
        401,
      );
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   * requirest authentication
   */

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user.id;

      await authService.logout(userId, refreshToken);

      return ResponseHandler.success(res, {
        message: "Logged out successfully",
      });
    } catch (error) {
      logger.error("Logout controller error:", error);
      return ResponseHandler.error(res, "LOGOUT_FAILED", error.message, 400);
    }
  }

  /**
   * logout from all devices
   * POST /auth/logout-all
   * Requires authentication
   */

  async logoutAll(req, res) {
    try {
      const userId = req.user.id;

      await authService.logoutAll(userId);

      return ResponseHandler.success(res, {
        message: "Logged out from all devices",
      });
    } catch (error) {
      logger.error("Logout all controller error:", error);
      return ResponseHandler.error(res, "LOGOUT_FAILED", error.message, 400);
    }
  }

  /**
   * get current user profile
   * GET /auth/me
   * Requires authentication
   */

  async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;

      const user = await authService.getUserById(userId);

      return ResponseHandler.success(res, user);
    } catch (error) {
      logger.error("Get current user error", error);
      return ResponseHandler.error(res, "USER_NOT_FOUND", error.message, 400);
    }
  }

  /**
   * Update user profile
   * PUT /auth/profile
   * Requires authentication
   */

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      const user = await authService.updateProfile(userId, updateData);

      return ResponseHandler.success(res, user);
    } catch (error) {
      logger.error("Update profile error:", error);
      return ResponseHandler.error(res, "UPDATE_FAILED", error.message, 400);
    }
  }

  /**change password
   * POST /auth/change-password
   * requires authentication
   */

  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(userId, currentPassword, newPassword);

      return ResponseHandler.success(res, {
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error("Change password error:", error);
      if (error.message.includes("incorrect")) {
        return ResponseHandler.error(
          res,
          "INVALID_PASSWORD",
          error.message,
          401,
        );
      }
      return ResponseHandler.error(
        res,
        "PASSWORD_CHANGE_FAILED",
        error.message,
        400,
      );
    }
  }
}

export default new AuthController();
