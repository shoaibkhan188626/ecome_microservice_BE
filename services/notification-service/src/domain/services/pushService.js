import axios from "axios";
import { createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isProduction,
);

class PushService {
  constructor() {
    this.serverKey = config.push.firebaseServerKey;
    this.fcmUrl = "https://fcm.googleapis.com/fcm/send";
  }

  async sendPushNotification(deviceToken, notification) {
    try {
      if (!this.serverKey)
        return { success: false, message: "FCM Key missing" };

      const payload = {
        to: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          sound: "default",
        },
        data: notification.data || {},
        priority: "high",
      };

      const response = await axios.post(this.fcmUrl, payload, {
        headers: {
          Authorization: `key=${this.serverKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success === 1) {
        return {
          success: true,
          messageId: response.data.results[0].message_id,
        };
      }
      throw new Error(response.data.results[0].error);
    } catch (error) {
      logger.error("FCM Push error:", error.message);
      throw error;
    }
  }
}

export default new PushService();
