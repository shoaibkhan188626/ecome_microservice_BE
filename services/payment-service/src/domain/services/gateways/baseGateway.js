/**
 * BasePaymentGateway
 * Abstract interface for all payment gateways
 */

export class BasePaymentGateway {
  constructor(name) {
    this.name = name;
  }

  /**
   * Create payment intent / order with provider
   * @param {Object} data - {amount, currency, orderId, userId, metadata}
   * @returns {Promise<Object>} provider - specific data
   */

  async createPaymentIntent(data) {
    throw new Error("createPaymentIntent must be implemented by subclass");
  }

  /**
   * Handle provider-specific webhook callback
   * @param {String|Buffer} rawBody - Raw request body for signature verification
   * @param {Object} headers - HTTP headers (for signatures)
   * @returns {Promise<Object>} {eventType, providerPaymentId, providerOrderId, status, amount, currency, raw}
   */

  async handleWebhook(rawBody, headers) {
    throw new Error("handleWebhook must be implemented by subclass");
  }

  /**
   * Refund payment
   * @param {Object} payment - payment document
   * @param {Number|null} amount - partial or full
   * @returns {Promise<Object>}
   */

  async refundPayment(payment, amount = null) {
    throw new Error("refundPayment must be implemented by subclass");
  }
}
