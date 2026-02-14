import { JWTHelper, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "order-service",
  config.logLevel,
  config.isProduction,
);

const jwtHelper = new JWTHelper(
  process.env.JWT_SECRET || "temp-secret",
  process.env.JWT_REFRESH_SECRET || "temp-secret",
);

/**
 * Authenticate middleware
 * verifies jwt token from auth service
 */

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "No token provided",
        },
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwtHelper.verifyAccessToken(token);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };
    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid token",
      },
    });
  }
};

/**
 * Optional Authentication
 * attaches user if token present but does not fail if missing
 */

export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startWith("Bearer")) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwtHelper.verifyAccessToken(token);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };
  } catch (error) {}
  next();
};
