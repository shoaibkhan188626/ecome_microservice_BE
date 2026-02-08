import { Router } from "express";
import { webhookIdempotency } from "@ecommerce/common";
import paymentController from "../controllers/payment-controller.js";
import webhookController from "../controllers/webhook-controller.js";

const router = Router();

// ==================== PAYMENT API ROUTES ====================

/**
 * Create payment intent/order
 * POST /api/payments
 */
router.post("/", paymentController.createPayment.bind(paymentController));

/**
 * Get available payment methods/gateways
 * GET /api/payments/methods
 */
router.get(
  "/methods",
  paymentController.getPaymentMethods.bind(paymentController),
);

/**
 * Get payment by ID
 * GET /api/payments/:paymentId
 */
router.get(
  "/:paymentId",
  paymentController.getPaymentById.bind(paymentController),
);

/**
 * Get real-time payment status from provider
 * GET /api/payments/:paymentId/status
 */
router.get(
  "/:paymentId/status",
  paymentController.getPaymentStatus.bind(paymentController),
);

/**
 * Get payments by order ID
 * GET /api/payments/order/:orderId
 */
router.get(
  "/order/:orderId",
  paymentController.getPaymentByOrder.bind(paymentController),
);

/**
 * Get payments by user ID (with pagination)
 * GET /api/payments/user/:userId?page=1&limit=20&status=pending
 */
router.get(
  "/user/:userId",
  paymentController.getUserPayments.bind(paymentController),
);

/**
 * Capture authorized payment
 * POST /api/payments/:paymentId/capture
 */
router.post(
  "/:paymentId/capture",
  paymentController.capturePayment.bind(paymentController),
);

/**
 * Refund payment (full or partial)
 * POST /api/payments/:paymentId/refund
 * Body: { amount?: number, reason?: string }
 */
router.post(
  "/:paymentId/refund",
  paymentController.refundPayment.bind(paymentController),
);

// ==================== WEBHOOK ROUTES ====================

/**
 * Razorpay Webhook
 * Protected by idempotency middleware (prevents duplicate processing)
 * POST /api/payments/webhooks/razorpay
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
 * Protected by idempotency middleware (prevents duplicate processing)
 * POST /api/payments/webhooks/stripe
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
 * Get webhook event status by ID
 * GET /api/payments/webhooks/status/:eventId
 */
router.get(
  "/webhooks/status/:eventId",
  webhookController.getWebhookStatus.bind(webhookController),
);

/**
 * List recent webhooks (with filtering)
 * GET /api/payments/webhooks/list?provider=razorpay&status=completed&page=1&limit=20
 */
router.get(
  "/webhooks/list",
  webhookController.listWebhooks.bind(webhookController),
);

export default router;
