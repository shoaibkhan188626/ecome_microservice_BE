import { randomUUID } from "crypto";

/**
 * Assigns uniuque ID to each request for tracing
 * Time Complexity: O(1) - UUID generation is constant time
 */

const requestMiddleware = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};

export default requestMiddleware;
