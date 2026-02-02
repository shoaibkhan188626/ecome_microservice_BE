import { ResponseHandler } from "@ecommerce/common";

/**
 * Check if user has required role
 */

export const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.error(
        res,
        "UNAUTHORIZED",
        "Authentication required",
        401,
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ResponseHandler.error(
        res,
        "FORBIDDEN",
        "Insufficient permissions",
        403,
      );
    }
    next();
  };
};

export const requireAdmin = authorizeRole(["admin", "super_admin"]);
