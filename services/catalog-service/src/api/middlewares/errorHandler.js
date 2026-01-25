import logger from "../../utils/logger.js";
import ResponseHandler from "../../utils/responseHandler.js";
import config from "../../config/index.js";

const errorHandler = (err, req, res, next) => {
  logger.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    requestId: res.locals.requestId,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  //mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ResponseHandler.validationError(res, errors);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return ResponseHandler.err(
      res,
      "DUPLICATE_ERROR",
      `${field} already exists`,
      409,
    );
  }

  if (err.name === "CastError") {
    return ResponseHandler.error(res, "INVALID_ID", "Invalid ID format", 400);
  }

  const statusCode = err.statusCode || err.status || 500;
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
