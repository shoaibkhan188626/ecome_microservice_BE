import { Router } from "express";
import { webhookIdempotency } from "@ecommerce/common";
import paymentController from "../controllers/payment-controller.js";
import webhookController from "../controllers/webhook-controller.js";

const router = Router();

// ==================== PAYMENT API ROUTES ====================

/**
 * Create payment intent/order
 * POST /api/payments/create
 */
router.post("/create", paymentController.createPayment.bind(paymentController));

/**
 * Get payment status
 * GET /api/payments/:paymentId
 */
router.get(
  "/:paymentId",
  paymentController.getPaymentStatus.bind(paymentController),
);

/**
 * Process refund
 * POST /api/payments/:paymentId/refund
 */
router.post(
  "/:paymentId/refund",
  paymentController.processRefund.bind(paymentController),
);

/**
 * Get payment methods (available gateways)
 * GET /api/payments/methods
 */
router.get(
  "/methods",
  paymentController.getPaymentMethods.bind(paymentController),
);

// ==================== WEBHOOK ROUTES ====================

/**
 * Razorpay Webhook
 * Protected by idempotency middleware
 */
router.post(
  "/webhooks/razorpay",
  webhookIdempotency({
    provider: "razorpay",
    getEventId: (req) => req.headers["x-razorpay-event-id"],
    getEventType: (req) => req.body?.event,
  }),
  webhookController.razorpayWebhook.bind(webhookController),
);

/**
 * Stripe Webhook
 * Protected by idempotency middleware
 */
router.post(
  "/webhooks/stripe",
  webhookIdempotency({
    provider: "stripe",
    getEventId: (req) => req.headers["stripe-signature"],
    getEventType: (req) => req.body?.type,
  }),
  webhookController.stripeWebhook.bind(webhookController),
);

// ==================== WEBHOOK DEBUG/ADMIN ROUTES ====================

/**
 * Get webhook event status
 * GET /api/payments/webhooks/status/:eventId
 */
router.get(
  "/webhooks/status/:eventId",
  webhookController.getWebhookStatus.bind(webhookController),
);

/**
 * List recent webhooks
 * GET /api/payments/webhooks/list
 */
router.get(
  "/webhooks/list",
  webhookController.listWebhooks.bind(webhookController),
);

export default router;
