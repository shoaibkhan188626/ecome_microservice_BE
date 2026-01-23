import User from "../entities/User.js";
import tokenService from "./tokenService.js";
import logger from "../../utils/logger.js";

/**
 * Authentication Service - Core Business Logic
 * Handles user registration, login, token refresh
 *
 * Performance Notes:
 * - Uses lean() queries where possible for better performance
 * - Implements compound indexes for O(log n) lookups
 * - Atomic operations for thread safety
 */
class AuthService {
  /**
   * Register new user
   * Time Complexity: O(1) average case with proper indexing
   *
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user and tokens
   */
  async register(userData) {
    try {
      // Check if user already exists
      // O(log n) due to email index
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create new user (password will be hashed by pre-save hook)
      const user = new User({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role || "customer",
      });

      await user.save();

      // Generate token pair
      const tokens = tokenService.generateTokenPair(user);

      // Store refresh token in user document
      user.refreshTokens.push({
        token: tokens.refreshToken,
        createdAt: new Date(),
        expiresAt: tokens.refreshTokenData.expiresAt,
      });

      await user.save();

      logger.info(`User registered successfully: ${user.email}`);

      // Return user without sensitive data
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

  /**
   * Login user with email and password
   * Time Complexity: O(log n) for user lookup
   *
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} ipAddress - Client IP for logging
   * @returns {Promise<Object>} User and tokens
   */
  async login(email, password, ipAddress = null) {
    try {
      // Find user with password field included
      // O(log n) due to compound index on email + isActive
      const user = await User.findOne({ email, isActive: true }).select(
        "+password",
      );

      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Check if account is locked
      if (user.isLocked) {
        const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
        throw new Error(`Account locked. Try again in ${lockTime} minutes`);
      }

      // Verify password (bcrypt compare - intentionally slow)
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Increment failed login attempts
        await user.incLoginAttempts();
        throw new Error("Invalid credentials");
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Generate new token pair
      const tokens = tokenService.generateTokenPair(user);

      // Update user login metadata
      user.lastLogin = new Date();
      user.lastLoginIp = ipAddress;

      // Store new refresh token
      user.refreshTokens.push({
        token: tokens.refreshToken,
        createdAt: new Date(),
        expiresAt: tokens.refreshTokenData.expiresAt,
      });

      // Keep only last 5 refresh tokens (security measure)
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

  /**
   * Refresh access token using refresh token
   * Time Complexity: O(n) where n = number of refresh tokens (typically <= 5)
   *
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} New access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = tokenService.verifyRefreshToken(refreshToken);

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.sub);

      if (!user || !user.isActive) {
        throw new Error("User not found or inactive");
      }

      // Check if refresh token exists in user's tokens
      // O(n) where n is typically 5 or less
      const tokenExists = user.refreshTokens.some(
        (rt) => rt.token === refreshToken && rt.expiresAt > new Date(),
      );

      if (!tokenExists) {
        throw new Error("Invalid or expired refresh token");
      }

      // Generate new access token
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

  /**
   * Logout user by removing refresh token
   * Time Complexity: O(n) where n = number of refresh tokens
   *
   * @param {string} userId - User ID
   * @param {string} refreshToken - Token to invalidate
   * @returns {Promise<void>}
   */
  async logout(userId, refreshToken) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Remove the specific refresh token
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

  /**
   * Logout from all devices (invalidate all refresh tokens)
   * Time Complexity: O(1) database operation
   *
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
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

  /**
   * Get user by ID
   * Time Complexity: O(1) with _id index
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   */
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

  /**
   * Update user profile
   * Time Complexity: O(1) with _id index
   *
   * @param {string} userId - User ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated user
   */
  async updateProfile(userId, updateData) {
    try {
      // Prevent updating sensitive fields
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

  /**
   * Change password
   * Time Complexity: O(1) with _id index + bcrypt hashing time
   *
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const isValid = await user.comparePassword(currentPassword);

      if (!isValid) {
        throw new Error("Current password is incorrect");
      }

      // Set new password (will be hashed by pre-save hook)
      user.password = newPassword;

      // Invalidate all refresh tokens for security
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
