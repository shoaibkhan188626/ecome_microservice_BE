import express from "express";
import { ResponseHandler } from "@ecommerce/common";
import config from "../../config/index.js";
import os from "os";

const router = express.Router();

/**
 * Health check endpoint
 * used by load balancer and monitoring systems
 */

router.get("/health", (req, res) => {
  const healthData = {
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
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
  ResponseHandler.success(res, healthData);
});

router.get("/ready", (req, res) => {
  //Checks for dependencies (redis,rabbitmq,etc)
  //for now a simple check

  const isReady = true;
  if (isReady) {
    ResponseHandler.success(res, { ready: true });
  } else {
    ResponseHandler.error(res, "NOT_READY", "Service not ready", 503);
  }
});

/**
 * Liveness probe - checks if service is alive
 */

router.get("/live", (req, res) => {
  ResponseHandler.success(res, { alive: true });
});

export default router;
