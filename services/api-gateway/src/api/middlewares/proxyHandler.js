import { createProxyMiddleware } from "http-proxy-middleware";
import config from "../../config/index.js";
import { createLogger } from "@ecommerce/common";

/**
 * Dynamic proxy handler for microservices
 * Routes requests to appropriate backend services
 * Implements circuit breaker pattern for resilience
 *
 * Time Complexity: O(1) - Direct routing based on path prefix
 */

const logger = createLogger(
  "api-gateway",
  config.logLevel,
  config.isProduction,
);

class ProxyHandler {
  constructor() {
    this.services = config.services;
    this.failureCount = new Map();
    this.circuitBreakerThreshold = 5;
    this.resetTimeout = 60000;
  }

  isCircuitOpen(serviceName) {
    const failures = this.failureCount.get(serviceName) || 0;
    return failures >= this.circuitBreakerThreshold;
  }

  recordFailure(serviceName) {
    const current = this.failureCount.get(serviceName) || 0;
    this.failureCount.set(serviceName, current + 1);

    setTimeout(() => {
      this.failureCount.set(serviceName, 0);
      logger.info(`Circuit breaker reset for ${serviceName}`);
    }, this.resetTimeout);
  }

  createProxy(serviceName, pathPrefix) {
    const target = this.services[serviceName];

    return createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${pathPrefix}`]: "",
      },

      onProxyReq: (proxyReq, req, res) => {
        if (this.isCircuitOpen(serviceName)) {
          logger.error(`Circuit breaker OPEN for ${serviceName}`);
          res.status(503).json({
            success: false,
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: `${serviceName} service is temporarily unavailable`,
            },
          });
          return;
        }

        proxyReq.setHeader("X-Request-Id", res.locals.requestId);
        proxyReq.setHeader("X-Forwarded-For", req.ip);

        logger.debug(`Proxying ${req.method} ${req.path} to ${serviceName}`);
      },

      onProxyRes: (proxyRes, req, res) => {
        logger.debug(`Response from ${serviceName}: ${proxyRes.statusCode}`);

        if (proxyRes.statusCode < 500) {
          this.failureCount.set(serviceName, 0);
        }
      },

      onError: (err, req, res) => {
        logger.error(`Proxy error for ${serviceName}:`, err.message);
        this.recordFailure(serviceName);

        res.status(502).json({
          success: false,
          error: {
            code: "BAD_GATEWAY",
            message: `Unable to reach ${serviceName} service`,
            details: config.isDevelopment ? err.message : null,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: res.locals.requestId,
          },
        });
      },

      proxyTimeout: 30000,
      timeout: 30000,
    });
  }

  getRoutes() {
    return [
      { path: "/api/auth", service: "auth" },
      { path: "/api/catalog", service: "catalog" },
      { path: "/api/categories", service: "catalog" },
      { path: "/api/products", service: "catalog" },
      { path: "/api/inventory", service: "inventory" },
      { path: "/api/cart", service: "cart" },
      { path: "/api/orders", service: "order" },
      { path: "/api/notifications", service: "notification" },
    ];
  }
}

export default new ProxyHandler();
