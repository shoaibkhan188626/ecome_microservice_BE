import { JWTHelper } from "@ecommerce/common";
import config from "../../config/index.js";
import { randomUUID } from "crypto";

const jwtHelper = new JWTHelper(
  config.jwt.secret,
  config.jwt.refreshSecret,
  config.jwt.accessExpiry,
  config.jwt.refreshExpiry,
);

class TokenService {
  generateAccessToken(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: config.permissions[user.role] || [],
      jti: randomUUID(),
    };

    return jwtHelper.generateAccessToken(payload);
  }

  generateRefreshToken(user) {
    const jti = randomUUID();
    const payload = {
      sub: user._id.toString(),
      jti,
    };

    const token = jwtHelper.generateRefreshToken(payload);

    const expiresAt = new Date();
    const days = parseInt(config.jwt.refreshExpiry.replace("d", ""));
    expiresAt.setDate(expiresAt.getDate() + days);

    return {
      token,
      jti,
      expiresAt,
    };
  }

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

  verifyAccessToken(token) {
    return jwtHelper.verifyAccessToken(token);
  }

  verifyRefreshToken(token) {
    return jwtHelper.verifyRefreshToken(token);
  }

  decodeToken(token) {
    return jwtHelper.decodeToken(token);
  }

  isTokenExpired(decoded) {
    if (!decoded.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }
}

export default new TokenService();
