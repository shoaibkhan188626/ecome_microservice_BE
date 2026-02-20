import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from '../../../src/api/middlewares/error-handler.js';
import {
  PaymentNotFoundError,
  PaymentGatewayError,
  InvalidWebhookSignatureError,
} from '../../../src/errors/payment-errors.js';

describe('Error Handler Middleware', () => {
  const mockResponse = () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {
        requestId: 'test-request-id',
      },
    };
    return res;
  };

  const mockRequest = () => ({
    path: '/test',
    method: 'GET',
  });

  it('should handle PaymentNotFoundError', () => {
    const err = new PaymentNotFoundError('pay_123');
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found: pay_123',
      },
      metadata: expect.any(Object),
    });
  });

  it('should handle PaymentGatewayError', () => {
    const gatewayError = new Error('Gateway connection failed');
    const err = new PaymentGatewayError('Failed to process payment', gatewayError);
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PAYMENT_GATEWAY_ERROR',
        message: 'Failed to process payment',
        details: expect.any(Object),
      },
      metadata: expect.any(Object),
    });
  });

  it('should handle InvalidWebhookSignatureError', () => {
    const err = new InvalidWebhookSignatureError();
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PAYMENT_INVALID_WEBHOOK',
        message: 'Invalid webhook signature',
      },
      metadata: expect.any(Object),
    });
  });

  it('should handle Razorpay errors', () => {
    const err = new Error('Invalid API key');
    err.name = 'RazorpayError';
    err.code = 'BAD_REQUEST_ERROR';
    err.description = 'The API key provided is invalid';

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PAYMENT_GATEWAY_ERROR',
        message: 'Payment gateway error',
        details: {
          description: 'The API key provided is invalid',
          code: 'BAD_REQUEST_ERROR',
        },
      },
      metadata: expect.any(Object),
    });
  });

  it('should handle Stripe errors', () => {
    const err = new Error('Invalid card');
    err.type = 'StripeCardError';
    err.code = 'card_declined';
    err.param = 'number';

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PAYMENT_GATEWAY_ERROR',
        message: 'Payment gateway error',
        details: {
          type: 'StripeCardError',
          code: 'card_declined',
          param: 'number',
        },
      },
      metadata: expect.any(Object),
    });
  });

  it('should handle unknown errors in production', () => {
    const err = new Error('Something went wrong');
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    // Mock production environment
    vi.mock('../../../src/config/index.js', () => ({
      default: {
        isProduction: true,
      },
    }));

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      metadata: expect.any(Object),
    });
  });
});
