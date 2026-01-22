import { createProxyMiddleware } from "http-proxy-middleware";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";

/**
 * Dynamic proxy handler for microservices
 * Routes request to appropriate backend services
 * implements circuit breaker pattern for resilience
 */

class ProxyHandler {
  constructor() {
    this.services = config.services;
    this.failureCount = new Map();
    this.circuitBreakerThreshold = 5;
    this.resetTimeout = 60000;
  }

  /**
   * Check if circuit breaker is open for a service
   * @para {string} serviceName
   * @returns {boolean}
   */

  isCircuitOpen(serviceName) {
    const failures = this.failureCount.get(serviceName) || 0;
    return failures >= this.circuitBreakerThreshold;
  }

  /**
   * record failure for circuit breaker
   * @param {string} serviceName
   */

  recordFailure(serviceName) {
    const current = this.failureCount.get(serviceName) || 0;
    this.failureCount.set(serviceName, current + 1);

    //auto reset after a timeout
    setTimeout(() => {
      this.failureCount.set(serviceName, 0);
      logger.info(`Circuit breaker reset for ${serviceName}`);
    }, this.resetTimeout);
  }

  /**
   * create proxy middleware for a specific service
   * @param {string} serviceName - Name of the microservice
   * @param {string} pathPrefix - URL path prefix (e.g : '/api/auth')
   * @returns {Function} Express middleware
   */

  createProxy(serviceName, pathPrefix) {
    const target = this.services[serviceName];
    return createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${pathPrefix}`]: "", //removes the path prefix when forwarding
      },

      //custom headers for tracing
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

        //forward request ID for distributed tracing
        proxyReq.setHeader("X-Request-Id", res.locals.requestId);
        proxyReq.setHeader("X-Forwarded-For", req.ip);
        logger.debug(`Proxying ${req.method} ${req.path} to ${serviceName}`);
      },

      onProxyRes: (proxyRes, req, res) => {
        logger.debug(`Response from ${serviceName}: ${proxyRes.statusCode}`);

        //Reset failure count on successful response
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

      //Timeout configuration
      proxyTimeout: 30000, // 30 seconds
      timeout: 30000,
    });
  }

  /**
   * Get all proxy Routes configuration
   * @returns {Array} Array of configurations
   */

  getRoutes() {
    return [
      { path: "/api/auth", service: "auth" },
      { path: "/api/catalog", service: "catalog" },
      { path: "/api/inventory", service: "inventory" },
      { path: "/api/cart", service: "cart" },
      { path: "/api/orders", service: "order" },
      { path: "/api/notifications", service: "notification" },
    ];
  }
}

export default ProxyHandler;
