// src/types/notification.ts
// Comprehensive notification types for the Care General Construction Portal

export enum NotificationCategory {
  PROJECT = 'project',
  MESSAGE = 'message',
  INVOICE = 'invoice',
  MILESTONE = 'milestone',
  DOCUMENT = 'document',
  CALENDAR = 'calendar',
  SYSTEM = 'system',
}

export enum NotificationAction {
  // Project actions
  PROJECT_CREATED = 'project_created',
  PROJECT_STATUS_CHANGED = 'project_status_changed',
  PROJECT_UPDATE_ADDED = 'project_update_added',
  PROJECT_ASSIGNED = 'project_assigned',
  PROJECT_APPROVED = 'project_approved',
  PROJECT_REJECTED = 'project_rejected',

  // Message actions
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_MENTION = 'message_mention',

  // Invoice actions
  INVOICE_CREATED = 'invoice_created',
  INVOICE_SENT = 'invoice_sent',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_OVERDUE = 'invoice_overdue',
  INVOICE_PARTIALLY_PAID = 'invoice_partially_paid',

  // Milestone actions
  MILESTONE_COMPLETED = 'milestone_completed',
  MILESTONE_COMMENT = 'milestone_comment',
  MILESTONE_DUE_SOON = 'milestone_due_soon',

  // Document actions
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_SHARED = 'document_shared',

  // Calendar actions
  EVENT_CREATED = 'event_created',
  EVENT_REMINDER = 'event_reminder',
  EVENT_UPDATED = 'event_updated',

  // System actions
  WELCOME = 'welcome',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  /** The user who receives this notification */
  recipientId: string;
  /** The user who triggered this notification (optional for system notifications) */
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;

  /** Notification content */
  title: string;
  message: string;
  category: NotificationCategory;
  action: NotificationAction;
  priority: NotificationPriority;

  /** Navigation context — what to open when clicked */
  link?: {
    view: string; // e.g. 'project-details', 'messages', 'invoices'
    entityId?: string; // e.g. projectId, invoiceId
    secondaryId?: string; // e.g. milestoneId within a project
  };

  /** State */
  isRead: boolean;
  isArchived: boolean;
  isEmailSent: boolean;
  isSmsSent: boolean;

  /** Twilio message SID (set by Cloud Function after successful send) */
  smsSid?: string;

  /** Timestamps (ISO strings) */
  createdAt: string;
  readAt?: string;
}

/** Data required to create a new notification (id + timestamps auto-generated) */
export type CreateNotificationData = Omit<
  AppNotification,
  'id' | 'isRead' | 'isArchived' | 'isEmailSent' | 'isSmsSent' | 'smsSid' | 'createdAt' | 'readAt'
>;

// ============ EMAIL PREFERENCES ============

/** Email notification preferences per user (stored in users collection) */
export interface EmailNotificationPreferences {
  enabled: boolean;
  /** Which categories trigger emails */
  categories: {
    [key in NotificationCategory]: boolean;
  };
  /** Digest mode: 'instant' sends immediately, 'daily' batches into a daily email */
  digestMode: 'instant' | 'daily';
  /** Quiet hours — no emails during this window */
  quietHours?: {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number; // 0-23
    timezone: string;
  };
}

/** Default email preferences for new users */
export const DEFAULT_EMAIL_PREFERENCES: EmailNotificationPreferences = {
  enabled: true,
  categories: {
    [NotificationCategory.PROJECT]: true,
    [NotificationCategory.MESSAGE]: true,
    [NotificationCategory.INVOICE]: true,
    [NotificationCategory.MILESTONE]: true,
    [NotificationCategory.DOCUMENT]: false,
    [NotificationCategory.CALENDAR]: true,
    [NotificationCategory.SYSTEM]: true,
  },
  digestMode: 'instant',
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 7,
    timezone: 'America/New_York',
  },
};

// ============ SMS PREFERENCES ============

/** SMS notification preferences per user (stored in users collection) */
export interface SMSNotificationPreferences {
  enabled: boolean;
  /** Which categories trigger SMS */
  categories: {
    [key in NotificationCategory]: boolean;
  };
  /** Quiet hours — no SMS during this window */
  quietHours?: {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number; // 0-23
    timezone: string;
  };
}

/** Default SMS preferences for new users — opt-in by default (SMS costs per message) */
export const DEFAULT_SMS_PREFERENCES: SMSNotificationPreferences = {
  enabled: false,
  categories: {
    [NotificationCategory.PROJECT]: true,
    [NotificationCategory.MESSAGE]: false, // Too noisy for SMS
    [NotificationCategory.INVOICE]: true,
    [NotificationCategory.MILESTONE]: true,
    [NotificationCategory.DOCUMENT]: false,
    [NotificationCategory.CALENDAR]: true,
    [NotificationCategory.SYSTEM]: true,
  },
  quietHours: {
    enabled: true,
    startHour: 21,
    endHour: 8,
    timezone: 'America/New_York',
  },
};