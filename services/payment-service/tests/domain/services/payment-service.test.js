import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentService } from '../../../src/domain/services/payment-service.js';
import { createTestPayment } from '@ecommerce/testing';
import { ErrorCodes } from '@ecommerce/common';

describe('PaymentService', () => {
  let paymentService;
  let mockGateway;
  let mockRepository;
  let mockPublisher;

  beforeEach(() => {
    mockGateway = {
      createPayment: vi.fn(),
      verifyPayment: vi.fn(),
      refundPayment: vi.fn(),
    };

    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
    };

    mockPublisher = {
      publish: vi.fn(),
    };

    paymentService = new PaymentService(mockGateway, mockRepository, mockPublisher);
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const paymentData = {
        orderId: 'order-123',
        amount: 1000,
        currency: 'INR',
      };

      const gatewayResponse = {
        id: 'gateway-payment-123',
        amount: 1000,
        currency: 'INR',
      };

      mockGateway.createPayment.mockResolvedValue(gatewayResponse);
      mockRepository.create.mockResolvedValue(
        createTestPayment({
          orderId: paymentData.orderId,
          amount: paymentData.amount,
        }),
      );

      const result = await paymentService.createPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.orderId).toBe(paymentData.orderId);
      expect(result.amount).toBe(paymentData.amount);
      expect(mockGateway.createPayment).toHaveBeenCalledWith(paymentData);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw error if gateway fails', async () => {
      const paymentData = {
        orderId: 'order-123',
        amount: 1000,
      };

      mockGateway.createPayment.mockRejectedValue(new Error('Gateway error'));

      await expect(paymentService.createPayment(paymentData)).rejects.toThrow(
        ErrorCodes.PAYMENT_GATEWAY_ERROR,
      );
    });
  });

  // Add more tests for verifyPayment, refundPayment etc.
});
