import { createProxyMiddleware } from 'http-proxy-middleware';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

/**
 * Dynamic proxy handler for microservices
 * Routes requests to appropriate backend services
 * Implements circuit breaker pattern for resilience
 * 
 * Time Complexity: O(1) - Direct routing based on path prefix
 */

class ProxyHandler {
  constructor() {
    this.services = config.services;
    this.failureCount = new Map(); // Track service failures
    this.circuitBreakerThreshold = 5; // Open circuit after 5 failures
    this.resetTimeout = 60000; // Reset circuit after 1 minute
  }

  /**
   * Check if circuit breaker is open for a service
   * @param {string} serviceName 
   * @returns {boolean}
   */
  isCircuitOpen(serviceName) {
    const failures = this.failureCount.get(serviceName) || 0;
    return failures >= this.circuitBreakerThreshold;
  }

  /**
   * Record failure for circuit breaker
   * @param {string} serviceName 
   */
  recordFailure(serviceName) {
    const current = this.failureCount.get(serviceName) || 0;
    this.failureCount.set(serviceName, current + 1);

    // Auto-reset after timeout
    setTimeout(() => {
      this.failureCount.set(serviceName, 0);
      logger.info(`Circuit breaker reset for ${serviceName}`);
    }, this.resetTimeout);
  }

  /**
   * Create proxy middleware for a specific service
   * @param {string} serviceName - Name of the microservice
   * @param {string} pathPrefix - URL path prefix (e.g., '/api/auth')
   * @returns {Function} Express middleware
   */
  createProxy(serviceName, pathPrefix) {
    const target = this.services[serviceName];

    return createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        [`^${pathPrefix}`]: '', // Remove the path prefix when forwarding
      },
      
      // Add custom headers for tracing
      onProxyReq: (proxyReq, req, res) => {
        if (this.isCircuitOpen(serviceName)) {
          logger.error(`Circuit breaker OPEN for ${serviceName}`);
          res.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: `${serviceName} service is temporarily unavailable`,
            },
          });
          return;
        }

        // Forward request ID for distributed tracing
        proxyReq.setHeader('X-Request-Id', res.locals.requestId);
        proxyReq.setHeader('X-Forwarded-For', req.ip);
        
        logger.debug(`Proxying ${req.method} ${req.path} to ${serviceName}`);
      },

      // Handle proxy response
      onProxyRes: (proxyRes, req, res) => {
        logger.debug(`Response from ${serviceName}: ${proxyRes.statusCode}`);
        
        // Reset failure count on successful response
        if (proxyRes.statusCode < 500) {
          this.failureCount.set(serviceName, 0);
        }
      },

      // Handle proxy errors (circuit breaker pattern)
      onError: (err, req, res) => {
        logger.error(`Proxy error for ${serviceName}:`, err.message);
        this.recordFailure(serviceName);

        res.status(502).json({
          success: false,
          error: {
            code: 'BAD_GATEWAY',
            message: `Unable to reach ${serviceName} service`,
            details: config.isDevelopment ? err.message : null,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: res.locals.requestId,
          },
        });
      },

      // Timeout configuration
      proxyTimeout: 30000, // 30 seconds
      timeout: 30000,
    });
  }

  /**
   * Get all proxy routes configuration
   * @returns {Array} Array of route configurations
   */
  getRoutes() {
    return [
      { path: '/api/auth', service: 'auth' },
      { path: '/api/catalog', service: 'catalog' },
      { path: '/api/inventory', service: 'inventory' },
      { path: '/api/cart', service: 'cart' },
      { path: '/api/orders', service: 'order' },
      { path: '/api/notifications', service: 'notification' },
    ];
  }
}

export default new ProxyHandler();