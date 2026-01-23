import jwt from "jsonwebtoken";
import config from "../../config/index.js";
import { randomUUID } from "crypto";

/**
 * JWT token service with Rotation Support
 * Implements both access and refresh token
 * Security : Uses RS256 or HS256 algorithm
 */

class TokenService {
  /**
   * Generate access token(short-lived)
   * Contains user ID, role and permission
   *
   * @param {Object} user -User object
   * @returns {string} JWT access token
   */

  generateAccessToken(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: config.permissions[user.role] || [],
      type: "access",
      jti: randomUUID(), //JWT ID for revocation tracking
    };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpiry,
      issuer: "auth-service",
      audience: "api-gateway",
    });
  }

  /**
   * Generate refresh token (long-lived)
   * used to obtain new access tokens
   *
   * @param {Object} user - User object
   * @return {Object} Token and expiry info
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

    //calculate the expiry timestamp
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
   * Generate both access and refresh token
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
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   * @throws {Error} if token is invalid
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
   * @param {string} token - jwt refresh token
   * @returns {Object} Decoded payload
   * @throws {Error} if token is invalid
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
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   */

  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   * @param {Object} decoded - Decoded token payload
   * @returns {boolean}
   */

  isTokenExpired(decoded) {
    if (!decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }
}

export default new TokenService();
