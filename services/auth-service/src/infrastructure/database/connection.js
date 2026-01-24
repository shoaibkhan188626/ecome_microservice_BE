import mongoose from "mongoose";
import config from "../../config/index.js";
import logger from "../../utils/logger.js";

/**
 * MongoDB connection Handler
 * Implements connection pooling and retry logic
 *
 * Performance optimizations:
 * -connection pooling for better throughput
 * Auto re-connection on failure
 * Read preference configuration
 */

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  /**
   * Connect to MongoDB with retry logic
   */

  async connect(retryCount = 0) {
    try {
      //mongoose connection options for production grade setup

      const options = {
        maxPoolSize: 10, //maximum number of connection in pool
        minPoolSize: 2, //maximum number of connections
        socketTimeoutMS: 45000, //Close socket after 45 seconds of inactivity
        family: 4, //user IPv4, skip trying IPv6
        serverSelectionTimeoutMS: 5000, //keep trying to send operations for 5 second
      };

      await mongoose.connect(config.mongoUri, options);

      this.isConnected = true;
      logger.info("MongoDB connected successfully");

      //logging the connection details
      logger.info(`Database: ${mongoose.connection.name}`);
      logger.info(`Host: ${mongoose.connection.host}`);

      this.setupEventHandlers();
    } catch (error) {
      logger.error("MongoDB connection error:", error.message);

      if (retryCount < this.maxRetries) {
        logger.info(
          `Retrying connection in ${this.retryDelay / 1000}s... (Attempt ${retryCount + 1}/${this.maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.connect(retryCount + 1);
      } else {
        logger.error("Max Retry attempts reached. Exiting");
        process.exit(1);
      }
    }
  }

  /**
   * Setup event handlers for connection monitoring
   */

  setupEventHandlers() {
    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      this.isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
      this.isConnected = true;
    });

    mongoose.connection.on("error", (error) => {
      logger.error("MongoDB error:", error);
    });

    //graceful shutdown
    process.on("SIGINT", async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
      this.isConnected = false;
    } catch (error) {
      logger.error("Error closing MongoDB connection:", error);
    }
  }

  /**
   * Check connection status
   */

  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }
}

export default new DatabaseConnection();
