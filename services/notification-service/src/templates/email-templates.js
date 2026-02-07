/**
 * Email Templates
 * Reusable HTML email templates
 */

export const emailTemplates = {
  /**
   * Welcome Email
   */
  welcome: (data) => ({
    subject: `Welcome to ${data.platformName || "Our Platform"}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome ${data.firstName}! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>Thank you for joining us! We're excited to have you on board.</p>
            <p>Your account has been successfully created. You can now start shopping!</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} E-commerce Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome ${data.firstName}! Thank you for joining us.`,
  }),

  /**
   * Order Confirmation
   */
  orderConfirmation: (data) => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-details { background: white; padding: 15px; margin: 20px 0; border: 1px solid #ddd; }
          .item { border-bottom: 1px solid #eee; padding: 10px 0; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
          .button { display: inline-block; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! ✓</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Thank you for your order! We've received it and will process it shortly.</p>
            
            <div class="order-details">
              <h3>Order #${data.orderNumber}</h3>
              <p><strong>Order Date:</strong> ${data.orderDate ? new Date(data.orderDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
              <p><strong>Total:</strong> $${(data.total ?? 0).toFixed(2)}</p>
              
              <h4>Items:</h4>
              ${(data.items || [])
                .map(
                  (item) => `
                <div class="item">
                  <strong>${item.name || "Item"}</strong><br>
                  Qty: ${item.quantity || 1} × $${(item.price ?? 0).toFixed(2)} = $${((item.quantity || 1) * (item.price ?? 0)).toFixed(2)}
                </div>
              `,
                )
                .join("")}
              
              <div class="total">
                Total: $${data.total.toFixed(2)}
              </div>
            </div>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${data.trackingUrl}" class="button">Track Your Order</a>
            </p>
          </div>
          <div class="footer">
            <p>Questions? Contact us at support@ecommerce.com</p>
            <p>&copy; ${new Date().getFullYear()} E-commerce Platform</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Order ${data.orderNumber} confirmed! Total: $${(data.total ?? 0).toFixed(2)}`,
  }),

  /**
   * Order Shipped
   */
  orderShipped: (data) => ({
    subject: `Your Order Has Shipped! - ${data.orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .tracking { background: white; padding: 20px; margin: 20px 0; border: 2px solid #FF9800; text-align: center; }
          .tracking-number { font-size: 24px; font-weight: bold; color: #FF9800; margin: 10px 0; }
          .button { display: inline-block; padding: 10px 20px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📦 Your Order is on its Way!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Great news! Your order has been shipped and is on its way to you.</p>
            
            <div class="tracking">
              <h3>Tracking Information</h3>
              <p>Order: ${data.orderNumber}</p>
              <div class="tracking-number">${data.trackingNumber}</div>
              <p>Carrier: ${data.carrier || "Standard Shipping"}</p>
              <p>Estimated Delivery: ${data.estimatedDelivery || "3-5 business days"}</p>
            </div>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${data.trackingUrl}" class="button">Track Package</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} E-commerce Platform</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your order ${data.orderNumber} has shipped! Tracking: ${data.trackingNumber}`,
  }),

  /**
   * Password Reset
   */
  passwordReset: (data) => ({
    subject: "Password Reset Request",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; }
          .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              This link will expire in ${data.expiryMinutes || 60} minutes.<br>
              If you didn't request this, please ignore this email.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} E-commerce Platform</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Reset your password: ${data.resetUrl}`,
  }),
};
