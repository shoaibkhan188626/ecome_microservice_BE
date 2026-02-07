import WebhookEvent from "../infrastructure/database/webhook-event.js";

/**
 * Webhook idempotency middleware
 * Prevents duplicate webhook processing
 */
export const webhookIdempotency = (options = {}) => {
  const {
    provider, // 'razorpay' | 'stripe'
    getEventId, // Function to extract event ID from req
    getEventType, // Function to extract event type from req
  } = options;

  return async (req, res, next) => {
    try {
      const eventId = getEventId(req);
      const eventType = getEventType(req);

      if (!eventId) {
        return res.status(400).json({ error: "Missing event ID" });
      }

      // Check if already processed
      const existing = await WebhookEvent.findOne({
        providerEventId: eventId,
        provider,
      });

      if (existing) {
        if (existing.status === "completed") {
          // Already processed - return 200 but don't process again
          console.log(`Webhook ${eventId} already processed, skipping`);
          return res.status(200).json({
            status: "already_processed",
            message: "Event already handled",
          });
        }

        if (existing.status === "processing") {
          // Currently processing - return 409 conflict
          return res.status(409).json({
            status: "processing",
            message: "Event currently being processed",
          });
        }
      }

      // Create or update webhook event record
      const webhookEvent = await WebhookEvent.findOneAndUpdate(
        { providerEventId: eventId },
        {
          providerEventId: eventId,
          provider,
          eventType,
          payload: req.body,
          status: "processing",
        },
        { upsert: true, new: true },
      );

      // Attach to request for later use
      req.webhookEvent = webhookEvent;

      // Override res.json to capture result
      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        // Update webhook event with result
        await WebhookEvent.findByIdAndUpdate(webhookEvent._id, {
          status: body.error ? "failed" : "completed",
          result: body,
          processedAt: new Date(),
          errorMessage: body.error?.message,
        });

        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Webhook idempotency error:", error);
      next(error);
    }
  };
};

export default webhookIdempotency;
