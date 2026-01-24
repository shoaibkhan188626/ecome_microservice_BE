/**
 * Standard API response wrapper
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

  static notFound(res, resource = "Resource") {
    return this.error(res, "NOT_FOUND", `${resource} not found`, 404);
  }

  static conflict(res, message) {
    return this.error(res, "CONFLICT", message, 409);
  }

  /**
   * paginated response helper
   * @param {Object}res - express response
   * @param {Array} data - Array of items
   * @param {Number} page - Current page
   * @param {Number} limit - Items per page
   * @param {Number} total - Total Count
   */

  static paginated(res, data, page, limit, total) {
    const totalPage = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPage,
        hasNext: page < totalPage,
        hasPrev: page > 1,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
        version: "v1",
      },
    });
  }
}

export default ResponseHandler;
