import ResponseHandler from "../../utils/responseHandler.js";
import logger from "../../utils/logger.js";

/**
 * Role based access control (RBAC) middleware
 * check if user has required role or permission
 */

/**
 * Check if user has required role
 * @param {Array<string>} allowedRoles -Array of allowed roles
 * @returns {Function} express middleware
 */

export const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Access denied for  user ${req.user.email} with role ${req.user.role}`,
      );
      return ResponseHandler.forbidden(res, "Insufficient permissions");
    }
    next();
  };
};

/**
 * check if user has required role permission
 * @param {string} requiredPermission - Required permission (e.g., 'Product:write)
 * @returns {Function} express middleware
 */

export const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, "Authentication required");
    }

    const userPermissions = req.user.permissions || [];

    if (userPermissions.includes("*")) {
      return next();
    }

    if (!userPermissions.includes(requiredPermission)) {
      logger.warn(
        `Permission denied: ${req.user.email} need ${requiredPermission}`,
      );
      return ResponseHandler.forbidden(
        res,
        `Permission required: ${requiredPermission}`,
      );
    }
    next();
  };
};

/**
 * check if user owns the resource (self-access)
 * @param {string} paramName - Name of the route parameter containing user ID
 * @returns {Function} express middleware
 */

export const authorizeSelf = (paramName = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, "Authentication required");
    }
    const resourceUserId = req.params[paramName];

    //Allow if user is accessing their own resourc or is admin
    if (
      req.user.id !== resourceUserId &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      logger.warn(
        `Self-access denied: ${req.user.email} tried to access ${resourceUserId}`,
      );
      return ResponseHandler.forbidden(res, "Access denied");
    }
    next();
  };
};
