import Joi from 'joi';

export const configSchema = Joi.object({
  // Required Environment Variables
  PORT: Joi.number().port().required().messages({
    'any.required': 'PORT is required',
    'number.port': 'PORT must be a valid port number',
  }),

  MONGODB_URI: Joi.string().uri().required().messages({
    'any.required': 'MONGODB_URI is required',
    'string.uri': 'MONGODB_URI must be a valid URI',
  }),

  // Optional with defaults
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'silent').default('info'),

  REDIS_URL: Joi.string().uri().required().messages({
    'any.required': 'REDIS_URL is required',
    'string.uri': 'REDIS_URL must be a valid URI',
  }),

  RABBITMQ_URL: Joi.string().uri().required().messages({
    'any.required': 'RABBITMQ_URL is required',
    'string.uri': 'RABBITMQ_URL must be a valid URI',
  }),

  ALLOWED_ORIGINS: Joi.alternatives()
    .try(Joi.string().valid('*'), Joi.array().items(Joi.string().uri()))
    .default('*'),

  // Payment Gateway Config
  RAZORPAY_KEY_ID: Joi.string().required().messages({
    'any.required': 'RAZORPAY_KEY_ID is required',
  }),

  RAZORPAY_KEY_SECRET: Joi.string().required().messages({
    'any.required': 'RAZORPAY_KEY_SECRET is required',
  }),

  RAZORPAY_WEBHOOK_SECRET: Joi.string().required().messages({
    'any.required': 'RAZORPAY_WEBHOOK_SECRET is required',
  }),

  // Stripe (Optional)
  STRIPE_SECRET_KEY: Joi.string().optional(),

  STRIPE_WEBHOOK_SECRET: Joi.string().when('STRIPE_SECRET_KEY', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  STRIPE_PUBLISHABLE_KEY: Joi.string().when('STRIPE_SECRET_KEY', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  DEFAULT_CURRENCY: Joi.string().default('INR'),

  DEFAULT_PROVIDER: Joi.string().valid('razorpay', 'stripe').default('razorpay'),
}).unknown(false);
