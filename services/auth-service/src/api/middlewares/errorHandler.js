import logger from "../../utils/logger.js";
import ResponseHandler from "../../utils/responseHandler.js";
import config from "../../config/index.js";

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */

const errorHandler = (err, req, res, next) => {
  logger.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    requestId: res.locals.requestId,
    path: req.path,
    body: req.body,
    user: req.user?.email,
  });

  //Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ResponseHandler.validationError(res, errors);
  }

  //mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return ResponseHandler.error(
      res,
      "DUPLICATE_ERROR",
      `${field} already exists`,
      400,
    );
  }

  //mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return ResponseHandler.error(res, "INVALID_ID", "invalid ID format", 400);
  }

  //jwt errors
  if (err.name === "JsonWebTokenError") {
    return ResponseHandler.unauthorized(res, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    return ResponseHandler.unauthorized(res, "Token expired");
  }

  //Determine status code
  const statusCode = err.statusCode || err.status || 500;

  //Don't leak error details in production
  const message =
    config.isProduction && statusCode === 500
      ? "Internal server error"
      : err.message;

  const details = config.isDevelopment ? err.stack : null;

  ResponseHandler.error(
    res,
    err.code || "INTERNAL_ERROR",
    message,
    statusCode,
    details,
  );
};

export default errorHandler;
