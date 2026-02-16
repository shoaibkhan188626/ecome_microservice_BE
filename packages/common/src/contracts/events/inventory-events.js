import { createEvent } from './base-event.js';
import { EventTypes } from '../../constants/event-types.js';

export function createStockReservedEvent(reservation, metadata = {}) {
  return createEvent(
    EventTypes.STOCK_RESERVED,
    {
      reservationId: reservation._id?.toString() || reservation.id,
      orderId: reservation.orderId,
      items: reservation.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      })),
      expiresAt: reservation.expiresAt,
    },
    { source: 'inventory-service', ...metadata }
  );
}

export function createStockReleasedEvent(reservation, metadata = {}) {
  return createEvent(
    EventTypes.STOCK_RELEASED,
    {
      reservationId: reservation._id?.toString() || reservation.id,
      orderId: reservation.orderId,
      items: reservation.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      })),
      reason: reservation.releaseReason || 'manual',
    },
    { source: 'inventory-service', ...metadata }
  );
}

export function createStockDeductedEvent(items, metadata = {}) {
  return createEvent(
    EventTypes.STOCK_DEDUCTED,
    {
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      })),
    },
    { source: 'inventory-service', ...metadata }
  );
}

export function createStockLowEvent(product, currentStock, threshold, metadata = {}) {
  return createEvent(
    EventTypes.STOCK_LOW,
    {
      productId: product.productId,
      variantId: product.variantId || null,
      currentStock,
      threshold,
    },
    { source: 'inventory-service', ...metadata }
  );
}