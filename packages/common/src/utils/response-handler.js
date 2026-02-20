import { ErrorCodes } from '../constants/error-codes.js';

/**
 * Standardized API Response Handler
 * Every HTTP response across all services goes through this.
 *
 * Response shape:
 * {
 *   success: boolean,
 *   data: object | null,
 *   error: { code, message, details? } | null,
 *   pagination?: { page, limit, total, totalPages, hasNext, hasPrev },
 *   metadata: { timestamp, requestId }
 * }
 */

export class ResponseHandler {
  static _buildMetadata(res) {
    return {
      timestamp: new Date().toISOString(),
      requestId: res.locals?.requestId || null,
      correlationId: res.locals?.correlationId || null,
    };
  }

  static success(res, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      error: null,
      metadata: this._buildMetadata(res),
    });
  }

  static created(res, data) {
    return this.success(res, data, 201);
  }

  static noContent(res) {
    return res.status(204).end();
  }

  static error(
    res,
    {
      code = ErrorCodes.INTERNAL_ERROR,
      message = 'An unexpected error occurred',
      statusCode = 500,
      details = null,
    },
  ) {
    return res.status(statusCode).json({
      success: false,
      data: null,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      metadata: this._buildMetadata(res),
    });
  }

  static fromError(res, appError) {
    return this.error(res, {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    });
  }

  static paginated(res, { data, page, limit, total }) {
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data,
      error: null,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      metadata: this._buildMetadata(res),
    });
  }
}
