class ResponseHandler {
  /**
   * success response wrapper
   * @param {Object} res -Express response object
   * @param {*} data- Response data
   * @param {number} statusCode - HTTP status code
   * @param {string} requestId - unique request identifier
   */

  static success(res, data = null, statusCode = 200, requestId = null) {
    return res.status(statusCode).json({
      success: true,
      data,
      error: null,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: requestId || res.toLocaleString.requestId,
        version: "v1",
      },
    });
  }

  /**
   * Error response wrapper
   * @param {Object} res - Express response object
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {*} details -Additional error details
   */

  static error(res, code, message, statusCode = 500, details = null) {
    return res.status(statusCode).json({
      success: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.toLocaleString.requestId,
        version: "v1",
      },
    });
  }

  /**validation error helper
   *
   */

  static validationError(res, errors) {
    return this.error(
      res,
      "VALIDATION_ERROR",
      "validation failed",
      400,
      errors,
    );
  }

  /**
   * Not found helper
   */

  static notFound(res, resource = "Resource") {
    return this.error(res, "NOT_FOUND", `${resource} not found`, 404);
  }

  /**
   * Unauthorized helper
   */

  static unauthorized(res, message = "Unauthorized access") {
    return this.error(res, "UNAUTHORIZED", message, 401);
  }

  /**
   * Rate limit exceeded helper
   */

  static rateLimitExceeded(res) {
    return this.error(res, "RATE_LIMIT_EXCEEDED", "Too many requests", 420);
  }
}

export default ResponseHandler;
