import { ErrorCodes, createLogger } from '@ecommerce/common';
import config from '../../config/index.js';

const logger = createLogger('error-handler');

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  logger.error({
    err,
    requestId: res.locals.requestId,
    path: req.path,
    method: req.method,
  });

  const error = {
    code: ErrorCodes.INTERNAL_ERROR,
    message: config.isProduction ? 'An unexpected error occurred' : err.message,
  };

  let statusCode = 500;

  if (err.isOperational) {
    error.code = err.code;
    error.message = err.message;
    statusCode = err.statusCode;

    if (!config.isProduction && err.details) {
      error.details = err.details;
    }
  }

  if (err.name === 'RazorpayError') {
    error.code = ErrorCodes.PAYMENT_GATEWAY_ERROR;
    error.message = 'Payment gateway error';
    statusCode = 502;

    if (!config.isProduction) {
      error.details = {
        description: err.description,
        field: err.field,
        code: err.code,
      };
    }
  }

  if (err.type?.startsWith('Stripe')) {
    error.code = ErrorCodes.PAYMENT_GATEWAY_ERROR;
    error.message = 'Payment gateway error';
    statusCode = 502;

    if (!config.isProduction) {
      error.details = {
        type: err.type,
        code: err.code,
        param: err.param,
      };
    }
  }

  if (err.name === 'ValidationError') {
    error.code = ErrorCodes.VALIDATION_ERROR;
    error.message = 'Validation failed';
    statusCode = 400;

    if (!config.isProduction) {
      error.details = err.details;
    }
  }

  res.status(statusCode).json({
    success: false,
    error,
    metadata: {
      requestId: res.locals.requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
