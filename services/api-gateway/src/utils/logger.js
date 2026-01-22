import winston from "winston";
import config from "../config/index.js";

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: "api-gateway" },
  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: "5242880",
      maxFiles: 5,
    }),

    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: "5242880",
      maxFiles: 5,
    }),
  ],
});

if (!config.isProduction) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple,
      ),
    }),
  );
}

export default logger;
