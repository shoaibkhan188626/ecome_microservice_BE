import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";
import paymentService from "../../domain/services/payment-service.js";

const logger = createLogger(
  "payment-service",
  config.logLevel,
  config.isProduction,
);

class PaymentController {
  /**
   * POST /api/payments
   * Body: {orderId, userId, amount, currency?, provider, metadata}
   * Header : Idempotency-key (optional)
   */

  async createPayment(req, res) {
    try {
      const { orderId, userId, amount, currency, provider, metadata } =
        req.body;

      const errors = [];
      if (!orderId)
        errors.push({ field: "orderId", message: "orderId is required" });
      if (!userId)
        errors.push({ field: "userId", message: "userId is required" });
      if (amount == undefined || amount === null || Number(amount) <= 0) {
        errors.push({ field: "amount", message: "amount must be >0" });
      }
      if (!provider)
        errors.push({
          field: "provider",
          message: "provider is required (razorpay|stripe)",
        });
      if (errors.length) return ResponseHandler.validationError(res, errors);

      const idempotencyKey = req.headers["idempotency-key"] || null;

      const result = await paymentService.createPayment({
        orderId,
        userId,
        amount: Number(amount),
        currency: currency || config.defaultCurrency,
        provider,
        idempotencyKey,
        metadata: metadata || {},
      });

      return ResponseHandler.success(
        res,
        {
          payment: result.payment,
          clientData: result.clientData,
        },
        201,
      );
    } catch (err) {
      logger.error("createPayment Failed", { error: err.message });
      return ResponseHandler.error(
        res,
        "PAYMENT_CREATE_FAILED",
        err.message,
        400,
      );
    }
  }

  /**
   * GET /api/payments/:paymentId
   */
  async getPaymentById(req, res) {
    try {
      const payment = await paymentService.getPaymentById(req.params.paymentId);
      return ResponseHandler.success(res, payment);
    } catch (error) {
      return ResponseHandler.error(res, "NOT_FOUND", error.message, 404);
    }
  }

  /**
   * GET /api/payments/order/:orderId
   */

  async getPaymentByOrder(req, res) {
    try {
      const payments = await paymentService.getPaymentsByOrder(
        req.params.orderId,
      );
      return ResponseHandler.success(res, payments);
    } catch (err) {
      return ResponseHandler.error(res, "FETCH_FAILED", err.message, 400);
    }
  }

  /**
   * POST /api/payments/:paymentId/refund
   * BODY : {amount?} //omit for full refund
   */

  async refundPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      logger.info(
        `Processing refund for payment :${paymentId}, amount: ${amount || "full"}`,
      );
      const refund = await paymentService.refundPayment({
        paymentId,
        amount: amount ? Number(amount) : undefined, //undefined = full refund
        reason: reason || "Customer request",
      });

      return ResponseHandler.success(
        res,
        {
          refund: {
            id: refund.id,
            paymentId: refund.paymentId,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status,
            reason: refund.reason,
            createdAt: refund.createdAt,
          },
        },
        201,
      );
    } catch (err) {
      logger.error("refundPayment failed", {
        error: err.message,
        paymentId: req.params.paymentId,
      });
      return ResponseHandler.error(res, "REFUND_FAILED", err.message, 400);
    }
  }

  /**
   * GET /api/payments/:paymentId/status
   */

  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      logger.info(`Fetching status for payment:${paymentId}`);

      const status = await paymentService.getPaymentStatus(paymentId);

      return ResponseHandler.success(res, {
        paymentId,
        status: status.status,
        providerStatus: status.providerStatus,
        amount: status.amount,
        currency: status.currency,
        paidAt: status.paidAt,
        metadata: status.metadata,
      });
    } catch (err) {
      logger.error("getPaymentStatus failed", { error: err.message });
      return ResponseHandler.error(
        res,
        "STATUS_FETCH_FAILED",
        err.message,
        400,
      );
    }
  }

  /**
   * GET /api/payments/methods
   * get available payment methods/gateway
   */

  async getPaymentMethods(req, res) {
    try {
      const methods = [
        {
          id: "razorpay",
          name: "Razorpay",
          currencies: ["INR", "USD", "EUR", "GBP"],
          methods: ["card", "upi", "netbanking", "wallet", "emi"],
          isActive: !!config.razorPay?.keyId,
          config: {
            keyId: config.razorPay?.keyId
              ? `${config.razorPay?.keyId.substring(0, 8)}...`
              : null,
          },
        },
        {
          id: "stripe",
          name: "Stripe",
          currencies: ["USD", "EUR", "GBP", "INR", "AUD", "CAD"],
          methods: ["card", "upi", "netbanking"],
          isActive: !!config.stripe?.secretKey,
          config: {
            publishableKey: config.stripe?.publishableKey
              ? `${config.stripe.publishableKey.substring(0, 8)}...`
              : null,
          },
        },
      ];
      return ResponseHandler.success(res, {
        methods: methods.filter((m) => m.isActive),
        defaultCurrency: config.defaultCurrency || "INR",
        defaultProvider: config.defaultProvider || "razorpay",
      });
    } catch (err) {
      logger.error("getPaymentMethods failed", { error: err.message });
      return ResponseHandler.error(
        res,
        "METHODS_FETCH_FAILED",
        err.message,
        500,
      );
    }
  }

  /**
   * POST /api/payments/:paymentId/capture
   * Capture an authorized payment (for manual capture flow)
   */

  async capturePayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount } = req.body;
      logger.info(`Capturing payment: ${paymentId}, amount:${amount}`);

      const capture = await paymentService.capturePayment({
        paymentId,
        amount: amount ? Number(amount) : undefined,
      });

      return ResponseHandler.success(res, {
        paymentId,
        captureId: capture.id,
        amount: capture.amount,
        status: capture.status,
        capturedAt: capture.capturedAt,
      });
    } catch (err) {
      logger.error("capturePayment failed", { error: err.message });
      return ResponseHandler.error(res, "CAPTURE_FAILED", err.message, 400);
    }
  }

  /**
   * GET /api/payments.user/:userId
   * Get all payments for a user (with pagination)
   */

  async getUserPayments(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      logger.info(`Fetching payments for user: ${userId}`);

      const result = await paymentService.getUserPayments({
        userId,
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      });

      return ResponseHandler.success(res, {
        payments: result.payments,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      logger.error("getUserPayments failed", { error: err.message });
      return ResponseHandler.error(res, "FETCH_FAILED", err.message, 400);
    }
  }
}
export default new PaymentController();
