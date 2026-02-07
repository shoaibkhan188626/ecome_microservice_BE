import express from "express";
import {
  ResponseHandler,
  MongoConnection,
  createLogger,
} from "@ecommerce/common";
import config from "../../config/index.js";
import os from "os";
import emailService from "../../domain/services/email-service.js";
import smsService from "../../domain/services/sms-service.js";
import pushService from "../../domain/services/push-service.js";

const router = express.Router();
const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isProduction,
);

const dbConnection = new MongoConnection(logger);

router.get("/health", (req, res) => {
  const dbStatus = dbConnection.getStatus();

  const healthData = {
    status: dbStatus.isConnected ? "UP" : "DOWN",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    service: "notification-service",
    version: "1.0.0",
    database: {
      connected: dbStatus.isConnected,
      readyState: dbStatus.readyState,
      host: dbStatus.host,
      name: dbStatus.name,
    },
    channels: {
      email: !!config.email?.user,
      sms: {
        available: smsService.isAvailable?.() ?? false,
        ...(smsService.getHealthMetrics?.() || {}),
      },
      push: !!config.push?.firebaseServerKey || !!config.push?.projectId,
    },
    memory: {
      used: process.memoryUsage().heapUsed,
      total: process.memoryUsage().heapTotal,
      percentage: (
        (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
        100
      ).toFixed(2),
    },
    cpu: {
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
    },
  };

  const statusCode = dbStatus.isConnected ? 200 : 503;
  return res.status(statusCode).json(healthData);
});

router.get("/ready", (req, res) => {
  const dbStatus = dbConnection.getStatus();
  const isReady = dbStatus.isConnected;

  if (isReady) {
    ResponseHandler.success(res, { ready: true, database: "connected" });
  } else {
    ResponseHandler.error(res, "NOT_READY", "Service not ready", 503, {
      database: "disconnected",
    });
  }
});

router.get("/live", (req, res) => {
  ResponseHandler.success(res, { alive: true });
});

export { dbConnection };
export default router;
