import { randomUUID } from "crypto";

/**
 * Request ID middleware
 * Assigns unique ID to each request for distributed tracing
 */

const requestMiddleware = (req, res, next) => {
  const requestId = req.header["x-request-id"] || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};

export default requestMiddleware;
