import tokenService from "../../domain/services/tokenService.js";
import ResponseHandler from "../../utils/responseHandler.js";
import logger from "../../utils/logger.js";

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */

const authenticate = async (req, res, next) => {
  try {
    //Extract token form Authorization header

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ResponseHandler.unauthorized(res, "No token provided");
    }

    const token = authHeader.substring(7);

    //verify token
    const decoded = tokenService.verifyAccessToken(token);

    //check if token is expired
    if (tokenService.isTokenExpired(decoded)) {
      return ResponseHandler.unauthorized(res, "Token expired");
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    };
    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return ResponseHandler.unauthorized(res, "Invalid token");
  }
};

export default authenticate;
