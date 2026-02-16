import { createEvent } from './base-event.js';
import { EventTypes } from '../../constants/event-types.js';

export function createOrderCreatedEvent(order, metadata = {}) {
  return createEvent(
    EventTypes.ORDER_CREATED,
    {
      orderId: order._id?.toString() || order.id,
      userId: order.userId,
      items: order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: order.totalAmount,
      currency: order.currency || 'INR',
      shippingAddress: order.shippingAddress,
    },
    { source: 'order-service', ...metadata }
  );
}

export function createOrderConfirmedEvent(order, metadata = {}) {
  return createEvent(
    EventTypes.ORDER_CONFIRMED,
    {
      orderId: order._id?.toString() || order.id,
      userId: order.userId,
    },
    { source: 'order-service', ...metadata }
  );
}

export function createOrderCancelledEvent(order, reason, metadata = {}) {
  return createEvent(
    EventTypes.ORDER_CANCELLED,
    {
      orderId: order._id?.toString() || order.id,
      userId: order.userId,
      reason,
      items: order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      })),
    },
    { source: 'order-service', ...metadata }
  );
}