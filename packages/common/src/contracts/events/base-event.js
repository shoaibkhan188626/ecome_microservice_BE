import { randomUUID } from 'crypto';

/**
 * Creates a standardized event envelope.
 * Every event published through RabbitMQ uses this format.
 *
 * @param {string} type - Event type from EventTypes constant
 * @param {object} payload - Event data
 * @param {object} metadata - Additional context
 * @returns {object} Frozen event object
 */
export function createEvent(type, payload, metadata = {}) {
  return Object.freeze({
    id: randomUUID(),
    type,
    version: metadata.version || '1.0',
    timestamp: new Date().toISOString(),
    correlationId: metadata.correlationId || randomUUID(),
    causationId: metadata.causationId || null,
    source: metadata.source || 'unknown',
    payload: Object.freeze({ ...payload }),
    metadata: Object.freeze({
      userId: metadata.userId || null,
      ...metadata,
    }),
  });
}
