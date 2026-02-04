import { ResponseHandler } from "@ecommerce/common";

const sendNotificationSchema = {
  required: ["channel", "recipient"],
  channel: ["email", "sms", "push"],
  recipient: (r) => r && (r.email || r.phone || r.deviceToken),
};

export const validateSendNotification = (req, res, next) => {
  const { channel, recipient, type, message, subject, templateName } = req.body;

  if (!channel || !sendNotificationSchema.channel.includes(channel)) {
    return ResponseHandler.error(
      res,
      "VALIDATION_ERROR",
      "Invalid or missing channel. Must be: email, sms, or push",
      400
    );
  }

  if (!recipient || typeof recipient !== "object") {
    return ResponseHandler.error(
      res,
      "VALIDATION_ERROR",
      "Recipient object required with email, phone, or deviceToken",
      400
    );
  }

  const hasRecipient =
    (channel === "email" && recipient.email) ||
    (channel === "sms" && recipient.phone) ||
    (channel === "push" && recipient.deviceToken);

  if (!hasRecipient) {
    return ResponseHandler.error(
      res,
      "VALIDATION_ERROR",
      `Recipient must have ${channel === "email" ? "email" : channel === "sms" ? "phone" : "deviceToken"} for ${channel} channel`,
      400
    );
  }

  if (channel === "email" && !templateName && !message && !subject) {
    return ResponseHandler.error(
      res,
      "VALIDATION_ERROR",
      "Email requires subject and message (or templateName)",
      400
    );
  }

  if ((channel === "sms" || channel === "push") && !message && !templateName) {
    return ResponseHandler.error(
      res,
      "VALIDATION_ERROR",
      "SMS and Push require message",
      400
    );
  }

  next();
};
