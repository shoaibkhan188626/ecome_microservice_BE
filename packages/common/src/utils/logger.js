import winston from "winston";

/**
 * Shared Logger Factory
 * Creates a logger instance for any service
 */
export const createLogger = (
  serviceName,
  logLevel = "info",
  isProduction = false,
) => {
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: "logs/combined.log",
        maxsize: 5242880,
        maxFiles: 5,
      }),
    ],
  });

  if (!isProduction) {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    );
  }

  return logger;
};
