import Stripe from "stripe";
import { BasePaymentGateway } from "./baseGateway.js";
import config from "../../../config/index.js";
import { createLogger } from "@ecommerce/common";

const logger = createLogger(
  "payment-service",
  config.logLevel,
  config.isProduction,
);

/**
 * Stripe Gateway
 * Best suited for international cards and wallets
 */

export class StripeGateway extends BasePaymentGateway {
  constructor() {
    super("stripe");

    if (!config.stripe.secretKey) {
      logger.warn("Stripe not configured. running in mock mode");
      this.client = null;
      return;
    }

    this.client = new Stripe(config.stripe.secretKey, {
      apiVersion: "2023-10-16",
    });
    this.webhookSecret = config.stripe.webhookSecret;
  }

  /**
   * Create Stripe Payment Intent
   */

  async createPaymentIntent({
    amount,
    currency,
    orderId,
    userId,
    metadata = {},
  }) {
    if (!this.client) {
      const mockId = `pi_mock_${Date.now()}`;
      logger.info(`(MOCK) Stripe payment intent created: ${mockId}`);
      return {
        provider: "stripe",
        providerPaymentId: mockId,
        providerOrderId: null,
        amount,
        currency: currency || "usd",
        clientData: {
          clientSecret: `cs_test_${mockId}`,
        },
      };
    }

    const amountInCents = Math.round(amount * 100);

    const intent = await this.client.paymentIntents.create({
      amount: amountInCents,
      currency: currency || "usd",
      metadata: {
        orderId: String(orderId),
        userId: String(userId),
        ...metadata,
      },
    });

    logger.info(
      `Stripe payment intent created: ${intent.id} for orderID: ${orderId}`,
    );

    return {
      provider: "stripe",
      providerPaymentId: intent.id,
      providerOrderId: null,
      amount: intent.amount / 100,
      currency: intent.currency,
      raw: intent,
      clientData: {
        clientSecret: intent.client_secret,
      },
    };
  }

  /**
   * Handle Stripe webhook
   */

  async handleWebhook(rawBody, headers) {
    if (!this.webhookSecret) {
      throw new Error("Stripe webhook secret not configured");
    }

    const sig = headers["stripe-signature"];

    let event;
    try {
      event = this.client.webhooks.constructEvent(
        rawBody,
        sig,
        this.webhookSecret,
      );
    } catch (error) {
      throw new Error(
        `Stripe webhook signature verification failed: ${error.message}`,
      );
    }

    const eventType = event.type;
    const object = event.data.object;
    const providerPaymentId = object.id;
    const amount = object.amount ? object.amount / 100 : null;
    const currency = object.currency || "usd";

    let status = "pending";

    switch (eventType) {
      case "payment_intent.succeeded":
        status = "succeeded";
        break;

      case "payment_intent.payment_failed":
        status = "failed";
        break;
      default:
        status = "pending";
    }

    return {
      eventType,
      provider: "stripe",
      providerPaymentId,
      providerOrderId: null,
      status,
      amount,
      currency,
      raw: event,
    };
  }

  /**
   * Refund via stripe
   */

  async refundPayment(payment, amount = null) {
    if (!this.client) {
      logger.info(`(MOCK) Stripe refund processed for payment ${payment._id}`);
      return {
        success: true,
        provider: "stripe",
        mock: true,
      };
    }

    if (!payment.providerPaymentId) {
      throw new Error("providerPaymentId required for refund");
    }

    const params = {
      payment_intent: payment.providerPaymentId,
    };

    if (amount) {
      params.amount = Math.round(amount * 100);
    }

    const refund = await this.client.refunds.create(params);

    return {
      success: true,
      provider: "stripe",
      raw: refund,
    };
  }
}
