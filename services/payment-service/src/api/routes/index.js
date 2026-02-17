import { Router } from 'express';
import paymentRoutes from './payment-routes.js';
import healthRoutes from './health-routes.js';

const router = Router();

// Health check (no auth required)
router.use('/health', healthRoutes);

// API routes
router.use('/payments', paymentRoutes);

export default router;
