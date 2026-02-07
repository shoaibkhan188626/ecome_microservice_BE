import Notification from "../entities/notification.js";
import emailService from "./email-service.js";
import smsService from "./sms-service.js";
import pushService from "./push-service.js";
import { createLogger, DateHelper } from "@ecommerce/common";
import config from "../../config/index.js";

const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isProduction,
);

class NotificationService {
  async sendNotification(notificationData) {
    try {
      const {
        userId,
        recipient,
        type,
        channel,
        templateName,
        subject,
        message,
        metadata,
        priority,
        scheduledFor,
      } = notificationData;

      const notification = new Notification({
        userId,
        recipient,
        type,
        channel,
        subject,
        message,
        templateId: templateName,
        metadata: metadata || {},
        priority: priority || "normal",
        scheduledFor,
        status: "pending",
        maxRetries: config.notification.maxRetryAttempts,
        expiresAt: DateHelper.addDays(new Date(), 30),
      });

      await notification.save();

      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        logger.info(`Notification scheduled for ${scheduledFor}`);
        return notification;
      }

      await this.processNotification(notification);
      return notification;
    } catch (error) {
      logger.error("Send notification error:", error);
      throw error;
    }
  }

  async processNotification(notification) {
    try {
      let result;
      switch (notification.channel) {
        case "email":
          result = await this.sendEmailNotification(notification);
          break;
        case "sms":
          result = await this.sendSMSNotification(notification);
          break;
        case "push":
          result = await this.sendPushNotificationHandler(notification);
          break;
        default:
          throw new Error(`Unsupported channel: ${notification.channel}`);
      }

      await notification.markAsSent(result.id, result);
    } catch (error) {
      await this.handleNotificationFailure(notification, error);
    }
  }

  async sendEmailNotification(notification) {
    try {
      if (!notification.recipient.email) throw new Error("Email not provided");
      let result;
      if (notification.templateId) {
        result = await emailService.sendTemplateEmail(
          notification.recipient.email,
          notification.templateId,
          notification.metadata,
        );
      } else {
        result = await emailService.sendEmail(
          notification.recipient.email,
          notification.subject,
          notification.html || notification.message,
          notification.message,
        );
      }
      return { id: result.messageId, provider: "nodemailer", response: result };
    } catch (error) {
      throw error;
    }
  }

  async sendSMSNotification(notification) {
    try {
      if (!notification.recipient.phone)
        throw new Error("Phone number not provided");
      if (!smsService.isAvailable())
        throw new Error("SMS service not configured");

      const result = await smsService.sendSMS(
        notification.recipient.phone,
        notification.message,
      );

      return {
        id: result.ref, // CHANGED: Fonoster uses 'ref', not 'sid'
        provider: "fonoster", // CHANGED: provider is fonoster
        response: result,
      };
    } catch (error) {
      throw error;
    }
  }

  async sendPushNotificationHandler(notification) {
    try {
      if (!notification.recipient.deviceToken)
        throw new Error("Device token not provided");
      if (!pushService.isAvailable())
        throw new Error("Push service not configured");
      const result = await pushService.sendPushNotification(
        notification.recipient.deviceToken,
        {
          title: notification.subject,
          body: notification.message,
          data: notification.metadata,
        },
      );
      return { id: result.messageId, provider: "firebase", response: result };
    } catch (error) {
      throw error;
    }
  }

  async handleNotificationFailure(notification, error) {
    logger.error(`Notification failed: ${notification._id}`, error);
    if (notification.retryCount < notification.maxRetries) {
      await notification.incrementRetry();
      const retryDelay =
        config.notification.retryDelay * Math.pow(2, notification.retryCount);
      setTimeout(async () => {
        logger.info(
          `Retrying notification: ${notification._id} (Attempt ${notification.retryCount})`,
        );
        await this.processNotification(notification);
      }, retryDelay);
    } else {
      await notification.markAsFailed(error.message);
    }
  }

  async getUserNotifications(userId, options = {}) {
    try {
      return await Notification.findByUser(userId, options);
    } catch (error) {
      logger.error("Get user notifications error:", error);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });

      if (!notification) {
        throw new Error("Notification not found");
      }

      notification.readAt = new Date();
      await notification.save();

      return notification;
    } catch (error) {
      logger.error("Mark as read error:", error);
      throw error;
    }
  }

  async retryFailedNotifications() {
    try {
      const failedNotifications = await Notification.findForRetry(
        config.notification.maxRetryAttempts
      );
      logger.info(
        `Retrying ${failedNotifications.length} failed notifications`,
      );
      for (const notification of failedNotifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      logger.error("Retry failed notifications error:", error);
    }
  }
}

export default new NotificationService();
