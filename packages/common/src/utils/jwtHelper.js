import jwt from "jsonwebtoken";

/**
 * JWT Helper - Shared token operations
 */
export class JWTHelper {
  constructor(
    accessSecret,
    refreshSecret,
    accessExpiry = "15m",
    refreshExpiry = "7d",
  ) {
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessExpiry = accessExpiry;
    this.refreshExpiry = refreshExpiry;
  }

  generateAccessToken(payload) {
    return jwt.sign({ ...payload, type: "access" }, this.accessSecret, {
      expiresIn: this.accessExpiry,
      issuer: "ecommerce-platform",
      audience: "api-gateway",
    });
  }

  generateRefreshToken(payload) {
    return jwt.sign({ ...payload, type: "refresh" }, this.refreshSecret, {
      expiresIn: this.refreshExpiry,
      issuer: "ecommerce-platform",
    });
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessSecret, {
        issuer: "ecommerce-platform",
        audience: "api-gateway",
      });
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshSecret, {
        issuer: "ecommerce-platform",
      });
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  decodeToken(token) {
    return jwt.decode(token);
  }
}
