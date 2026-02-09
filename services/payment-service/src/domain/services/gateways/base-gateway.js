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
   * @returns {Promise<Object>} provider-specific data
   */
  async createPaymentIntent(data) {
    throw new Error("createPaymentIntent must be implemented by subclass");
  }

  /**
   * Get payment status from provider
   * @param {String} providerPaymentId
   * @returns {Promise<Object>} {status, amount, currency, etc.}
   */
  async getPaymentStatus(providerPaymentId) {
    throw new Error("getPaymentStatus must be implemented by subclass");
  }

  /**
   * Capture authorized payment
   * @param {Object} params - {providerPaymentId, amount}
   * @returns {Promise<Object>}
   */
  async capturePayment(params) {
    throw new Error("capturePayment must be implemented by subclass");
  }

  /**
   * Refund payment
   * @param {Object} params - {providerPaymentId, amount, reason}
   * @returns {Promise<Object>}
   */
  async refundPayment(params) {
    throw new Error("refundPayment must be implemented by subclass");
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
   * Verify webhook signature
   * @param {String|Buffer} rawBody
   * @param {String} signature
   * @param {String} secret
   * @returns {Boolean}
   */
  verifySignature(rawBody, signature, secret) {
    throw new Error("verifySignature must be implemented by subclass");
  }
}

export default BasePaymentGateway;
