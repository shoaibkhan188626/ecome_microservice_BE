import logger from "../../utils/logger.js";
import ResponseHandler from "../../utils/responseHandler.js";
import config from "../../config/index.js";

/**
 * Global error Handler
 * catches all errors and formats them consistently
 * MUST be the last middleware in the chain
 */

const errorHandler = (err, req, res, next) => {
  //log the error with stack trace
  logger.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    requestId: res.locals.requestId,
    path: req.path,
    method: req.method,
  });

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

export default errorHandler
