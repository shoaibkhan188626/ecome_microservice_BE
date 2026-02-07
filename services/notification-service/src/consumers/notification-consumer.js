import { RabbitMQClient, createLogger } from "@ecommerce/common";
import config from "../config/index.js";
import notificationService from "../domain/services/notification-service.js";

const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isDevelopment,
);

/**
 * Notification consumer
 * listens to RabbitMQ exchanges and routes to notification service
 */

class NotificationConsumer {
  constructor() {
    this.rabbitmq = new RabbitMQClient(logger);
  }

  async start() {
    try {
      await this.rabbitmq.connect(config.rabbitmqUrl);

      // 1. Listen for user events (welcome, reset password)
      await this.rabbitmq.consumeMessages(
        "notification.user.queue",
        "user.events",
        "user.#",
        this.handleUserEvents.bind(this),
      );

      // 2. Listen for order events (confirmed, shipped, cancelled)
      await this.rabbitmq.consumeMessages(
        "notification.order.queue",
        "order.events",
        "order.#",
        this.handleOrderEvents.bind(this),
      );

      // 3. Listen for inventory events (Low Stock)
      await this.rabbitmq.consumeMessages(
        "notification.inventory.queue",
        "inventory.events",
        "inventory.low_stock",
        this.handleInventoryEvents.bind(this),
      );

      logger.info(`Notification Consumer started and listening...`);
    } catch (error) {
      setTimeout(() => this.start(), 5000);
    }
  }

  /**
   * Handle Auth/User Events
   */

  async handleUserEvents(data) {
    const { type, user } = data;
    logger.info(`Received user event: ${type} for ${user.email}`);

    switch (type) {
      case "user.registered":
        await notificationService.sendNotification({
          userId: user.id,
          recipient: { email: user.email, phone: user.phone },
          type: "welcome",
          channel: "email",
          templateName: "welcome",
          metadata: {
            firstName: user.firstName,
            dashboardUrl: "https://ecommerce.com/dashboard",
          },
        });
        break;

      case "user.password_reset_requested":
        await notificationService.sendNotification({
          userId: user.id,
          recipient: { email: user.email },
          type: "password_reset",
          channel: "email",
          templateName: "passwordReset",
          metadata: { firstName: user.firstName, resetUrl: data.resetUrl },
        });
        break;
    }
  }

  /**
   * Handle Order Events
   */

  async handleOrderEvents(data) {
    const { type, order } = data;
    logger.info(
      `Received order event: ${type} for Order #${order.orderNumber}`,
    );

    const recipient = {
      email: order.shippingAddress.email || data.userEmail,
      phone: order.shippingAddress.phone,
    };

    switch (type) {
      case "order.created":
        //Send Email Confirmation
        await notificationService.sendNotification({
          userId: order.userId,
          recipient,
          type: "order_confirmation",
          channel: "email",
          templateName: "orderConfirmation",
          metadata: {
            customerName: order.shippingAddress.fullName,
            orderNumber: order.orderNumber,
            total: order.total,
            items: order.items,
            trackingUrl: `https://ecommerce.com/orders/${order.orderNumber}`,
          },
        });
        break;

      case "order.shipped":
        // Send SMS + Email for shipping notification
        const trackingUrl = `https://ecommerce.com/orders/${order.orderNumber}/track`;
        if (recipient.phone) {
          await notificationService.sendNotification({
            userId: order.userId,
            recipient,
            type: "order_shipped",
            channel: "sms",
            message: `Order ${order.orderNumber} has shipped! Track: ${trackingUrl}`,
            metadata: {
              orderNumber: order.orderNumber,
              trackingNumber: order.trackingNumber,
              trackingUrl,
            },
          });
        }
        if (recipient.email) {
          await notificationService.sendNotification({
            userId: order.userId,
            recipient,
            type: "order_shipped",
            channel: "email",
            templateName: "orderShipped",
            metadata: {
              customerName: order.shippingAddress?.fullName || "Customer",
              orderNumber: order.orderNumber,
              trackingNumber: order.trackingNumber,
              trackingUrl,
              carrier: order.carrier,
              estimatedDelivery: order.estimatedDelivery,
            },
          });
        }
        break;
    }
  }

  /**
   * Handle inventory event
   */
  async handleInventoryEvents(data) {
    const { sku, currentQuantity, threshold } = data;
    logger.warn(`LOW STOCK ALERT: ${sku} is at ${currentQuantity}`);

    const adminEmail = process.env.ADMIN_EMAIL || "admin@ecommerce.com";

    await notificationService.sendNotification({
      type: "low_stock_alert",
      channel: "email",
      recipient: { email: adminEmail },
      subject: `Low Stock Alert: ${sku}`,
      message: `Product ${sku} is running low. Current stock: ${currentQuantity}. Threshold: ${threshold}`,
      metadata: { sku, currentQuantity, threshold },
    });
  }

  async stop() {
    await this.rabbitmq.disconnect();
  }
}

export default new NotificationConsumer();
