import authService from "../../domain/services/authService.js";
import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "auth-service",
  config.logLevel,
  config.isProduction,
);

class AuthController {
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
      logger.error("Register controller error:", error);

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
        "Invalid or expired refresh token",
        401,
      );
    }
  }

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

  async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;

      const user = await authService.getUserById(userId);

      return ResponseHandler.success(res, user);
    } catch (error) {
      logger.error("Get current user error:", error);
      return ResponseHandler.error(res, "USER_NOT_FOUND", error.message, 404);
    }
  }

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
