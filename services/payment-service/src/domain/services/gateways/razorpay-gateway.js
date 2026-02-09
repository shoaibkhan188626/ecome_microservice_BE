import Razorpay from "razorpay";
import crypto from "crypto";
import { BasePaymentGateway } from "./base-gateway.js";
import config from "../../../config/index.js";
import { createLogger } from "@ecommerce/common";

const logger = createLogger(
  "payment-service",
  config.logLevel,
  config.isProduction,
);

/**
 * Razorpay Gateway
 * Best for Indian users: UPI, cards, net banking, wallets
 */

export class RazorpayGateway extends BasePaymentGateway {
  constructor() {
    super("razorpay");

    if (!config.razorPay?.keyId || !config.razorPay?.keySecret) {
      logger.warn("Razorpay not configured, running in mock mode");
      this.client = null;
      return;
    }

    this.client = new Razorpay({
      key_id: config.razorPay.keyId,
      key_secret: config.razorPay.keySecret,
    });
    this.webhookSecret = config.razorPay.webhookSecret;
  }

  /**
   * Create Razorpay order (payment intent equivalent)
   */
  async createPaymentIntent({
    amount,
    currency,
    orderId,
    userId,
    metadata = {},
  }) {
    if (!this.client) {
      // Mock mode
      const mockOrderId = `order_${Date.now()}`;
      logger.info(`(MOCK) Razorpay order created: ${mockOrderId}`);

      return {
        provider: "razorpay",
        providerOrderId: mockOrderId,
        providerPaymentId: null,
        amount,
        currency,
        clientData: {
          keyId: config.razorPay?.keyId || "mock_key",
          orderId: mockOrderId,
          amount: amount * 100,
          currency: currency || config.defaultCurrency,
        },
      };
    }

    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: currency || config.defaultCurrency,
      receipt: String(orderId),
      notes: {
        userId: String(userId),
        ...metadata,
      },
    };

    const order = await this.client.orders.create(options);
    logger.info(`Razorpay order created: ${order.id} for OrderID: ${orderId}`);

    return {
      provider: "razorpay",
      providerOrderId: order.id,
      providerPaymentId: null,
      amount: order.amount / 100,
      currency: order.currency,
      raw: order,
      clientData: {
        keyId: config.razorPay.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  }

  /**
   * Get payment status from Razorpay
   */
  async getPaymentStatus(providerPaymentId) {
    if (!this.client) {
      return { status: "succeeded", amount: 0, captured: true, mock: true };
    }

    try {
      const payment = await this.client.payments.fetch(providerPaymentId);

      return {
        status: this.mapStatus(payment.status),
        amount: payment.amount / 100,
        captured: payment.captured,
        method: payment.method,
        raw: payment,
      };
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Capture authorized payment
   */
  async capturePayment({ providerPaymentId, amount }) {
    if (!this.client) {
      logger.info(`(MOCK) Capture payment: ${providerPaymentId}`);
      return { id: providerPaymentId, status: "captured", amount, mock: true };
    }

    try {
      const captureAmount = amount ? Math.round(amount * 100) : undefined;

      const payment = await this.client.payments.capture(
        providerPaymentId,
        captureAmount,
      );

      return {
        id: payment.id,
        status: "captured",
        amount: payment.amount / 100,
        raw: payment,
      };
    } catch (error) {
      throw new Error(`Capture failed: ${error.message}`);
    }
  }

  /**
   * Refund via Razorpay
   */
  async refundPayment({ providerPaymentId, amount, reason }) {
    if (!this.client) {
      logger.info(`(MOCK) Refund processed for payment: ${providerPaymentId}`);
      return {
        id: `refund_${Date.now()}`,
        status: "processed",
        amount: amount || 0,
        mock: true,
      };
    }

    if (!providerPaymentId) {
      throw new Error("providerPaymentId required for refund");
    }

    const options = {};
    if (amount) {
      options.amount = Math.round(amount * 100);
    }
    if (reason) {
      options.notes = { reason };
    }

    const refund = await this.client.payments.refund(
      providerPaymentId,
      options,
    );

    logger.info(
      `Razorpay refund created: ${refund.id} for payment: ${providerPaymentId}`,
    );

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      raw: refund,
    };
  }

  /**
   * Handle Razorpay webhook
   */
  async handleWebhook(rawBody, headers) {
    const signature = headers["x-razorpay-signature"];

    if (!this.webhookSecret) {
      throw new Error("Razorpay webhook secret not configured");
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      throw new Error("Invalid Razorpay webhook signature");
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    const eventType = payload.event;

    // Extract entity based on event type
    let entity;
    if (payload.payload?.payment?.entity) {
      entity = payload.payload.payment.entity;
    } else if (payload.payload?.order?.entity) {
      entity = payload.payload.order.entity;
    } else {
      entity = {};
    }

    const providerPaymentId = entity.id;
    const providerOrderId = entity.order_id || entity.receipt || entity.id;
    const amount = entity.amount ? entity.amount / 100 : null;
    const currency = entity.currency || config.defaultCurrency;

    // Map Razorpay status to our status
    let status = "pending";
    switch (eventType) {
      case "payment.captured":
      case "order.paid":
        status = "succeeded";
        break;
      case "payment.failed":
        status = "failed";
        break;
      case "refund.processed":
        status = "refunded";
        break;
      default:
        status = "pending";
    }

    return {
      eventType,
      provider: "razorpay",
      providerPaymentId,
      providerOrderId,
      status,
      amount,
      currency,
      raw: payload,
    };
  }

  /**
   * Verify webhook signature (public method)
   */
  verifySignature(rawBody, signature, secret) {
    const expectedSignature = crypto
      .createHmac("sha256", secret || this.webhookSecret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  }

  /**
   * Map Razorpay status to our standard status
   */
  mapStatus(razorpayStatus) {
    const statusMap = {
      created: "created",
      authorized: "authorized",
      captured: "succeeded",
      refunded: "refunded",
      failed: "failed",
    };
    return statusMap[razorpayStatus] || razorpayStatus;
  }
}

export default RazorpayGateway;
