import { AppError, ErrorCodes } from '@ecommerce/common';

export class PaymentValidationError extends AppError {
  constructor(message, details = null) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, { details });
  }
}

export class PaymentNotFoundError extends AppError {
  constructor(paymentId) {
    super(ErrorCodes.PAYMENT_NOT_FOUND, `Payment not found: ${paymentId}`, 404);
  }
}

export class PaymentAlreadyProcessedError extends AppError {
  constructor(paymentId) {
    super(
      ErrorCodes.PAYMENT_ALREADY_PROCESSED,
      `Payment ${paymentId} has already been processed`,
      409,
    );
  }
}

export class PaymentGatewayError extends AppError {
  constructor(message, gatewayError = null) {
    super(ErrorCodes.PAYMENT_GATEWAY_ERROR, message, 502, {
      isOperational: true,
      cause: gatewayError,
      details: gatewayError?.response?.data,
    });
  }
}

export class InvalidWebhookSignatureError extends AppError {
  constructor() {
    super(ErrorCodes.PAYMENT_INVALID_WEBHOOK, 'invalid webhook signature', 401);
  }
}

export class RefundError extends AppError {
  constructor(message, details = null) {
    super(ErrorCodes.PAYMENT_REFUND_FAILED, message, 400, { details });
  }
}

export class PaymentTimeoutError extends AppError {
  constructor(paymentId) {
    super(ErrorCodes.PAYMENT_FAILED, `Payment ${paymentId} timed out`, 408);
  }
}

