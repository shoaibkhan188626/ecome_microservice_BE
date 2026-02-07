import nodemailer from "nodemailer";
import { createLogger } from "@ecommerce/common";
import config from "../../config/index.js";
import { emailTemplates } from "../../templates/email-templates.js";

const logger = createLogger(
  "notification-service",
  config.logLevel,
  config.isProduction,
);

/**
 * Email service using nodemailer
 * supports SMTP providers (Gmail, sendGrid, AWS SES, etc)
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  /**
   * initialize SMTP transporter
   */

  initialize() {
    try {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });

      logger.info("Email service initialized");
    } catch (error) {
      logger.error("Email service initialization failed:", error);
    }
  }

  /**
   * Send email using template
   * @param {String} to - Recipient email
   * @param {String} templateName - Template name from emailTemplates
   * @param {Object} data - Template data
   * @returns {Promise<Object>}
   */

  async sendTemplateEmail(to, templateName, data = {}) {
    try {
      const template = emailTemplates[templateName];

      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      const { subject, html, text } = template(data);

      return await this.sendEmail(to, subject, html, text);
    } catch (error) {
      logger.error("Send template email error:", error);
      throw error;
    }
  }

  /**
   * Send custom email
   * @param {String} to - Recipient email
   * @param {String} subject - Email subject
   * @param {String} html - HTML content
   * @param {String} text - plain text content
   * @returns {Promise<Object>}
   */

  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter) {
        throw new Error("Email transporter not initialized");
      }

      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent to ${to}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      logger.error("Send email error:", error);
      throw error;
    }
  }

  /**
   * Send bulk emails (with rate limiting)
   * @param {Array} recipients - Array of {email,templateName,data}
   * @returns {Promise<Object>}
   */

  async sendBulkEmail(recipients) {
    const results = {
      success: [],
      failed: [],
    };

    for (const recipient of recipients) {
      try {
        const result = await this.sendTemplateEmail(
          recipient.email,
          recipient.templateName,
          recipient.data,
        );

        results.success.push({
          email: recipient.email,
          messageId: result.messageId,
        });

        //Rate limiting - wait 100ms between emails
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        results.failed.push({
          email: recipient.email,
          error: error.message,
        });
      }
    }
    logger.info(
      `Bulk email sent: ${results.success.length} success, ${results.failed.length} failed`,
    );
    return results;
  }

  /**
   * Verify email configuration
   * @returns {Promise<Boolean>}
   */

  async verifyConnected() {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      logger.info("Email configuration verified");
      return true;
    } catch (error) {
      logger.error("Email verification failed", error);
      return false;
    }
  }

  /**
   * Strip HTML tags for plain text version
   * @param {String} html,
   * @returns {String}
   */

  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export default new EmailService();
