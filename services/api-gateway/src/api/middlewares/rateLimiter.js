import rateLimit from "express-rate-limit";
import config from "../../config/index.js";
import { createLogger, ResponseHandler } from "@ecommerce/common";

/**
 * Token Bucket Algorithm implementation
 * More flexible than fixed window - allows bursts while maintaining average rate
 */

const logger = createLogger(
  "api-gateway",
  config.logLevel,
  config.isProduction,
);

const rateLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequest,
  standardHeaders: config.rateLimiting.standardHeaders,
  legacyHeaders: config.rateLimiting.legacyHeaders,

  //Custom key generator - uses IP by default, can be extended to use API key

  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },

  handler: (req, res) => {
    logger.warn(`Rate limit Exceeded for IP :${req.ip}`);
    ResponseHandler.rateLimitExceeded(res);
  },

  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Strict rate limit exceeded for IP : ${req.ip}`);
    ResponseHandler.rateLimitExceeded(res);
  },
});

export default rateLimiter;
