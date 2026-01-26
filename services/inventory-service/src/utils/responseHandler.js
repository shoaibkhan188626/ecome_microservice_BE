class ResponseHandler {
  static(res, data = null, statusCode = 200, requestId = null) {
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
    return this.error(res, "CONFLICT", `${resource} not found`, 404);
  }

  static conflict(res, message) {
    return this.error(res, "CONFLICT", message, 400);
  }

  static insufficientStock(res, message = "insufficient stock") {
    return this.error(res, "INSUFFICIENT_STOCK", message, 409);
  }
}

export default ResponseHandler;
