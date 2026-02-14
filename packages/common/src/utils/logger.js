import winston from "winston";

/**
 * Shared Logger Factory
 * Optimized for Microservices: JSON for Production, Pretty-Print for Development
 */
export const createLogger = (
  serviceName,
  logLevel = "info",
  isProduction = false,
) => {
  // Custom format for local development debugging
  const devFormat = winston.format.printf(({ timestamp, level, message, service, stack, ...meta }) => {
    // 1. Header with timestamp and service name
    let log = `\n[${timestamp}] [${service}] [${level}]: ${message}`;

    // 2. If it's an error with a stack trace, put it on a new line with indentation
    if (stack) {
      log += `\n\nSTACK TRACE:\n${stack}`;
    }

    // 3. Pretty-print any extra metadata (like productId, SKU, requestId)
    // The '2' argument in JSON.stringify adds the 2-space indentation you need
    if (Object.keys(meta).length > 0) {
      // Filter out env as it's repetitive in dev
      const { env, ...cleanMeta } = meta; 
      if (Object.keys(cleanMeta).length > 0) {
        log += `\n\nCONTEXT DATA:\n${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }

    // 4. Add a separator at the end of each log block
    log += `\n${"─".repeat(50)}`; 

    return log;
  });

  const logger = winston.createLogger({
    level: logLevel,
    defaultMeta: {
      service: serviceName,
      env: isProduction ? "production" : "development",
    },
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(), 
    ),
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              devFormat // <-- This is where the magic happens
            ),
      }),
    ],
  });

  // Local persistence for production debugging
  if (isProduction) {
    logger.add(
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    );
    logger.add(
      new winston.transports.File({
        filename: "logs/combined.log",
        maxsize: 5242880,
        maxFiles: 5,
      }),
    );
  }

  return logger;
};