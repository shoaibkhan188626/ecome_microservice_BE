import { JWTHelper, ResponseHandler } from "@ecommerce/common";
import config from "../../config/index.js";

const jwtHelper = new JWTHelper(
  config.jwtSecret || process.env.JWT_SECRET,
  process.env.JWT_REFRESH_SECRET || "temp-secret",
);

/**
 * Authenticate middleware - validates JWT and attaches user to request
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : req.cookies?.accessToken;

    if (!token) {
      return ResponseHandler.unauthorized(res, "Authentication required");
    }

    const decoded = jwtHelper.verifyAccessToken(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };
    next();
  } catch (error) {
    return ResponseHandler.unauthorized(res, "Invalid or expired token");
  }
};

/**
 * Authorize middleware - checks if user has required role(s)
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'super_admin')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, "Authentication required");
    }

    // super_admin has access to all admin routes
    const hasAccess =
      roles.includes(req.user.role) ||
      req.user.role === "super_admin";

    if (!hasAccess) {
      return ResponseHandler.forbidden(
        res,
        "You do not have permission to perform this action"
      );
    }
    next();
  };
};
