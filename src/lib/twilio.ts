/**
 * Twilio SMS Service for CareGenCon
 *
 * Wired to the existing Cloud Functions:
 *   - sendSms (sendSms.ts)        → Conversational SMS with conversation tracking
 *   - adminSendSMS (twilioAdmin.ts) → Quick admin send with audit log
 *   - getTwilioMessages (twilioAdmin.ts) → Twilio message history
 *   - getTwilioCalls (twilioAdmin.ts)    → Twilio call history
 *   - getConversationStats (statusCallback.ts) → Delivery stats
 *
 * Firestore collections used:
 *   - smsConversations → One doc per phone number thread
 *   - smsMessages      → Individual messages within conversations
 *   - smsLogs          → Audit trail for adminSendSMS
 */

import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { functions, db } from '../lib/firebase';

// ============ TYPES ============

// sendSms (conversational)
export interface SendSmsRequest {
  to: string;
  body: string;
  recipientUserId?: string;
  projectId?: string;
  conversationId?: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId: string;
  conversationId: string;
  twilioSid: string;
}

// adminSendSMS (quick send with audit)
export interface AdminSendSmsRequest {
  to: string;
  message: string;
  recipientName?: string;
}

export interface AdminSendSmsResult {
  success: boolean;
  messageSid: string;
  status: string;
}

// sendBulkSms
export interface BulkSmsRecipient {
  phone: string;
  name?: string;
}

export interface BulkSmsResult {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: { phone: string; success: boolean; error?: string }[];
}

