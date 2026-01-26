import mongoose from 'mongoose';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  async connect(retryCount = 0) {
    try {
      const options = {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        family: 4,
        serverSelectionTimeoutMS: 5000,
      };

      await mongoose.connect(config.mongoUri, options);

      this.isConnected = true;
      logger.info('✅ MongoDB connected successfully');
      logger.info(`📊 Database: ${mongoose.connection.name}`);
      logger.info(`🔗 Host: ${mongoose.connection.host}`);

      this.setupEventHandlers();
    } catch (error) {
      logger.error('❌ MongoDB connection error:', error.message);

      if (retryCount < this.maxRetries) {
        logger.info(`🔄 Retrying connection in ${this.retryDelay / 1000}s... (Attempt ${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect(retryCount + 1);
      } else {
        logger.error('💥 Max retry attempts reached. Exiting...');
        process.exit(1);
      }
    }
  }

  setupEventHandlers() {
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      logger.error('❌ MongoDB error:', error);
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      logger.info('👋 MongoDB connection closed');
      this.isConnected = false;
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
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

export default new DatabaseConnection();