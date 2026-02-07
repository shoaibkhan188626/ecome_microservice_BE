import express from "express";
import notificationController from "../controllers/notification-controller.js";
import { asyncHandler } from "@ecommerce/common";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateSendNotification } from "../middlewares/validate.js";

const router = express.Router();

/**
 * POST /api/notifications/send - Send custom notification (Admin only)
 */
router.post(
  "/send",
  authenticate,
  authorize("admin"),
  validateSendNotification,
  asyncHandler(notificationController.sendCustom.bind(notificationController))
);

/**
 * GET /api/notifications/my - Get current user's notifications
 */
router.get(
  "/my",
  authenticate,
  asyncHandler(notificationController.getMyNotifications.bind(notificationController))
);

/**
 * PATCH /api/notifications/:id/read - Mark notification as read
 */
router.patch(
  "/:id/read",
  authenticate,
  asyncHandler(notificationController.markAsRead.bind(notificationController))
);

/**
 * POST /api/notifications/retry-failed - Retry failed notifications (Admin only)
 */
router.post(
  "/retry-failed",
  authenticate,
  authorize("admin"),
  asyncHandler(notificationController.retryFailed.bind(notificationController))
);

export default router;
