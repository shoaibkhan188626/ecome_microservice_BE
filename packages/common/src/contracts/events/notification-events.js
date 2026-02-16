import { createEvent } from './base-event.js';
import { EventTypes } from '../../constants/event-types.js';

export function createSendEmailEvent(emailData, metadata = {}) {
  return createEvent(
    EventTypes.NOTIFICATION_SEND_EMAIL,
    {
      to: emailData.to,
      subject: emailData.subject,
      template: emailData.template,
      templateData: emailData.templateData || {},
    },
    { source: metadata.source || 'unknown', ...metadata }
  );
}

export function createSendSmsEvent(smsData, metadata = {}) {
  return createEvent(
    EventTypes.NOTIFICATION_SEND_SMS,
    {
      to: smsData.to,
      message: smsData.message,
      template: smsData.template,
      templateData: smsData.templateData || {},
    },
    { source: metadata.source || 'unknown', ...metadata }
  );
}
