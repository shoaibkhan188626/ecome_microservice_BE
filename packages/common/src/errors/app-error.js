import { ErrorCodes } from '../constants/error-codes.js';

/**
 * Base Application Error
 * All custom errors across every service extend this.
 *
 * @param {object} options
 * @param {string} options.code - Error code from ErrorCodes constants
 * @param {string} options.message - Human-readable error message
 * @param {number} options.statusCode - HTTP status code
 * @param {object} [options.details] - Additional error context
 * @param {Error}  [options.cause] - Original error that caused this
 * @param {boolean} [options.isOperational] - Is this a known/expected error?
 */
export class AppError extends Error {
  constructor({
    code = ErrorCodes.INTERNAL_ERROR,
    message = 'An unexpected error occurred',
    statusCode = 500,
    details = null,
    cause = null,
    isOperational = true,
  } = {}) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.cause = cause;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Consistent JSON shape for API responses and logging
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
      timestamp: this.timestamp,
    };
  }

  /**
   * Create AppError from an unknown caught error
   * Useful in catch blocks where you don't know the error type
   */
  static from(error, overrides = {}) {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError({
      code: ErrorCodes.INTERNAL_ERROR,
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
      cause: error,
      isOperational: false,
      ...overrides,
    });
  }
}

// ─── Generic HTTP Errors ──────────────────────────────────

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super({
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      statusCode: 400,
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier = null) {
    const msg = identifier ? `${resource} not found: ${identifier}` : `${resource} not found`;

    super({
      code: ErrorCodes.NOT_FOUND,
      message: msg,
      statusCode: 404,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super({
      code: ErrorCodes.AUTH_TOKEN_INVALID,
      message,
      statusCode: 401,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super({
      code: ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
      message,
      statusCode: 403,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super({
      code: ErrorCodes.CONFLICT,
      message,
      statusCode: 409,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super({
      code: ErrorCodes.RATE_LIMITED,
      message,
      statusCode: 429,
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(serviceName = 'Service') {
    super({
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      message: `${serviceName} is temporarily unavailable`,
      statusCode: 503,
      isOperational: true,
    });
  }
}
