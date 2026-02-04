import { createLogger } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isProduction,
);

/**
 * push notification service
 * firebase cloud messaging (FCM) implementation
 * can be extended for APNS (Apple), OneSignal etc
 */

class PushService {
  constructor() {
    this.serverKey = config.push.firebaseServerKey;
    this.fcmUrl = "https://fcm.googleapis.com/fcm/send";
  }

  /**
   * Send push notification via FCM
   * @param {String} deviceToken - FCM device token
   * @param {Object} notification - {title, body,data}
   * @returns {Promise<Object>}
   */

  async sendPushNotification(deviceToken, notification) {
    try {
      if (!this.serverKey) {
        logger.warn("Push notification service not configured");
        return { success: false, message: "Service not configured" };
      }

      const payload = {
        to: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          sound: "default",
          badge: "1",
        },
        data: notification.data || {},
        priority: "high",
      };

      const response = await fetch(this.fcmUrl, {
        method: "POST",
        header: {
          "Content-Type": "application/json",
          Authorization: `key=${this.serverKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success === 1) {
        logger.info(`Push notification sent to ${deviceToken}`);

        return {
          success: true,
          messageId: result.results[0].message_id,
        };
      } else {
        throw new Error(result.results[0].error || "Unknown error");
      }
    } catch (error) {
      logger.error("Send push notification error:", error);
      throw error;
    }
  }

  /**
   * Send bulk push notification
   * @param {Array} recipients - Array of {deviceToken, notification}
   * @returns {Promise<Object>}
   */

  async sendBulkPushNotifications(recipients) {
    const results = {
      success: [],
      failed: [],
    };

    for (const recipient of recipients) {
      try {
        const result = await this.sendPushNotification(
          recipient.deviceToken,
          recipient.notification,
        );

        results.success.push({
          deviceToken: recipient.deviceToken,
          messageId: result.messageId,
        });
      } catch (error) {
        results.failed.push({
          deviceToken: recipient.deviceToken,
          error: error.message,
        });
      }
    }
    return results;
  }

  /**
   * Send topic-based notification (to all subscribers)
   * @param {String} topic - topic name
   * @param {Object} notification - Notification payload
   * @returns {Promise<Object>}
   */

  async sendToTopic(topic, notification) {
    try {
      if (!this.serverKey) {
        throw new Error("Push service not configured");
      }

      const payload = {
        to: `/topics/${topic}`,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
      };

      const response = await fetch(this.fcmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key=${this.serverKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      logger.info(`Push notification sent to topic: ${topic}`);

      return {
        success: true,
        messageId: result.message_id,
      };
    } catch (error) {
      logger.error("Send topic notification error:", error);
      throw error;
    }
  }

  /**
   * Check if push service is available
   * @returns {Boolean}
   */

  isAvailable() {
    return !!this.serverKey;
  }
}

export default new PushService();
