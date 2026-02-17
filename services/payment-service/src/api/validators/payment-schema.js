import Joi from 'joi';

export const createPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().default('INR'),
  description: Joi.string(),
  metadata: Joi.object(),
}).required();

export const verifyPayment = Joi.object({
  paymentId: Joi.string().required(),
  orderId: Joi.string().required(),
  signature: Joi.string().required(),
}).required();

export const refundPaymentSchema = Joi.object({
  paymentId: Joi.string().required(),
  amount: Joi.number().positive(),
  reason: Joi.string().required(),
}).required();
