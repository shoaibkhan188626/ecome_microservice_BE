import winston from 'winston';

/**
 * Sensitive fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'authorization',
  'creditCard',
  'cardNumber',
  'cvv',
  'apiKey',
];

/**
 * Recursively redact sensitive fields from an object
 *
 * @param {object} obj - Object to redact
 * @returns {object} Redacted copy
 */
const redactSensitive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item));
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
};

/**
 * Custom redaction format for Winston
 */
const redactFormat = winston.format((info) => {
  // Redact any metadata
  const { message, level, timestamp, service, env, stack, ...meta } = info;

  const redactedMeta = redactSensitive(meta);

  return {
    message,
    level,
    timestamp,
    service,
    env,
    stack,
    ...redactedMeta,
  };
});

/**
 * Pretty dev format for local debugging
 */
const devFormat = winston.format.printf(
  ({ timestamp, level, message, service, stack, ...meta }) => {
    let log = `\n[${timestamp}] [${service}] [${level}]: ${message}`;

    if (stack) {
      log += `\n\nSTACK TRACE:\n${stack}`;
    }

    // Filter out noise
    const { env, splat, ...cleanMeta } = meta;
    if (Object.keys(cleanMeta).length > 0) {
      log += `\n\nCONTEXT DATA:\n${JSON.stringify(cleanMeta, null, 2)}`;
    }

    log += `\n${'─'.repeat(50)}`;

    return log;
  },
);

/**
 * Create a logger instance for a service
 *
 * @param {object} options
 * @param {string} options.serviceName - Name of the microservice
 * @param {string} options.logLevel - Minimum log level (default: "info")
 * @param {boolean} options.isProduction - Production mode flag
 * @param {boolean} options.silent - Suppress all output (for tests)
 * @param {string} options.logDir - Directory for log files (default: "logs")
 * @returns {object} Enhanced logger instance with child() support
 */
export const createLogger = ({
  serviceName,
  logLevel = 'info',
  isProduction = false,
  silent = false,
  logDir = 'logs',
} = {}) => {
  const logger = winston.createLogger({
    level: logLevel,
    silent,
    defaultMeta: {
      service: serviceName,
      env: isProduction ? 'production' : 'development',
    },
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      redactFormat(),
    ),
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? winston.format.json()
          : winston.format.combine(winston.format.colorize(), devFormat),
      }),
    ],
  });

  // Production file transports
  if (isProduction) {
    logger.add(
      new winston.transports.File({
        filename: `${logDir}/error.log`,
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5,
        format: winston.format.json(),
      }),
    );
    logger.add(
      new winston.transports.File({
        filename: `${logDir}/combined.log`,
        maxsize: 5242880,
        maxFiles: 5,
        format: winston.format.json(),
      }),
    );
  }

  // ─── Enhanced wrapper ────────────────────────────────
  // Supports both calling conventions:
  //   logger.info("message", { context })     ← Winston-style
  //   logger.info({ context }, "message")     ← Pino-style

  const wrapMethod = (method) => {
    return (arg1, arg2, ...rest) => {
      // Pino-style: logger.info({ key: "val" }, "message")
      if (typeof arg1 === 'object' && arg1 !== null && typeof arg2 === 'string') {
        return method(arg2, arg1, ...rest);
      }

      // Winston-style: logger.info("message", { key: "val" })
      return method(arg1, arg2, ...rest);
    };
  };

  const enhancedLogger = {
    /**
     * Create a child logger with bound metadata
     * Usage: const reqLogger = logger.child({ requestId, correlationId })
     *
     * @param {object} meta - Metadata to bind to all log calls
     * @returns {object} Child logger with same interface
     */
    child(meta = {}) {
      const childWinston = logger.child(meta);

      return {
        error: wrapMethod(childWinston.error.bind(childWinston)),
        warn: wrapMethod(childWinston.warn.bind(childWinston)),
        info: wrapMethod(childWinston.info.bind(childWinston)),
        debug: wrapMethod(childWinston.debug.bind(childWinston)),
        verbose: wrapMethod(childWinston.verbose.bind(childWinston)),
        child: (moreMeta) => enhancedLogger.child({ ...meta, ...moreMeta }),
      };
    },

    error: wrapMethod(logger.error.bind(logger)),
    warn: wrapMethod(logger.warn.bind(logger)),
    info: wrapMethod(logger.info.bind(logger)),
    debug: wrapMethod(logger.debug.bind(logger)),
    verbose: wrapMethod(logger.verbose.bind(logger)),

    /**
     * Flush all transports — call during graceful shutdown
     * @returns {Promise<void>}
     */
    async flush() {
      return new Promise((resolve) => {
        logger.on('finish', resolve);
        logger.end();
      });
    },

    /** Access underlying Winston instance if needed */
    _winston: logger,
  };

  return enhancedLogger;
};
