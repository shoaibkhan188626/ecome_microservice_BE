import axios from "axios";
import crypto from "crypto";
import { PaymentGateway } from "./payment-gateway.js";

export class RazorpayAdapter extends PaymentGateway {
  constructor(config) {
    super(config);
    this.provider = "razorpay";
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.webhookSecret = config.webhookSecret;

    this.httpClient = axios.create({
      baseURL: "https://api.razorpay.com/v1",
      auth: {
        username: this.keyId,
        password: this.keySecret,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Create payment intent/order
   * Razorpay uses "orders" that payments are made against
   */
  async createPayment(paymentData) {
    try {
      const {
        amount,
        currency = "INR",
        orderId,
        customer,
        notes = {},
      } = paymentData;

      const response = await this.httpClient.post("/orders", {
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency.toUpperCase(),
        receipt: orderId,
        notes: {
          ...notes,
          customerId: customer?.id,
          customerEmail: customer?.email,
        },
      });

      return {
        paymentId: response.data.id, // This is actually the order ID in Razorpay
        clientSecret: null, // Razorpay doesn't use client secrets, use key ID
        status: this.mapStatus(response.data.status),
        amount: response.data.amount / 100,
        currency: response.data.currency,
        receipt: response.data.receipt,
      };
    } catch (error) {
      throw new Error(
        `Razorpay order creation failed: ${error.response?.data?.error?.description || error.message}`,
      );
    }
  }

  /**
   * Verify payment after callback/webhook
   * Razorpay sends payment ID in callback, we verify signature
   */
  async verifyPayment(paymentData) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
        paymentData;

      // Verify signature first
      const isValid = this.verifyWebhookSignature(
        `${razorpayOrderId}|${razorpayPaymentId}`,
        razorpaySignature,
      );

      if (!isValid) {
        throw new Error("Invalid payment signature");
      }

      // Fetch payment details from Razorpay
      const payment = await this.getPaymentStatus(razorpayPaymentId);

      return {
        success: payment.status === "captured",
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        status: payment.status,
        amount: payment.amount / 100,
        currency: payment.currency,
        method: payment.method,
        captured: payment.captured,
      };
    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Capture payment (for authorized payments)
   * Note: Razorpay auto-captures by default, but this is for manual capture
   */
  async capturePayment(paymentId, amount) {
    try {
      const response = await this.httpClient.post(
        `/payments/${paymentId}/capture`,
        {
          amount: Math.round(amount * 100),
        },
      );

      return {
        paymentId: response.data.id,
        status: this.mapStatus(response.data.status),
        amount: response.data.amount / 100,
        captured: response.data.captured,
      };
    } catch (error) {
      throw new Error(
        `Capture failed: ${error.response?.data?.error?.description || error.message}`,
      );
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId, amount = null) {
    try {
      const payload = {};
      if (amount) {
        payload.amount = Math.round(amount * 100);
      }

      const response = await this.httpClient.post(
        `/payments/${paymentId}/refund`,
        payload,
      );

      return {
        refundId: response.data.id,
        paymentId: response.data.payment_id,
        status: response.data.status,
        amount: response.data.amount / 100,
        currency: response.data.currency,
      };
    } catch (error) {
      throw new Error(
        `Refund failed: ${error.response?.data?.error?.description || error.message}`,
      );
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    try {
      const response = await this.httpClient.get(`/payments/${paymentId}`);

      return {
        id: response.data.id,
        orderId: response.data.order_id,
        status: this.mapStatus(response.data.status),
        amount: response.data.amount / 100,
        currency: response.data.currency,
        method: response.data.method,
        captured: response.data.captured,
        description: response.data.description,
        createdAt: new Date(response.data.created_at * 1000),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch payment: ${error.response?.data?.error?.description || error.message}`,
      );
    }
  }

  /**
   * Verify webhook signature
   * Razorpay uses HMAC SHA256
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac("sha256", this.webhookSecret || this.keySecret)
        .update(payload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Map Razorpay status to standard status
   */
  mapStatus(razorpayStatus) {
    const statusMap = {
      created: "pending",
      authorized: "authorized",
      captured: "completed",
      refunded: "refunded",
      failed: "failed",
    };
    return statusMap[razorpayStatus] || razorpayStatus;
  }

  /**
   * Fetch order details (Razorpay specific)
   */
  async getOrder(orderId) {
    try {
      const response = await this.httpClient.get(`/orders/${orderId}`);
      return {
        id: response.data.id,
        amount: response.data.amount / 100,
        currency: response.data.currency,
        status: response.data.status,
        receipt: response.data.receipt,
        attempts: response.data.attempts,
        createdAt: new Date(response.data.created_at * 1000),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch order: ${error.response?.data?.error?.description || error.message}`,
      );
    }
  }

  /**
   * Fetch all payments for an order
   */
  async getOrderPayments(orderId) {
    try {
      const response = await this.httpClient.get(`/orders/${orderId}/payments`);
      return response.data.items.map((payment) => ({
        id: payment.id,
        amount: payment.amount / 100,
        status: this.mapStatus(payment.status),
        method: payment.method,
        captured: payment.captured,
        createdAt: new Date(payment.created_at * 1000),
      }));
    } catch (error) {
      throw new Error(
        `Failed to fetch order payments: ${error.response?.data?.error?.description || error.message}`,
      );
    }
  }
}

export default RazorpayAdapter;
