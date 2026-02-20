import { randomUUID } from 'crypto';

/**
 * UUID v4 validation pattern
 * Prevents injection through x-request-id or x-correlation-id headers
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a proper UUID v4
 * @param {string} value
 * @returns {boolean}
 */
const isValidUUID = (value) => {
  return typeof value === 'string' && UUID_PATTERN.test(value);
};

/**
 * Generates a prefixed unique ID
 * @param {string} prefix - e.g., "req" or "cor"
 * @returns {string} e.g., "req_550e8400-e29b-..."
 */
const generateId = (prefix) => `${prefix}_${randomUUID()}`;

/**
 * Request ID & Correlation ID Middleware
 *
 * Two IDs with different purposes:
 * - requestId:     Unique per HTTP request (per hop)
 * - correlationId: Survives across service-to-service calls (full chain)
 *
 * Flow example:
 * Client → API Gateway → Order Service → Payment Service
 *
 * At API Gateway:
 *   requestId:     req_aaa (generated fresh)
 *   correlationId: cor_bbb (generated fresh, no incoming header)
 *
 * At Order Service (called by Gateway):
 *   requestId:     req_ccc (generated fresh — new hop)
 *   correlationId: cor_bbb (passed from Gateway — same chain)
 *
 * At Payment Service (called by Order):
 *   requestId:     req_ddd (generated fresh — new hop)
 *   correlationId: cor_bbb (passed from Order — same chain)
 *
 * @returns {Function} Express middleware
 */
export const requestIdMiddleware = (req, res, next) => {
  // ─── Request ID: always fresh per hop ──────────────────
  const incomingRequestId = req.headers['x-request-id'];
  const requestId =
    incomingRequestId && isValidUUID(incomingRequestId) ? incomingRequestId : generateId('req');

  // ─── Correlation ID: preserved across the full chain ───
  const incomingCorrelationId = req.headers['x-correlation-id'];
  const correlationId =
    incomingCorrelationId && isValidUUID(incomingCorrelationId)
      ? incomingCorrelationId
      : generateId('cor');

  // ─── Attach to both req and res ────────────────────────
  req.requestId = requestId;
  req.correlationId = correlationId;
  res.locals.requestId = requestId;
  res.locals.correlationId = correlationId;

  // ─── Set response headers for client tracing ───────────
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', correlationId);

  next();
};
