import mongoose from "mongoose";
import OutboxEvent from "./outbox-events.js";

export class TransactionManager {
  constructor(connection) {
    this.connection = connection || mongoose.connection;
  }

  /**
   * Execute operations within a transaction
   */
  async withTransaction(operations) {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();
      const result = await operations(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Execute operations and create outbox event atomically
   */
  async withOutboxEvent(operations, eventData) {
    return this.withTransaction(async (session) => {
      // Execute business operations
      const result = await operations(session);

      // Create outbox event in same transaction
      const eventId =
        eventData.eventId || new mongoose.Types.ObjectId().toString();

      const [outboxEvent] = await OutboxEvent.create(
        [
          {
            eventId,
            eventType: eventData.eventType,
            payload: eventData.payload,
            aggregateType: eventData.aggregateType,
            aggregateId: eventData.aggregateId || result?._id?.toString(),
            correlationId: eventData.correlationId,
            maxRetries: eventData.maxRetries || 5,
          },
        ],
        { session },
      );

      return { result, outboxEvent };
    });
  }
}

export default TransactionManager;
