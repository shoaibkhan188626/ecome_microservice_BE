import Stripe from "stripe";
import { BasePaymentGateway } from "./base-gateway.js";
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

    if (!config.stripe?.secretKey) {
      logger.warn("Stripe not configured, running in mock mode");
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
      automatic_payment_methods: { enabled: true },
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
   * Get payment status from Stripe
   */
  async getPaymentStatus(providerPaymentId) {
    if (!this.client) {
      return { status: "succeeded", amount: 0, captured: true, mock: true };
    }

    try {
      const intent =
        await this.client.paymentIntents.retrieve(providerPaymentId);

      return {
        status: this.mapStatus(intent.status),
        amount: intent.amount / 100,
        captured: intent.status === "succeeded",
        charges: intent.charges?.data || [],
        raw: intent,
      };
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Capture authorized payment (Stripe auto-captures by default, but this is for manual capture flow)
   */
  async capturePayment({ providerPaymentId, amount }) {
    if (!this.client) {
      logger.info(`(MOCK) Capture payment: ${providerPaymentId}`);
      return { id: providerPaymentId, status: "succeeded", amount, mock: true };
    }

    try {
      // Stripe PaymentIntents auto-capture by default
      // For manual capture, we would use capture_method: 'manual' during creation
      // Then call this.client.paymentIntents.capture() here

      const intent = await this.client.paymentIntents.capture(
        providerPaymentId,
        amount ? { amount_to_capture: Math.round(amount * 100) } : undefined,
      );

      return {
        id: intent.id,
        status: intent.status,
        amount: intent.amount_received / 100,
        raw: intent,
      };
    } catch (error) {
      throw new Error(`Capture failed: ${error.message}`);
    }
  }

  /**
   * Refund via Stripe
   */
  async refundPayment({ providerPaymentId, amount, reason }) {
    if (!this.client) {
      logger.info(
        `(MOCK) Stripe refund processed for payment: ${providerPaymentId}`,
      );
      return {
        id: `re_mock_${Date.now()}`,
        status: "succeeded",
        amount: amount || 0,
        mock: true,
      };
    }

    if (!providerPaymentId) {
      throw new Error("providerPaymentId required for refund");
    }

    const params = {
      payment_intent: providerPaymentId,
    };

    if (amount) {
      params.amount = Math.round(amount * 100);
    }

    if (reason) {
      params.reason = this.mapRefundReason(reason);
    }

    const refund = await this.client.refunds.create(params);

    logger.info(
      `Stripe refund created: ${refund.id} for payment: ${providerPaymentId}`,
    );

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      raw: refund,
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

    // Map Stripe status to our status
    let status = "pending";
    switch (eventType) {
      case "payment_intent.succeeded":
        status = "succeeded";
        break;
      case "payment_intent.payment_failed":
        status = "failed";
        break;
      case "charge.refunded":
        status = "refunded";
        break;
      default:
        status = "pending";
    }

    return {
      eventType,
      provider: "stripe",
      providerPaymentId,
      providerOrderId: object.metadata?.orderId || null,
      status,
      amount,
      currency,
      raw: event,
    };
  }

  /**
   * Verify webhook signature (public method)
   */
  verifySignature(rawBody, signature, secret) {
    try {
      this.client.webhooks.constructEvent(
        rawBody,
        signature,
        secret || this.webhookSecret,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Map Stripe status to our standard status
   */
  mapStatus(stripeStatus) {
    const statusMap = {
      requires_payment_method: "pending",
      requires_confirmation: "pending",
      requires_action: "pending",
      processing: "pending",
      requires_capture: "authorized",
      canceled: "cancelled",
      succeeded: "succeeded",
    };
    return statusMap[stripeStatus] || stripeStatus;
  }

  /**
   * Map refund reason to Stripe reason
   */
  mapRefundReason(reason) {
    const reasonMap = {
      duplicate: "duplicate",
      fraudulent: "fraudulent",
      requested_by_customer: "requested_by_customer",
    };
    return reasonMap[reason] || "requested_by_customer";
  }
}

export default StripeGateway;
