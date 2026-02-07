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
    this.fcmLegacyUrl = "https://fcm.googleapis.com/fcm/send";
    this.adminApp = null;
    this.initialized = false;
    this.initialize();
  }

  async initialize() {
    if (config.push.useV1Api && config.push.projectId && config.push.privateKey) {
      try {
        const { default: admin } = await import("firebase-admin");

        if (!admin.apps.length) {
          this.adminApp = admin.initializeApp({
            credential: admin.credential.cert({
              projectId: config.push.projectId,
              clientEmail: config.push.clientEmail,
              privateKey: config.push.privateKey,
            }),
          });
        } else {
          this.adminApp = admin.app();
        }
        this.initialized = true;
        logger.info("Firebase Admin SDK initialized (FCM v1 API)");
      } catch (error) {
        logger.warn("Firebase Admin init failed, falling back to legacy:", error.message);
      }
    }
  }

  isAvailable() {
    return !!(this.initialized || this.serverKey);
  }

  async sendPushNotification(deviceToken, notification) {
    try {
      if (this.initialized && this.adminApp) {
        return await this.sendViaV1(deviceToken, notification);
      }
      if (this.serverKey) {
        return await this.sendViaLegacy(deviceToken, notification);
      }
      logger.warn("Push service not configured - no FCM key or Admin SDK");
      return { success: false, message: "FCM not configured" };
    } catch (error) {
      logger.error("FCM Push error:", error.message);
      throw error;
    }
  }

  async sendViaV1(deviceToken, notification) {
    const { getMessaging } = await import("firebase-admin/messaging");
    const messaging = getMessaging(this.adminApp);

    const message = {
      token: deviceToken,
      notification: {
        title: notification.title || "Notification",
        body: notification.body || "",
      },
      data: notification.data || {},
      android: {
        priority: "high",
        notification: {
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
        fcmOptions: {},
      },
    };

    const messageId = await messaging.send(message);
    return {
      success: true,
      messageId,
      provider: "firebase-v1",
    };
  }

  async sendViaLegacy(deviceToken, notification) {
    const payload = {
      to: deviceToken,
      notification: {
        title: notification.title || "Notification",
        body: notification.body || "",
        sound: "default",
      },
      data: notification.data || {},
      priority: "high",
    };

    const response = await axios.post(this.fcmLegacyUrl, payload, {
      headers: {
        Authorization: `key=${this.serverKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data.success === 1) {
      return {
        success: true,
        messageId: response.data.results[0].message_id,
        provider: "firebase-legacy",
      };
    }
    const error = response.data.results?.[0]?.error || "Unknown FCM error";
    throw new Error(error);
  }
}

export default new PushService();
