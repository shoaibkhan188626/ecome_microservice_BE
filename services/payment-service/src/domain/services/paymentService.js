import Payment from "../entities/Payment.js";
import { RazorpayGateway } from "./gateways/razorpayGateway.js";
import { StripeGateway } from "./gateways/stripeGateway.js";
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
    //Idempotency check
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

    //Ask gateway to create provider-side object
    const providerResult = await gateway.createPaymentIntent({
      orderId,
      userId,
      amount,
      currency,
      metadata,
    });

    //persist in DB
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
   * Handle Razorpay webhook
   */

  async handleRazorpayWebhook(rawBody, headers) {
    const gateway = this.razorpayGateway;
    const result = await gateway.handleWebhook(rawBody, headers);

    //Find payment by providerOrderId or providerPaymentId
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

  /**
   * Refund a payment
   */

  async refundPayment(paymentId, amount = null) {
    const payment = await Payment.findById(paymentId);

    if (!payment) throw new Error("Payment not found");

    const gateway = this.getGateway(payment.provider);

    const result = await gateway.refundPayment(payment, amount);

    payment.status = "refunded";
    payment.refundedAt = new Date();
    payment.addLog("refunded", { result });

    await payment.save();
    return payment;
  }
}

export default new PaymentService();
