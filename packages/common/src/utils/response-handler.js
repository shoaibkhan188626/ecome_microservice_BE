/**
 * Shared Response Handler
 * Standard API response wrapper for all services
 */
export class ResponseHandler {
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

  static unauthorized(res, message = "Unauthorized access") {
    return this.error(res, "UNAUTHORIZED", message, 401);
  }

  static forbidden(res, message = "Forbidden") {
    return this.error(res, "FORBIDDEN", message, 403);
  }

  static insufficientStock(res, message = "Insufficient stock") {
    return this.error(res, "INSUFFICIENT_STOCK", message, 409);
  }

  static rateLimitExceeded(
    res,
    message = "Too many requests, please try again later.",
  ) {
    return this.error(res, "RATE_LIMIT_EXCEEDED", message, 429);
  }

  static paginated(res, data, page, limit, total) {
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
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
