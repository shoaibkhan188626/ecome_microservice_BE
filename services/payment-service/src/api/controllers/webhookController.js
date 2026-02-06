import { createLogger } from "@ecommerce/common";
import config from "../../config/index.js";
import paymentService from "../../domain/services/paymentService.js";

const logger = createLogger(
  "payment-service:webhook",
  config.logLevel,
  config.isProduction,
);

class WebhookController {
  /**
   * POST /webhooks/razorpay
   * Needs: req.rawBody buffer + x-razorpay-signature header
   */

  async razorpayWebhook(req, res) {
    try {
      if (!req.rawBody)
        throw new Error(
          "Missing rawBody (signature verification requires raw payload)",
        );

      const payment = await paymentService.handleRazorpayWebhook(
        req.rawBody,
        req.header,
      );
      return res.status(200).json({ received: true, matched: !!payment });
    } catch (err) {
      logger.error("Razorpay webhook failed", { error: err.message });

      //Signature errors should be 400
      return res.status(400).json({ received: false, error: err.message });
    }
  }

  /**
   * POST /webhooks/stripe
   * Needs: req.rawBody Buffer + stripe-signature header
   */

  async stripeWebhook(req, res) {
    try {
      if (!req.rawBody)
        throw new Error(
          "Missing rawBody (signature verification requires raw payload)",
        );

      const payment = await paymentService.handleStripeWebhook(
        req.rawBody,
        req.header,
      );

      return res.status(200).json({ received: true, matched: !!payment });
    } catch (err) {
      logger.error("Stripe webhook failed", { error: err.message });
      return res.status(400).json({ received: false, error: err.message });
    }
  }
}

export default new WebhookController();
