import mongoose from "mongoose";

/**
 * Shared MongoDB Connection Factory
 */
export class MongoConnection {
  constructor(logger) {
    this.logger = logger;
    this.isConnected = false;
    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  async connect(mongoUri, retryCount = 0) {
    try {
      const options = {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        family: 4,
        serverSelectionTimeoutMS: 5000,
      };

      await mongoose.connect(mongoUri, options);

      this.isConnected = true;
      this.logger.info("✅ MongoDB connected successfully");
      this.logger.info(`📊 Database: ${mongoose.connection.name}`);
      this.logger.info(`🔗 Host: ${mongoose.connection.host}`);

      this.setupEventHandlers();
    } catch (error) {
      this.logger.error("❌ MongoDB connection error:", error.message);

      if (retryCount < this.maxRetries) {
        this.logger.info(
          `🔄 Retrying connection in ${this.retryDelay / 1000}s... (Attempt ${retryCount + 1}/${this.maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.connect(mongoUri, retryCount + 1);
      } else {
        this.logger.error("💥 Max retry attempts reached. Exiting...");
        process.exit(1);
      }
    }
  }

  setupEventHandlers() {
    mongoose.connection.on("disconnected", () => {
      this.logger.warn("⚠️  MongoDB disconnected");
      this.isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      this.logger.info("🔄 MongoDB reconnected");
      this.isConnected = true;
    });

    mongoose.connection.on("error", (error) => {
      this.logger.error("❌ MongoDB error:", error);
    });

    process.on("SIGINT", async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      this.logger.info("👋 MongoDB connection closed");
      this.isConnected = false;
    } catch (error) {
      this.logger.error("Error closing MongoDB connection:", error);
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }
}
