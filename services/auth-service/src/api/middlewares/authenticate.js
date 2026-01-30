import tokenService from "../../domain/services/tokenService.js";
import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "auth-service",
  config.logLevel,
  config.isProduction,
);

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ResponseHandler.error(
        res,
        "UNAUTHORIZED",
        "No token provided",
        401,
      );
    }

    const token = authHeader.substring(7);

    const decoded = tokenService.verifyAccessToken(token);

    if (tokenService.isTokenExpired(decoded)) {
      return ResponseHandler.error(res, "UNAUTHORIZED", "Token expired", 401);
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
    return ResponseHandler.error(res, "UNAUTHORIZED", "Invalid token", 401);
  }
};

export default authenticate;
