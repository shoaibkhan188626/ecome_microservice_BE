import User from "../entities/User.js";
import tokenService from "./tokenService.js";
import { createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "auth-service",
  config.logLevel,
  config.isProduction,
);

class AuthService {
  async register(userData) {
    try {
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const user = new User({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role || "customer",
      });

      await user.save();

      const tokens = tokenService.generateTokenPair(user);

      user.refreshTokens.push({
        token: tokens.refreshToken,
        createdAt: new Date(),
        expiresAt: tokens.refreshTokenData.expiresAt,
      });

      await user.save();

      logger.info(`User registered successfully: ${user.email}`);

      const userObj = user.toJSON();

      return {
        user: userObj,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error("Registration error:", error);
      throw error;
    }
  }

  async login(email, password, ipAddress = null) {
    try {
      const user = await User.findOne({ email, isActive: true }).select(
        "+password",
      );

      if (!user) {
        throw new Error("Invalid credentials");
      }

      if (user.isLocked) {
        const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
        throw new Error(`Account locked. Try again in ${lockTime} minutes`);
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        await user.incLoginAttempts();
        throw new Error("Invalid credentials");
      }

      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      const tokens = tokenService.generateTokenPair(user);

      user.lastLogin = new Date();
      user.lastLoginIp = ipAddress;

      user.refreshTokens.push({
        token: tokens.refreshToken,
        createdAt: new Date(),
        expiresAt: tokens.refreshTokenData.expiresAt,
      });

      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      await user.save();

      logger.info(`User logged in: ${user.email} from IP: ${ipAddress}`);

      const userObj = user.toJSON();

      return {
        user: userObj,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      logger.error("Login error:", error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = tokenService.verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.sub);

      if (!user || !user.isActive) {
        throw new Error("User not found or inactive");
      }

      const tokenExists = user.refreshTokens.some(
        (rt) => rt.token === refreshToken && rt.expiresAt > new Date(),
      );

      if (!tokenExists) {
        throw new Error("Invalid or expired refresh token");
      }

      const accessToken = tokenService.generateAccessToken(user);

      logger.info(`Access token refreshed for user: ${user.email}`);

      return {
        accessToken,
        user: user.toJSON(),
      };
    } catch (error) {
      logger.error("Token refresh error:", error);
      throw error;
    }
  }

  async logout(userId, refreshToken) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      user.refreshTokens = user.refreshTokens.filter(
        (rt) => rt.token !== refreshToken,
      );

      await user.save();

      logger.info(`User logged out: ${user.email}`);
    } catch (error) {
      logger.error("Logout error:", error);
      throw error;
    }
  }

  async logoutAll(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      user.refreshTokens = [];
      await user.save();

      logger.info(`User logged out from all devices: ${user.email}`);
    } catch (error) {
      logger.error("Logout all error:", error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.isActive) {
        throw new Error("User not found");
      }

      return user.toJSON();
    } catch (error) {
      logger.error("Get user error:", error);
      throw error;
    }
  }

  async updateProfile(userId, updateData) {
    try {
      const allowedFields = ["firstName", "lastName", "phone"];
      const filteredData = {};

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      });

      const user = await User.findByIdAndUpdate(userId, filteredData, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        throw new Error("User not found");
      }

      logger.info(`Profile updated for user: ${user.email}`);

      return user.toJSON();
    } catch (error) {
      logger.error("Update profile error:", error);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new Error("User not found");
      }

      const isValid = await user.comparePassword(currentPassword);

      if (!isValid) {
        throw new Error("Current password is incorrect");
      }

      user.password = newPassword;
      user.refreshTokens = [];

      await user.save();

      logger.info(`Password changed for user: ${user.email}`);
    } catch (error) {
      logger.error("Change password error:", error);
      throw error;
    }
  }
}

export default new AuthService();
