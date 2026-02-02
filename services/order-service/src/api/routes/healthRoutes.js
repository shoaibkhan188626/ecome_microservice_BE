import express from "express";
import {
  ResponseHandler,
  MongoConnection,
  RedisClient,
  createLogger,
} from "@ecommerce/common";
import config from "../../config/index.js";
import os from "os";

const router = express.Router();
const logger = createLogger(
  "order-service",
  config.logLevel,
  config.isProduction,
);

const dbConnection = new MongoConnection(logger);
const redisClient = new RedisClient(logger);

router.get("/health", (req, res) => {
  const dbStatus = dbConnection.getStatus();
  const redisStatus = redisClient.getStatus();

  const healthData = {
    status: dbStatus.isConnected && redisStatus.isConnected ? "UP" : "DOWN",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    service: "order-service",
    version: "1.0.0",
    database: {
      connected: dbStatus.isConnected,
      readyState: dbStatus.readyState,
      host: dbStatus.host,
      name: dbStatus.name,
    },
    redis: {
      connected: redisStatus.isConnected,
      status: redisStatus.status,
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

  const statusCode =
    dbStatus.isConnected && redisStatus.isConnected ? 200 : 503;
  return res.status(statusCode).json(healthData);
});

router.get("/ready", (req, res) => {
  const dbStatus = dbConnection.getStatus();
  const redisStatus = redisClient.getStatus();
  const isReady = dbStatus.isConnected && redisStatus.isConnected;

  if (isReady) {
    ResponseHandler.success(res, { ready: true });
  } else {
    ResponseHandler.error(res, "NOT_READY", "Service not ready", 503);
  }
});

router.get("/live", (req, res) => {
  ResponseHandler.success(res, { alive: true });
});

export { dbConnection, redisClient };
export default router;
