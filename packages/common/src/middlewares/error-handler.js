import { AppError } from '../errors/app-error.js';
import { ErrorCodes } from '../constants/error-codes.js';
import { ResponseHandler } from '../utils/response-handler.js';

/**
 * Central error handling middleware factory
 * This is the LAST middleware in the Express chain.
 *
 * Error handling strategy:
 * 1. AppError (our custom errors) → send structured response
 * 2. Third-party errors (Mongoose, Joi) → translate to AppError shape
 * 3. Unknown errors → generic 500 in production, full details in development
 *
 * @param {object} logger - Logger instance
 * @param {boolean} isProduction - Hide internal details in production
 * @returns {Function} Express error middleware
 */
export const createErrorHandler = (logger, isProduction = false) => {
  return (err, req, res, next) => {
    // ─── Guard: headers already sent ──────────────────────
    if (res.headersSent) {
      return next(err);
    }

    // ─── Log the error ───────────────────────────────────
    const logContext = {
      err: {
        name: err.name,
        message: err.message,
        code: err.code,
        statusCode: err.statusCode,
        stack: err.stack,
        ...(err.cause && {
          cause: {
            name: err.cause.name,
            message: err.cause.message,
          },
        }),
      },
      requestId: res.locals?.requestId,
      correlationId: res.locals?.correlationId,
      path: req.path,
      method: req.method,
    };

    // ─── 1. Handle our own AppError instances ────────────
    if (err instanceof AppError) {
      // Operational errors are expected — log as warning
      // Programming errors are bugs — log as error
      if (err.isOperational) {
        logger.warn(logContext, `Operational error: ${err.message}`);
      } else {
        logger.error(logContext, `Programming error: ${err.message}`);
      }

      return ResponseHandler.error(res, {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        details: isProduction ? null : err.details,
      });
    }

    // ─── 2. Translate third-party errors ─────────────────

    // Joi validation errors
    if (err.isJoi || (err.name === 'ValidationError' && err.details)) {
      const details = err.details?.map((d) => ({
        field: d.context?.key || d.path?.join('.'),
        message: d.message,
      }));

      logger.warn(logContext, 'Joi validation error');

      return ResponseHandler.error(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        statusCode: 400,
        details: isProduction ? null : details,
      });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError' && err.errors) {
      const details = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));

      logger.warn(logContext, 'Mongoose validation error');

      return ResponseHandler.error(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        statusCode: 400,
        details: isProduction ? null : details,
      });
    }

    // Mongoose duplicate key (code 11000)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';

      logger.warn(logContext, `Duplicate key error on: ${field}`);

      return ResponseHandler.error(res, {
        code: ErrorCodes.CONFLICT,
        message: `${field} already exists`,
        statusCode: 409,
      });
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      logger.warn(logContext, 'Invalid ObjectId');

      return ResponseHandler.error(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid ID format',
        statusCode: 400,
      });
    }

    // JSON parse errors (malformed request body)
    if (err.type === 'entity.parse.failed') {
      logger.warn(logContext, 'Malformed JSON in request body');

      return ResponseHandler.error(res, {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Malformed JSON in request body',
        statusCode: 400,
      });
    }

    // ─── 3. Unknown/unexpected errors ────────────────────
    logger.error(logContext, `Unhandled error: ${err.message}`);

    return ResponseHandler.error(res, {
      code: ErrorCodes.INTERNAL_ERROR,
      message: isProduction ? 'An unexpected error occurred' : err.message,
      statusCode: 500,
      details: isProduction ? null : err.stack,
    });
  };
};
