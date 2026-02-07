/**
 * Payment Gateway Abstract Interface
 * All payment providers must implement this interface
 */
export class PaymentGateway {
  constructor(config) {
    this.config = config;
    this.provider = "base";
  }

  /**
   * Create payment intent/order
   * @param {Object} paymentData - { amount, currency, orderId, customer }
   * @returns {Promise<Object>} { paymentId, clientSecret, status }
   */
  async createPayment(paymentData) {
    throw new Error("createPayment must be implemented");
  }

  /**
   * Verify payment (webhook/callback)
   * @param {Object} paymentData - Provider-specific data
   * @returns {Promise<Object>} { success, paymentId, orderId, status }
   */
  async verifyPayment(paymentData) {
    throw new Error("verifyPayment must be implemented");
  }

  /**
   * Capture payment (for authorized payments)
   * @param {String} paymentId
   * @param {Number} amount
   * @returns {Promise<Object>}
   */
  async capturePayment(paymentId, amount) {
    throw new Error("capturePayment must be implemented");
  }

  /**
   * Refund payment
   * @param {String} paymentId
   * @param {Number} amount - Optional partial refund
   * @returns {Promise<Object>}
   */
  async refundPayment(paymentId, amount = null) {
    throw new Error("refundPayment must be implemented");
  }

  /**
   * Get payment status
   * @param {String} paymentId
   * @returns {Promise<Object>}
   */
  async getPaymentStatus(paymentId) {
    throw new Error("getPaymentStatus must be implemented");
  }

  /**
   * Verify webhook signature
   * @param {String} payload
   * @param {String} signature
   * @returns {Boolean}
   */
  verifyWebhookSignature(payload, signature) {
    throw new Error("verifyWebhookSignature must be implemented");
  }
}
