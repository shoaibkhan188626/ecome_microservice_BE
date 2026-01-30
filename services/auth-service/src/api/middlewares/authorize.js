import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "auth-service",
  config.logLevel,
  config.isProduction,
);

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
      logger.warn(
        `Access denied for user ${req.user.email} with role ${req.user.role}`,
      );
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

export const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.error(
        res,
        "UNAUTHORIZED",
        "Authentication required",
        401,
      );
    }

    const userPermissions = req.user.permissions || [];

    if (userPermissions.includes("*")) {
      return next();
    }

    if (!userPermissions.includes(requiredPermission)) {
      logger.warn(
        `Permission denied: ${req.user.email} needs ${requiredPermission}`,
      );
      return ResponseHandler.error(
        res,
        "FORBIDDEN",
        `Permission required: ${requiredPermission}`,
        403,
      );
    }

    next();
  };
};

export const authorizeSelf = (paramName = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.error(
        res,
        "UNAUTHORIZED",
        "Authentication required",
        401,
      );
    }

    const resourceUserId = req.params[paramName];

    if (
      req.user.id !== resourceUserId &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      logger.warn(
        `Self-access denied: ${req.user.email} tried to access ${resourceUserId}`,
      );
      return ResponseHandler.error(res, "FORBIDDEN", "Access denied", 403);
    }

    next();
  };
};
