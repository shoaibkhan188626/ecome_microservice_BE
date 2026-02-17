import { Router } from 'express';
import { asyncHandler } from '@ecommerce/common';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        service: 'payment-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  }),
);

export default router;
