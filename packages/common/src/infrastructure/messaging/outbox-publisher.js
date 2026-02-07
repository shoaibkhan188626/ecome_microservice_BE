import { RabbitMQClient } from "./rabbitmq.js";

export class OutboxPublisher {
  constructor(options = {}) {
    this.rabbitmqUrl = options.rabbitmqUrl;
    this.exchange = options.exchange || "outbox.events";
    this.intervalMs = options.intervalMs || 5000;
    this.batchSize = options.batchSize || 100;
    this.logger = options.logger || console;

    this.rabbit = null;
    this.isRunning = false;
    this.timer = null;
  }

  async start() {
    if (this.isRunning) return;

    this.rabbit = new RabbitMQClient(this.logger);
    await this.rabbit.connect(this.rabbitmqUrl);

    // Ensure exchange exists
    await this.rabbit.channel.assertExchange(this.exchange, "topic", {
      durable: true,
    });

    this.isRunning = true;
    this.logger.info("Outbox publisher started");

    // Start processing loop
    this.processLoop();
  }

  async stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.rabbit) {
      await this.rabbit.disconnect();
    }
    this.logger.info("Outbox publisher stopped");
  }

  async processLoop() {
    while (this.isRunning) {
      try {
        const processed = await this.processBatch();

        // If no events processed, wait before next check
        const delay = processed > 0 ? 100 : this.intervalMs;
        await this.delay(delay);
      } catch (error) {
        this.logger.error("Error in outbox processing loop:", error);
        await this.delay(this.intervalMs);
      }
    }
  }

  async processBatch() {
    // Dynamic import to avoid circular dependency
    const { default: OutboxEvent } =
      await import("../database/outbox-events.js");

    const events = await OutboxEvent.findPending(this.batchSize);

    if (events.length === 0) return 0;

    this.logger.debug(`Processing ${events.length} outbox events`);

    for (const event of events) {
      try {
        await this.publishEvent(event);

        // Mark as published
        event.status = "published";
        event.publishedAt = new Date();
        await event.save();

        this.logger.debug(`Published outbox event: ${event.eventId}`);
      } catch (error) {
        await this.handlePublishError(event, error);
      }
    }

    return events.length;
  }

  async publishEvent(event) {
    const routingKey = `${event.aggregateType}.${event.eventType}`;

    const message = {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
      correlationId: event.correlationId,
      occurredAt: event.createdAt,
      publishedAt: new Date().toISOString(),
    };

    await this.rabbit.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        messageId: event.eventId,
        correlationId: event.correlationId,
        headers: {
          "x-event-type": event.eventType,
          "x-aggregate-type": event.aggregateType,
        },
      },
    );
  }

  async handlePublishError(event, error) {
    event.retryCount += 1;
    event.lastError = error.message;

    if (event.retryCount >= event.maxRetries) {
      event.status = "failed";
      this.logger.error(
        `Outbox event ${event.eventId} failed permanently after ${event.retryCount} retries`,
      );
    } else {
      // Exponential backoff: 1s, 5s, 15s, 30s, 60s
      const backoffDelays = [1000, 5000, 15000, 30000, 60000];
      const delay =
        backoffDelays[Math.min(event.retryCount - 1, backoffDelays.length - 1)];
      event.nextAttemptAt = new Date(Date.now() + delay);

      this.logger.warn(
        `Outbox event ${event.eventId} failed (attempt ${event.retryCount}), retrying in ${delay}ms`,
      );
    }

    await event.save();
  }

  delay(ms) {
    return new Promise((resolve) => {
      this.timer = setTimeout(resolve, ms);
    });
  }
}

export default OutboxPublisher;
