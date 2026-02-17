// ═══════════════════════════════════════════════════
// RabbitMQ Mock
// In-memory message broker for unit tests
// ═══════════════════════════════════════════════════

export function createRabbitMQMock() {
  const publishedMessages = [];
  const consumers = new Map();

  return {
    publish: async (exchange, routingKey, message) => {
      publishedMessages.push({ exchange, routingKey, message });

      // Trigger any registered consumers
      const key = `${exchange}:${routingKey}`;
      if (consumers.has(key)) {
        await consumers.get(key)(message);
      }
    },

    consume: async (queue, handler) => {
      consumers.set(queue, handler);
    },

    // Test helpers
    _getPublishedMessages: () => [...publishedMessages],

    _getLastMessage: () => publishedMessages[publishedMessages.length - 1],

    _getMessagesByType: (type) => publishedMessages.filter((m) => m.message?.type === type),

    _clear: () => {
      publishedMessages.length = 0;
      consumers.clear();
    },
  };
}
