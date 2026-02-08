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
 * Best for indian users : UPI, cards, net banking, wallets
 */

export class RazorpayGateway extends BasePaymentGateway {
  constructor() {
    super("razorpay");

    if (!config.razorPay.keyId || !config.razorPay.keySecret) {
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
      //Mock mode
      const mockOrderId = `order_${Date.now()}`;
      logger.info(`(MOCK) Razorpay order created: ${mockOrderId}`);

      return {
        provider: "razorpay",
        providerOrderId: mockOrderId,
        providerPaymentId: null,
        amount,
        currency,
        clientData: {
          keyId: config.razorPay.keyId || "mock_key",
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
   * Handle Razorpay webhook
   */

  async handleWebhook(rawBody, headers) {
    const signature = headers["x-razorpay-signature"];

    if (!this.webhookSecret) {
      throw new Error("Razorpay webhook secret not configured");
    }

    const expectSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectSignature !== signature) {
      throw new Error("Invalid Razorpay webhook signature");
    }

    const payload = JSON.parse(rawBody.toString("utf8"));

    const eventType = payload.event;
    const entity =
      payload.payload?.payment?.entity || payload.payload?.order?.entity;

    const providerPaymentId = entity?.id;
    const providerOrderId = entity?.order_id || entity?.id;
    const amount = entity?.amount ? entity.amount / 100 : null;
    const currency = entity.currency || config.defaultCurrency;

    let status = "pending";

    switch (eventType) {
      case "payment.captured":
        status = "succeeded";
        break;

      case "payment.failed":
        status = "failed";
        break;

      case "order.paid":
        status = "succeeded";
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
   * Refund via Razorpay
   */

  async refundPayment(payment, amount = null) {
    if (!this.client) {
      logger.info(`(MOCK) Refund processed for payment ${payment._id}`);
      return {
        success: true,
        provider: "razorpay",
        mock: true,
      };
    }

    if (!payment.providerPaymentId) {
      throw new Error("providerPaymentId required for refund");
    }

    const options = {};

    if (amount) {
      options.amount = Math.round(amount * 100);
    }

    const refund = await this.client.payments.refund(
      payment.providerPaymentId,
      options,
    );

    return {
      success: true,
      provider: "razorpay",
      raw: refund,
    };
  }

  // Add to razorpay-gateway.js

  async getPaymentStatus(providerPaymentId) {
    try {
      const response = await this.httpClient.get(
        `/payments/${providerPaymentId}`,
      );
      return {
        status: this.mapStatus(response.data.status),
        amount: response.data.amount / 100,
        captured: response.data.captured,
      };
    } catch (error) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  async capturePayment({ providerPaymentId, amount }) {
    try {
      const response = await this.httpClient.post(
        `/payments/${providerPaymentId}/capture`,
        {
          amount: Math.round(amount * 100),
        },
      );
      return {
        id: response.data.id,
        status: "captured",
        amount: response.data.amount / 100,
      };
    } catch (error) {
      throw new Error(`Capture failed: ${error.message}`);
    }
  }

  async refundPayment({ providerPaymentId, amount, reason }) {
    try {
      const payload = {};
      if (amount) payload.amount = Math.round(amount * 100);

      const response = await this.httpClient.post(
        `/payments/${providerPaymentId}/refund`,
        payload,
      );
      return {
        id: response.data.id,
        status: response.data.status,
        amount: response.data.amount / 100,
      };
    } catch (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
}
