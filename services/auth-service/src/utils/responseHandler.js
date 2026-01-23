/**
 * Standard API response wrapper
 * Time Complexity: O(1)
 */
class ResponseHandler {
  static success(res, data = null, statusCode = 200, requestId = null) {
    return res.status(statusCode).json({
      success: true,
      data,
      error: null,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: requestId || res.locals.requestId,
        version: "v1",
      },
    });
  }

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
        requestId: res.locals.requestId,
        version: "v1",
      },
    });
  }

  static validationError(res, errors) {
    return this.error(
      res,
      "VALIDATION_ERROR",
      "Validation failed",
      400,
      errors,
    );
  }

  static unauthorized(res, message = "Unauthorized access") {
    return this.error(res, "UNAUTHORIZED", message, 401);
  }

  static forbidden(res, message = "Forbidden") {
    return this.error(res, "FORBIDDEN", message, 403);
  }
}

export default ResponseHandler;
