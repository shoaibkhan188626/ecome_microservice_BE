import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";
import paymentService from "../../domain/services/paymentService.js";

const logger = createLogger(
  "payment-service",
  config.logLevel,
  config.isProduction,
);

class PaymentController {
  /**
   * POST /api/payments
   * Body : {orderId, userId, amount, currency?, provider, metadata?}
   * Header: Idempotency-key (optional)
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
      if (amount === undefined || amount === null || Number(amount) <= 0) {
        errors.push({ field: "amount", message: "amount must be > 0" });
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
      logger.error("createPayment failed", { error: err.message });
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
    } catch (err) {
      return ResponseHandler.error(res, "NOT_FOUND", err.message, 404);
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
   * Body : {amount?} //omit for full refund
   */

  async refundPayment(req,res){
    try {
        const {amount}=req.body;
        const refund = await paymentService
    } catch (error) {
        
    }
  }
}
