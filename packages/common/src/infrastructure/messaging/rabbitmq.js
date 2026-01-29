import amqp from "amqplib";

/**
 * RabbitMQ Message Broker
 * For event-driven communication between services
 */
export class RabbitMQClient {
  constructor(logger) {
    this.logger = logger;
    this.connection = null;
    this.channel = null;
  }

  async connect(url) {
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      this.logger.info("✅ RabbitMQ connected successfully");

      this.connection.on("error", (err) => {
        this.logger.error("RabbitMQ connection error:", err);
      });

      this.connection.on("close", () => {
        this.logger.warn("⚠️  RabbitMQ connection closed");
      });

      return this.channel;
    } catch (error) {
      this.logger.error("Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  async publishMessage(exchange, routingKey, message) {
    try {
      await this.channel.assertExchange(exchange, "topic", { durable: true });

      const content = Buffer.from(JSON.stringify(message));

      this.channel.publish(exchange, routingKey, content, {
        persistent: true,
        timestamp: Date.now(),
      });

      this.logger.debug(`Message published to ${exchange}/${routingKey}`);
    } catch (error) {
      this.logger.error("Publish message error:", error);
      throw error;
    }
  }

  async consumeMessages(queue, exchange, routingKey, handler) {
    try {
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.assertExchange(exchange, "topic", { durable: true });
      await this.channel.bindQueue(queue, exchange, routingKey);

      this.channel.consume(queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            await handler(content);
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error("Message handler error:", error);
            this.channel.nack(msg, false, false); // Dead letter queue
          }
        }
      });

      this.logger.info(`Consuming messages from queue: ${queue}`);
    } catch (error) {
      this.logger.error("Consume messages error:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.info("👋 RabbitMQ connection closed");
    } catch (error) {
      this.logger.error("Error closing RabbitMQ:", error);
    }
  }
}
