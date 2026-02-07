import notificationService from "../../domain/services/notification-service.js";
import { ResponseHandler, createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isProduction,
);

class NotificationController {
  /**
   * Send a manual/custom notification
   * POST /api/notifications/send
   */
  async sendCustom(req, res) {
    try {
      const notification = await notificationService.sendNotification(req.body);
      return ResponseHandler.success(res, notification, 201);
    } catch (error) {
      logger.error("Manual notification failed:", error.message);
      return ResponseHandler.error(res, "SEND_FAILED", error.message, 400);
    }
  }

  /**
   * Get notification history for a user
   * GET /api/notifications/my
   */
  async getMyNotifications(req, res) {
    try {
      const userId = req.user?.id; // Assumes auth middleware is used
      if (!userId) {
        return ResponseHandler.error(
          res,
          "UNAUTHORIZED",
          "Authentication required",
          401,
        );
      }

      const notifications = await notificationService.getUserNotifications(
        userId,
        req.query,
      );
      return ResponseHandler.success(res, notifications);
    } catch (error) {
      logger.error("Fetch notifications failed:", error.message);
      return ResponseHandler.error(res, "FETCH_FAILED", error.message, 500);
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ResponseHandler.error(
          res,
          "UNAUTHORIZED",
          "Authentication required",
          401,
        );
      }

      const notification = await notificationService.markAsRead(
        req.params.id,
        userId,
      );
      return ResponseHandler.success(res, notification);
    } catch (error) {
      logger.error("Mark as read failed:", error.message);
      return ResponseHandler.error(res, "UPDATE_FAILED", error.message, 500);
    }
  }

  /**
   * Trigger a retry of failed notifications manually (Admin only)
   * POST /api/notifications/retry-failed
   */
  async retryFailed(req, res) {
    try {
      // Run in background
      notificationService.retryFailedNotifications();
      return ResponseHandler.success(res, {
        message: "Retry process initiated",
      });
    } catch (error) {
      return ResponseHandler.error(res, "RETRY_ERROR", error.message, 500);
    }
  }
}

export default new NotificationController();
