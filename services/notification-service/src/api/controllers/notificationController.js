import notificationService from "../../domain/services/notificationService.js";
import { ResponseHandler } from "@ecommerce/common";

class NotificationController {
  async sendCustom(req, res) {
    const notification = await notificationService.sendNotification(req.body);
    return ResponseHandler.success(res, notification, 201);
  }

  async getMyNotification(req, res) {
    const notification = await notificationService.getUserNotifications(
      req.user.id,
      req.query,
    );
    return ResponseHandler.success(res, notification);
  }
}

export default new NotificationController();
