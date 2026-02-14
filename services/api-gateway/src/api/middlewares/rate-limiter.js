import rateLimit from "express-rate-limit";
import config from "../../config/index.js";
import { createLogger, ResponseHandler } from "@ecommerce/common";

const logger = createLogger(
  "api-gateway",
  config.logLevel,
  config.isProduction,
);

const rateLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequests,
  standardHeaders: config.rateLimiting.standardHeaders,
  legacyHeaders: config.rateLimiting.legacyHeaders,

  // 1. FIX: Remove the custom keyGenerator entirely. 
  // By default, it uses req.ip, which is what you want.

  // 2. FIX: Add this validation setting to stop the IPv6 crash.
  // This tells the library to trust the IP provided by Express.
  validate: { xForwardedForHeader: false },

  skip: (req) =>
    req.path === "/health" || req.path === "/live" || req.path === "/ready",

  handler: (req, res) => {
    logger.warn(`Rate limit Exceeded for IP :${req.ip}`);
    ResponseHandler.error(res, "RATE_LIMIT_EXCEEDED", "Too many requests", 429);
  },

  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  
  // REMOVE the custom handler - let express-rate-limit handle it
  // The default behavior will call next() when limit is not exceeded
  // handler: (req, res) => {
  //   logger.warn(`Strict rate limit exceeded for IP : ${req.ip}`);
  //   ResponseHandler.error(
  //     res,
  //     "RATE_LIMIT_EXCEEDED",
  //     "Too many failed attempts",
  //     429,
  //   );
  // },
});

export default rateLimiter;