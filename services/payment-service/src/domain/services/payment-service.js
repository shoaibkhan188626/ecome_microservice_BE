import Payment from "../entities/payment.js";
import { RazorpayGateway } from "./gateways/razorpay-gateway.js";
import { StripeGateway } from "./gateways/stripe-gateway.js";
import { createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "payment-service",
  config.logLevel,
  config.isProduction,
);

/**
 * PaymentService
 * Orchestration between DB + Gateways
 */
class PaymentService {
  constructor() {
    this.razorpayGateway = new RazorpayGateway();
    this.stripeGateway = new StripeGateway();
  }

  getGateway(provider) {
    switch ((provider || "").toLowerCase()) {
      case "razorpay":
        return this.razorpayGateway;

      case "stripe":
        return this.stripeGateway;

      default:
        throw new Error(`Unsupported Payment provider: ${provider}`);
    }
  }

  /**
   * Create a Payment intent for an order
   */
  async createPayment({
    orderId,
    userId,
    amount,
    currency,
    provider,
    idempotencyKey,
    metadata,
  }) {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await Payment.findOne({ idempotencyKey });
      if (existing) {
        logger.info(`Idempotency payment reused: ${existing._id}`);
        return {
          payment: existing,
          clientData: existing.providerMetadata?.clientData || null,
        };
      }
    }

    const gateway = this.getGateway(provider);

    // Ask gateway to create provider-side object
    const providerResult = await gateway.createPaymentIntent({
      orderId,
      userId,
      amount,
      currency,
      metadata,
    });

    // Persist in DB
    const payment = new Payment({
      orderId,
      userId,
      amount: providerResult.amount,
      currency: providerResult.currency,
      provider: providerResult.provider,
      providerPaymentId: providerResult.providerPaymentId,
      providerOrderId: providerResult.providerOrderId,
      providerMetadata: providerResult,
      status: "pending",
      idempotencyKey: idempotencyKey || null,
      createdAtProvider: new Date(),
    });
    payment.addLog("created", { providerResult });

    await payment.save();

    return {
      payment,
      clientData: providerResult.clientData || null,
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error("Payment not found");
    return payment;
  }

  /**
   * Get payments by order
   */
  async getPaymentsByOrder(orderId) {
    return Payment.find({ orderId }).sort({ createdAt: -1 });
  }

  /**
   * Get real-time payment status from provider
   */
  async getPaymentStatus(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error("Payment not found");

    const gateway = this.getGateway(payment.provider);

    // Fetch fresh status from provider
    const providerStatus = await gateway.getPaymentStatus(
      payment.providerPaymentId,
    );

    return {
      paymentId: payment._id,
      status: payment.status,
      providerStatus: providerStatus.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.succeededAt,
      metadata: payment.providerMetadata,
    };
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment({ paymentId, amount }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error("Payment not found");

    // FIX: Allow both "authorized" and "pending" status for capture
    if (!["authorized", "pending", "succeeded"].includes(payment.status)) {
      throw new Error(`Cannot capture payment in ${payment.status} status`);
    }

    const gateway = this.getGateway(payment.provider);

    const result = await gateway.capturePayment({
      providerPaymentId: payment.providerPaymentId,
      amount: amount || payment.amount,
    });

    payment.status = "captured";
    payment.capturedAt = new Date();
    payment.capturedAmount = amount || payment.amount;
    payment.addLog("captured", { result });

    await payment.save();

    return {
      id: result.id || payment._id,
      paymentId: payment._id,
      amount: payment.capturedAmount,
      status: payment.status,
      capturedAt: payment.capturedAt,
    };
  }

  /**
   * Refund a payment
   */
  async refundPayment({ paymentId, amount, reason }) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error("Payment not found");

    if (!["succeeded", "captured"].includes(payment.status)) {
      throw new Error(`Cannot refund payment in ${payment.status} status`);
    }

    const gateway = this.getGateway(payment.provider);

    const result = await gateway.refundPayment({
      providerPaymentId: payment.providerPaymentId,
      amount: amount, // null = full refund
      reason: reason || "Customer request",
    });

    // Update payment status
    if (amount && amount < payment.amount) {
      payment.status = "partially_refunded";
    } else {
      payment.status = "refunded";
    }

    payment.refundedAt = new Date();
    payment.refundedAmount =
      (payment.refundedAmount || 0) + (amount || payment.amount);
    payment.addLog("refunded", { result, amount, reason });

    await payment.save();

    return {
      id: result.id || `refund_${Date.now()}`,
      paymentId: payment._id,
      amount: amount || payment.amount,
      currency: payment.currency,
      status: payment.status,
      reason: reason || "Customer request",
      createdAt: payment.refundedAt,
    };
  }

  /**
   * Get all payments for a user with pagination
   */
  async getUserPayments({ userId, page = 1, limit = 20, status }) {
    const query = { userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    return {
      payments,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Handle Razorpay webhook
   */
  async handleRazorpayWebhook(rawBody, headers) {
    const gateway = this.razorpayGateway;
    const result = await gateway.handleWebhook(rawBody, headers);

    // Find payment by providerOrderId or providerPaymentId
    let payment = await Payment.findOne({
      provider: "razorpay",
      $or: [
        { providerOrderId: result.providerOrderId },
        { providerPaymentId: result.providerOrderId },
      ],
    });

    if (!payment) {
      logger.warn("Razorpay webhook with no matching payment", { result });
      return null;
    }

    payment.status = result.status;

    if (result.status === "succeeded") {
      payment.succeededAt = new Date();
    } else if (result.status === "failed") {
      payment.failedAt = new Date();
      payment.errorMessage = "Payment failed via webhook";
    }

    payment.addLog("webhook", result);
    await payment.save();

    return payment;
  }

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(rawBody, headers) {
    const gateway = this.stripeGateway;
    const result = await gateway.handleWebhook(rawBody, headers);

    let payment = await Payment.findOne({
      provider: "stripe",
      providerPaymentId: result.providerPaymentId,
    });

    if (!payment) {
      logger.warn("Stripe webhook no matching payment", { result });
      return null;
    }

    payment.status = result.status;
    if (result.status === "succeeded") {
      payment.succeededAt = new Date();
    } else if (result.status === "failed") {
      payment.failedAt = new Date();
      payment.errorMessage = "Payment failed via webhook";
    }

    payment.addLog("webhook", result);
    await payment.save();
    return payment;
  }
}

export default new PaymentService();
