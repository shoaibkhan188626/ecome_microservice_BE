import winston from "winston";

/**
 * Shared Logger Factory
 * Optimized for Microservices and DevOps observability
 */
export const createLogger = (
  serviceName,
  logLevel = "info",
  isProduction = false,
) => {
  const logger = winston.createLogger({
    level: logLevel,
    // defaultMeta ensures every log line knows which service it came from
    defaultMeta: {
      service: serviceName,
      env: isProduction ? "production" : "development",
    },
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }), // Captures full stack traces
      winston.format.splat(), // Allows string interpolation like logger.info("test %s", "var")
      winston.format.json(), // DevOps tools (ELK/Loki) require JSON to parse fields
    ),
    transports: [
      // 1. Always log to Console in containers (Docker handles the storage/rotation)
      new winston.transports.Console({
        format: isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
            ),
      }),
    ],
  });

  // 2. Only log to files if we are NOT in a serverless environment
  // and need local persistence for debugging
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
