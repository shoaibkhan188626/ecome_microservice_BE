import express from "express";
import ResponseHandler from "../../utils/responseHandler.js";
import databaseConnection from "../../infrastructure/database/connection.js";
import config from "../../config/index.js";
import os from "os";

const router = express.Router();
/**
 * Health check endpoints
 * GET /health
 */

router.get("/health", (req, res) => {
  const dbStatus = databaseConnection.getStatus();

  const healthData = {
    status: dbStatus.isConnected ? "UP" : "DOWN",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    service: "catalog-service",
    version: "1.0.0",
    database: {
      connected: dbStatus.isConnected,
      readState: dbStatus.readyState,
      host: dbStatus.host,
      name: dbStatus.name,
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

/**
 * Readiness probe
 * GET /ready
 */

router.get("/ready", (req, res) => {
  const dbStatus = databaseConnection.getStatus();
  const isReady = dbStatus.isConnected;

  if (isReady) {
    ResponseHandler.success(res, { ready: true, database: "connected" });
  } else {
    ResponseHandler.error(res, "NOT_READY", "Service not ready", 503, {
      database: "disconnected",
    });
  }
});

/**
 * liveness probe
 * GET /live
 */
router.get("/live", (req, res) => {
  ResponseHandler.success(res, { alive: true });
});

export default router;
