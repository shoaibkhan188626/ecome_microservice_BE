import { JWTHelper } from "@ecommerce/common";
import config from "../../config/index.js";

/**
 * an optional authentication middleware
 * attaches user info if token is present, but does not fail if missing
 */

export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);

    const jwtHelper = new JWTHelper(
      process.env.JWT_SECRET || "temp-secret",
      process.env.JWT_REFRESH_SECRET || "temp-secret",
    );

    const decoded = jwtHelper.verifyAccessToken(token);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {}
  next();
};
