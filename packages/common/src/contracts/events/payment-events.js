import { createEvent } from './base-event.js';
import { EventTypes } from '../../constants/event-types.js';

export function createPaymentSucceededEvent(payment, metadata = {}) {
  return createEvent(
    EventTypes.PAYMENT_SUCCEEDED,
    {
      paymentId: payment._id?.toString() || payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency || 'INR',
      gateway: payment.gateway,
      gatewayPaymentId: payment.gatewayPaymentId,
      method: payment.method,
    },
    { source: 'payment-service', ...metadata }
  );
}

export function createPaymentFailedEvent(payment, error, metadata = {}) {
  return createEvent(
    EventTypes.PAYMENT_FAILED,
    {
      paymentId: payment._id?.toString() || payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      gateway: payment.gateway,
      errorCode: error.code || 'UNKNOWN',
      errorMessage: error.message,
    },
    { source: 'payment-service', ...metadata }
  );
}

export function createPaymentRefundedEvent(payment, refund, metadata = {}) {
  return createEvent(
    EventTypes.PAYMENT_REFUNDED,
    {
      paymentId: payment._id?.toString() || payment.id,
      refundId: refund._id?.toString() || refund.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: refund.amount,
      reason: refund.reason,
    },
    { source: 'payment-service', ...metadata }
  );
}