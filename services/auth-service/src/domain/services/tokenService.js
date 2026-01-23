import jwt from "jsonwebtoken";
import config from "../../config/index.js";
import { randomUUID } from "crypto";

/**
 * JWT Token Service with Rotation Support
 * Implements both access and refresh tokens
 *
 * Time Complexity: O(1) for all operations
 * Security: Uses RS256 or HS256 algorithm
 */
class TokenService {
  /**
   * Generate access token (short-lived)
   * Contains user ID, role, and permissions
   *
   * @param {Object} user - User object
   * @returns {string} JWT access token
   */
  generateAccessToken(user) {
    const payload = {
      sub: user._id.toString(), // Subject (user ID)
      email: user.email,
      role: user.role,
      permissions: config.permissions[user.role] || [],
      type: "access",
      jti: randomUUID(), // JWT ID for revocation tracking
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
      issuer: "auth-service",
      audience: "api-gateway",
    });
  }

  /**
   * Generate refresh token (long-lived)
   * Used to obtain new access tokens
   *
   * @param {Object} user - User object
   * @returns {Object} Token and expiry info
   */
  generateRefreshToken(user) {
    const jti = randomUUID();
    const payload = {
      sub: user._id.toString(),
      type: "refresh",
      jti,
    };

    const token = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
      issuer: "auth-service",
    });

    // Calculate expiry timestamp
    const expiresAt = new Date();
    const days = parseInt(config.jwt.refreshExpiry.replace("d", ""));
    expiresAt.setDate(expiresAt.getDate() + days);

    return {
      token,
      jti,
      expiresAt,
    };
  }

  /**
   * Generate both access and refresh tokens
   *
   * @param {Object} user - User object
   * @returns {Object} Both tokens
   */
  generateTokenPair(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      refreshTokenData: {
        jti: refreshToken.jti,
        expiresAt: refreshToken.expiresAt,
      },
    };
  }

  /**
   * Verify access token
   * Time Complexity: O(1)
   *
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   * @throws {Error} If token is invalid
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: "auth-service",
        audience: "api-gateway",
      });
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   * Time Complexity: O(1)
   *
   * @param {string} token - JWT refresh token
   * @returns {Object} Decoded payload
   * @throws {Error} If token is invalid
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: "auth-service",
      });
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Decode token without verification (for debugging)
   * Time Complexity: O(1)
   *
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   * Time Complexity: O(1)
   *
   * @param {Object} decoded - Decoded token payload
   * @returns {boolean}
   */
  isTokenExpired(decoded) {
    if (!decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }
}

export default new TokenService();
