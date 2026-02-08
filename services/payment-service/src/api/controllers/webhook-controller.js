import {
  createLogger,
  webhookIdempotency,
  WebhookEvent,
} from "@ecommerce/common";
import config from "../../config/index.js";
import paymentService from "../../domain/services/payment-service.js";

const logger = createLogger(
  "payment-service:webhook",
  config.logLevel,
  config.isProduction,
);

/**
 * Webhook Controller with Idempotency Protection
 *
 * Features:
 * - Duplicate webhook detection (prevents double-charging)
 * - Signature verification
 * - Event persistence for audit
 * - Automatic retry handling
 */
class WebhookController {
  /**
   * Razorpay Webhook Handler
   * Protected by idempotency middleware
   */
  async razorpayWebhook(req, res) {
    try {
      // Idempotency check is done by middleware
      // If we reach here, this is a new webhook or retry after failure

      if (!req.rawBody) {
        throw new Error(
          "Missing rawBody (signature verification requires raw payload)",
        );
      }

      // Verify signature and process payment
      const payment = await paymentService.handleRazorpayWebhook(
        req.rawBody,
        req.headers, // Fixed: was req.header (should be req.headers)
      );

      // Update webhook event with order/payment reference
      if (req.webhookEvent && payment) {
        await WebhookEvent.findByIdAndUpdate(req.webhookEvent._id, {
          orderId: payment.orderId,
          paymentId: payment.paymentId,
          status: "completed",
          processedAt: new Date(),
          result: { paymentId: payment.paymentId, status: payment.status },
        });
      }

      logger.info(
        `Razorpay webhook processed: ${payment?.paymentId || "unknown"}`,
      );

      return res.status(200).json({
        received: true,
        matched: !!payment,
        eventId: req.webhookEvent?.providerEventId,
      });
    } catch (err) {
      logger.error("Razorpay webhook failed", {
        error: err.message,
        eventId: req.webhookEvent?.providerEventId,
      });

      // Update webhook event as failed
      if (req.webhookEvent) {
        await WebhookEvent.findByIdAndUpdate(req.webhookEvent._id, {
          status: "failed",
          errorMessage: err.message,
          processedAt: new Date(),
        });
      }

      // Signature errors should be 400
      const statusCode = err.message.includes("signature") ? 400 : 500;
      return res.status(statusCode).json({
        received: false,
        error: err.message,
      });
    }
  }

  /**
   * Stripe Webhook Handler
   * Protected by idempotency middleware
   */
  async stripeWebhook(req, res) {
    try {
      // Idempotency check is done by middleware

      if (!req.rawBody) {
        throw new Error(
          "Missing rawBody (signature verification requires raw payload)",
        );
      }

      // Verify signature and process payment
      const payment = await paymentService.handleStripeWebhook(
        req.rawBody,
        req.headers,
      );

      // Update webhook event with order/payment reference
      if (req.webhookEvent && payment) {
        await WebhookEvent.findByIdAndUpdate(req.webhookEvent._id, {
          orderId: payment.orderId,
          paymentId: payment.paymentId,
          status: "completed",
          processedAt: new Date(),
          result: { paymentId: payment.paymentId, status: payment.status },
        });
      }

      logger.info(
        `Stripe webhook processed: ${payment?.paymentId || "unknown"}`,
      );

      return res.status(200).json({
        received: true,
        matched: !!payment,
        eventId: req.webhookEvent?.providerEventId,
      });
    } catch (err) {
      logger.error("Stripe webhook failed", {
        error: err.message,
        eventId: req.webhookEvent?.providerEventId,
      });

      // Update webhook event as failed
      if (req.webhookEvent) {
        await WebhookEvent.findByIdAndUpdate(req.webhookEvent._id, {
          status: "failed",
          errorMessage: err.message,
          processedAt: new Date(),
        });
      }

      const statusCode = err.message.includes("signature") ? 400 : 500;
      return res.status(statusCode).json({
        received: false,
        error: err.message,
      });
    }
  }

  /**
   * Get webhook event status (for debugging/admin)
   */
  async getWebhookStatus(req, res) {
    try {
      const { eventId } = req.params;

      const event = await WebhookEvent.findOne({
        providerEventId: eventId,
      }).lean();

      if (!event) {
        return res.status(404).json({ error: "Webhook event not found" });
      }

      return res.json({
        eventId: event.providerEventId,
        provider: event.provider,
        eventType: event.eventType,
        status: event.status,
        orderId: event.orderId,
        paymentId: event.paymentId,
        processedAt: event.processedAt,
        createdAt: event.createdAt,
        errorMessage: event.errorMessage,
      });
    } catch (err) {
      logger.error("Get webhook status failed", { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * List recent webhooks (for admin/debugging)
   */
  async listWebhooks(req, res) {
    try {
      const { provider, status, page = 1, limit = 20 } = req.query;

      const query = {};
      if (provider) query.provider = provider;
      if (status) query.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [events, total] = await Promise.all([
        WebhookEvent.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        WebhookEvent.countDocuments(query),
      ]);

      return res.json({
        events: events.map((e) => ({
          eventId: e.providerEventId,
          provider: e.provider,
          eventType: e.eventType,
          status: e.status,
          orderId: e.orderId,
          createdAt: e.createdAt,
          processedAt: e.processedAt,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      logger.error("List webhooks failed", { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  }
}

export default new WebhookController();