// getTwilioMessages
export interface TwilioMessageRecord {
  sid: string;
  from: string;
  to: string;
  body: string;
  status: string;
  direction: string;
  dateSent: string;
  dateCreated: string;
  price: string;
  numSegments: string;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface TwilioMessagesResponse {
  messages: TwilioMessageRecord[];
  nextPageToken: string | null;
  previousPageToken: string | null;
  total: number;
}

// getTwilioCalls
export interface TwilioCallRecord {
  sid: string;
  from: string;
  to: string;
  status: string;
  direction: string;
  duration: string;
  startTime: string;
  endTime: string;
  price: string;
  callerName: string;
}

export interface TwilioCallsResponse {
  calls: TwilioCallRecord[];
  nextPageToken: string | null;
  previousPageToken: string | null;
  total: number;
}

// Conversation (Firestore doc shape)
export interface SmsConversation {
  id: string;
  participantPhone: string;
  portalUserId: string | null;
  portalUserName: string | null;
  twilioNumber: string;
  projectId: string | null;
  lastMessageAt: Timestamp | Date | any;
  lastMessagePreview: string;
  lastMessageDirection: 'inbound' | 'outbound';
  unreadCount: number;
  createdAt: Timestamp | Date | any;
  createdBy: string;
}

// SMS Message (Firestore doc shape)
export interface SmsMessage {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  body: string;
  twilioSid: string;
  status: string;
  sentBy: string | null;
  projectId: string | null;
  createdAt: Timestamp | Date | any;
  hasMedia?: boolean;
  media?: { url: string; contentType: string }[];
  error?: { code: string; message: string };
}

// Conversation stats
export interface ConversationStats {
  total: number;
  inbound: number;
  outbound: number;
  delivered: number;
  failed: number;
  pending: number;
}

// ============ CLOUD FUNCTION REFS ============

const sendSmsFn = httpsCallable<SendSmsRequest, SendSmsResult>(functions, 'sendSms');

const adminSendSmsFn = httpsCallable<AdminSendSmsRequest, AdminSendSmsResult>(
  functions,
  'adminSendSMS'
);

const sendBulkSmsFn = httpsCallable<
  { recipients: BulkSmsRecipient[]; body: string; projectId?: string },
  BulkSmsResult
>(functions, 'sendBulkSms');

const getTwilioMessagesFn = httpsCallable<any, TwilioMessagesResponse>(
  functions,
  'getTwilioMessages'
);

const getTwilioCallsFn = httpsCallable<any, TwilioCallsResponse>(
  functions,
  'getTwilioCalls'
);

const getConversationStatsFn = httpsCallable<
  { conversationId: string },
  ConversationStats
>(functions, 'getConversationStats');

// ============ CONVERSATIONAL SMS ============

/**
 * Send an SMS within the conversation model.
 * Creates or finds an smsConversation and stores the message in smsMessages.
 * This is the primary send function for two-way SMS in the Messaging panel.
 */
export async function sendConversationalSms(
  to: string,
  body: string,
  recipientUserId?: string,
  projectId?: string,
  conversationId?: string
): Promise<SendSmsResult> {
  try {
    const payload: SendSmsRequest = { to, body };
    if (recipientUserId) payload.recipientUserId = recipientUserId;
    if (projectId) payload.projectId = projectId;
    if (conversationId) payload.conversationId = conversationId;

    const result = await sendSmsFn(payload);
    return result.data;
  } catch (error: any) {
    console.error('[Twilio] sendConversationalSms failed:', error);
    throw new Error(error?.message || 'Failed to send SMS');
  }
}

// ============ ADMIN QUICK SEND ============

/**
 * Quick-send SMS as admin. Logged to smsLogs but not conversation-tracked.
 * Use sendConversationalSms instead for two-way messaging.
 */
export async function adminQuickSend(
  to: string,
  message: string,
  recipientName?: string
): Promise<AdminSendSmsResult> {
  try {
    const payload: AdminSendSmsRequest = { to, message };
    if (recipientName) payload.recipientName = recipientName;

    const result = await adminSendSmsFn(payload);
    return result.data;
  } catch (error: any) {
    console.error('[Twilio] adminQuickSend failed:', error);
    throw new Error(error?.message || 'Failed to send SMS');
  }
}

// ============ BULK SMS ============

export async function sendBulkSms(
  recipients: BulkSmsRecipient[],
  body: string,
  projectId?: string
): Promise<BulkSmsResult> {
  try {
    const payload: any = { recipients, body };
    if (projectId) payload.projectId = projectId;

    const result = await sendBulkSmsFn(payload);
    return result.data;
  } catch (error: any) {
    console.error('[Twilio] sendBulkSms failed:', error);
    throw new Error(error?.message || 'Failed to send bulk SMS');
  }
}

// ============ TWILIO HISTORY (admin-only) ============

export async function fetchTwilioMessages(params?: {
  pageSize?: number;
  pageToken?: string;
  dateSentAfter?: string;
  dateSentBefore?: string;
  direction?: string;
  searchPhone?: string;
}): Promise<TwilioMessagesResponse> {
  const result = await getTwilioMessagesFn(params || {});
  return result.data;
}

export async function fetchTwilioCalls(params?: {
  pageSize?: number;
  pageToken?: string;
  startTimeAfter?: string;
  startTimeBefore?: string;
  status?: string;
  searchPhone?: string;
}): Promise<TwilioCallsResponse> {
  const result = await getTwilioCallsFn(params || {});
  return result.data;
}

// ============ CONVERSATION STATS ============

export async function fetchConversationStats(
  conversationId: string
): Promise<ConversationStats> {
  const result = await getConversationStatsFn({ conversationId });
  return result.data;
}

// ============ REAL-TIME LISTENERS (Firestore) ============

/**
 * Subscribe to SMS conversations in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToConversations(
  callback: (conversations: SmsConversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'smsConversations'),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversations: SmsConversation[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SmsConversation[];
    callback(conversations);
  });
}

/**
 * Subscribe to messages within a specific conversation.
 * Returns an unsubscribe function.
 */
export function subscribeToConversationMessages(
  conversationId: string,
  callback: (messages: SmsMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'smsMessages'),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages: SmsMessage[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SmsMessage[];
    callback(messages);
  });
}

// ============ HELPERS ============

/**
 * Check if a user has a phone number on file.
 */
export function userHasPhone(user: { phone?: string }): boolean {
  return Boolean(user.phone?.trim());
}

/**
 * Format phone for display: +12125551234 → (212) 555-1234
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7);
    return `(${area}) ${prefix}-${line}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Normalize phone to E.164 format for sending.
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) cleaned = '+1' + cleaned;
    else if (cleaned.length === 11 && cleaned.startsWith('1')) cleaned = '+' + cleaned;
  }
  return cleaned;
}