// src/services/sms.ts
// Twilio SMS Service — calls Firebase Cloud Functions
// Usage: import { sendSMS } from '../services/sms';

import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

// ============ TYPES ============

interface SendSMSRequest {
  recipientId?: string;   // Look up phone from Firestore user doc
  phoneNumber?: string;   // Or provide phone number directly
  message: string;
}

interface SendSMSResponse {
  success: boolean;
  messageSid?: string;
}

// ============ CLOUD FUNCTION REFERENCE ============

const sendSMSNotificationFn = httpsCallable<SendSMSRequest, SendSMSResponse>(
  functions,
  'sendSMSNotification'
);

// ============ PUBLIC API ============

/**
 * Send an SMS to a user by their Firestore user ID.
 * The Cloud Function looks up their phone number.
 */
export const sendSMSToUser = async (
  recipientId: string,
  message: string
): Promise<SendSMSResponse> => {
  try {
    const result = await sendSMSNotificationFn({ recipientId, message });
    return result.data;
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { success: false };
  }
};

/**
 * Send an SMS to a specific phone number.
 * Phone must be in E.164 format: +1XXXXXXXXXX
 */
export const sendSMSToPhone = async (
  phoneNumber: string,
  message: string
): Promise<SendSMSResponse> => {
  try {
    const result = await sendSMSNotificationFn({ phoneNumber, message });
    return result.data;
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { success: false };
  }
};

// ============ TEMPLATES ============

/**
 * Pre-built SMS templates for common notifications.
 * Keep messages concise — SMS segments are 160 chars.
 */
export const smsTemplates = {
  invoiceSent: (invoiceNumber: string, amount: string, payUrl?: string) =>
    `Care Construction: Invoice ${invoiceNumber} (${amount}) is ready.${payUrl ? `\nPay here: ${payUrl}` : ''}`,

  invoicePaid: (invoiceNumber: string, amount: string) =>
    `Care Construction: Payment of ${amount} received for Invoice ${invoiceNumber}. Thank you!`,

  projectUpdate: (projectTitle: string, status: string) =>
    `Care Construction: "${projectTitle}" status updated to ${status}.`,

  milestoneCompleted: (projectTitle: string, milestone: string) =>
    `Care Construction: Milestone "${milestone}" completed on "${projectTitle}".`,

  appointmentReminder: (date: string, time: string, location?: string) =>
    `Care Construction: Reminder — appointment on ${date} at ${time}${location ? ` at ${location}` : ''}.`,

  custom: (message: string) =>
    `Care Construction: ${message}`,
};