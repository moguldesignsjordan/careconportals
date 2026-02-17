// src/services/notifications.ts
// Notification Service — Firebase Operations + Helper Creators

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  AppNotification,
  CreateNotificationData,
  NotificationCategory,
  NotificationAction,
} from '../types/notification';
import { User, UserRole, Project } from '../types';

// ============ CORE CRUD ============

/**
 * Subscribe to real-time notifications for a specific user.
 * Returns the most recent 50 unarchived notifications.
 */
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: AppNotification[]) => void
) => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('isArchived', '==', false),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as AppNotification)
      );
      callback(notifications);
    },
    (error) => {
      console.error('Error subscribing to notifications:', error);
      callback([]);
    }
  );
};

/**
 * Create a new notification in Firestore.
 * Returns the created notification's ID.
 */
export const createNotification = async (
  data: CreateNotificationData
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...data,
      isRead: false,
      isArchived: false,
      isEmailSent: false,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Send a notification to multiple recipients at once.
 */
export const createBulkNotifications = async (
  recipientIds: string[],
  data: Omit<CreateNotificationData, 'recipientId'>
): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  recipientIds.forEach((recipientId) => {
    const ref = doc(collection(db, 'notifications'));
    batch.set(ref, {
      ...data,
      recipientId,
      isRead: false,
      isArchived: false,
      isEmailSent: false,
      createdAt: now,
    });
  });

  await batch.commit();
};

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', notificationId), {
    isRead: true,
    readAt: new Date().toISOString(),
  });
};

/**
 * Mark all unread notifications as read for a user.
 */
export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('isRead', '==', false)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  snapshot.docs.forEach((d) => {
    batch.update(d.ref, { isRead: true, readAt: now });
  });

  await batch.commit();
};

/**
 * Archive a notification (soft delete — hides it from the bell).
 */
export const archiveNotification = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', notificationId), {
    isArchived: true,
  });
};

/**
 * Archive all notifications for a user.
 */
export const archiveAllNotifications = async (userId: string): Promise<void> => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('isArchived', '==', false)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, { isArchived: true });
  });

  await batch.commit();
};

/**
 * Permanently delete a notification.
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  await deleteDoc(doc(db, 'notifications', notificationId));
};

// ============ NOTIFICATION HELPER CREATORS ============
// Call these from your existing action handlers (e.g. after creating a project, sending a message, etc.)

/**
 * Notify relevant users when a new project is created.
 */
export const notifyProjectCreated = async (
  project: Project,
  creator: User,
  allUsers: User[]
) => {
  // Notify assigned clients and contractors (except the creator)
  const recipientIds = [
    ...(project.clientIds || [project.clientId]),
    ...(project.contractorIds || [project.contractorId]),
  ].filter((id) => id && id !== creator.id);

  if (recipientIds.length === 0) return;

  await createBulkNotifications(recipientIds, {
    senderId: creator.id,
    senderName: creator.name,
    title: 'New Project Assigned',
    message: `You've been assigned to "${project.title}"`,
    category: NotificationCategory.PROJECT,
    action: NotificationAction.PROJECT_CREATED,
    priority: 'normal',
    link: { view: 'project-details', entityId: project.id },
  });
};

/**
 * Notify when project status changes.
 */
export const notifyProjectStatusChanged = async (
  project: Project,
  newStatus: string,
  changedBy: User,
  allUsers: User[]
) => {
  const recipientIds = [
    ...(project.clientIds || [project.clientId]),
    ...(project.contractorIds || [project.contractorId]),
  ].filter((id) => id && id !== changedBy.id);

  // Also notify admins
  const adminIds = allUsers
    .filter((u) => u.role === UserRole.ADMIN && u.id !== changedBy.id)
    .map((u) => u.id);

  const allRecipients = [...new Set([...recipientIds, ...adminIds])];
  if (allRecipients.length === 0) return;

  await createBulkNotifications(allRecipients, {
    senderId: changedBy.id,
    senderName: changedBy.name,
    title: 'Project Status Updated',
    message: `"${project.title}" status changed to ${newStatus}`,
    category: NotificationCategory.PROJECT,
    action: NotificationAction.PROJECT_STATUS_CHANGED,
    priority: newStatus === 'Completed' ? 'high' : 'normal',
    link: { view: 'project-details', entityId: project.id },
  });
};

/**
 * Notify when a project update is posted.
 */
export const notifyProjectUpdate = async (
  project: Project,
  updateContent: string,
  author: User,
  allUsers: User[]
) => {
  const recipientIds = [
    ...(project.clientIds || [project.clientId]),
    ...(project.contractorIds || [project.contractorId]),
  ].filter((id) => id && id !== author.id);

  const adminIds = allUsers
    .filter((u) => u.role === UserRole.ADMIN && u.id !== author.id)
    .map((u) => u.id);

  const allRecipients = [...new Set([...recipientIds, ...adminIds])];
  if (allRecipients.length === 0) return;

  const truncated =
    updateContent.length > 80 ? updateContent.slice(0, 80) + '…' : updateContent;

  await createBulkNotifications(allRecipients, {
    senderId: author.id,
    senderName: author.name,
    title: `Update on "${project.title}"`,
    message: truncated,
    category: NotificationCategory.PROJECT,
    action: NotificationAction.PROJECT_UPDATE_ADDED,
    priority: 'low',
    link: { view: 'project-details', entityId: project.id },
  });
};

/**
 * Notify when a new message is received.
 */
export const notifyMessageReceived = async (
  recipientId: string,
  sender: User,
  messageContent: string,
  projectId?: string
) => {
  const truncated =
    messageContent.length > 100 ? messageContent.slice(0, 100) + '…' : messageContent;

  await createNotification({
    recipientId,
    senderId: sender.id,
    senderName: sender.name,
    title: `New message from ${sender.name}`,
    message: truncated,
    category: NotificationCategory.MESSAGE,
    action: NotificationAction.MESSAGE_RECEIVED,
    priority: 'normal',
    link: {
      view: 'messages',
      entityId: sender.id,
      secondaryId: projectId,
    },
  });
};

/**
 * Notify when an @mention is used in a message.
 */
export const notifyMention = async (
  mentionedUserId: string,
  sender: User,
  messageContent: string,
  projectId?: string
) => {
  const truncated =
    messageContent.length > 100 ? messageContent.slice(0, 100) + '…' : messageContent;

  await createNotification({
    recipientId: mentionedUserId,
    senderId: sender.id,
    senderName: sender.name,
    title: `${sender.name} mentioned you`,
    message: truncated,
    category: NotificationCategory.MESSAGE,
    action: NotificationAction.MESSAGE_MENTION,
    priority: 'high',
    link: {
      view: 'messages',
      entityId: sender.id,
      secondaryId: projectId,
    },
  });
};

/**
 * Notify when an invoice is sent/published.
 */
export const notifyInvoiceSent = async (
  invoiceNumber: string,
  invoiceId: string,
  amount: string,
  clientId: string,
  sender: User
) => {
  await createNotification({
    recipientId: clientId,
    senderId: sender.id,
    senderName: sender.name,
    title: 'New Invoice Received',
    message: `Invoice ${invoiceNumber} for ${amount} has been sent to you`,
    category: NotificationCategory.INVOICE,
    action: NotificationAction.INVOICE_SENT,
    priority: 'high',
    link: { view: 'invoices', entityId: invoiceId },
  });
};

/**
 * Notify when an invoice is paid.
 */
export const notifyInvoicePaid = async (
  invoiceNumber: string,
  invoiceId: string,
  amount: string,
  creatorId: string,
  payerName: string
) => {
  await createNotification({
    recipientId: creatorId,
    senderName: payerName,
    title: 'Invoice Paid',
    message: `Invoice ${invoiceNumber} (${amount}) has been paid`,
    category: NotificationCategory.INVOICE,
    action: NotificationAction.INVOICE_PAID,
    priority: 'high',
    link: { view: 'invoices', entityId: invoiceId },
  });
};

/**
 * Notify when a milestone is completed.
 */
export const notifyMilestoneCompleted = async (
  project: Project,
  milestoneTitle: string,
  completedBy: User
) => {
  const recipientIds = [
    ...(project.clientIds || [project.clientId]),
    ...(project.contractorIds || [project.contractorId]),
  ].filter((id) => id && id !== completedBy.id);

  if (recipientIds.length === 0) return;

  await createBulkNotifications(recipientIds, {
    senderId: completedBy.id,
    senderName: completedBy.name,
    title: 'Milestone Completed',
    message: `"${milestoneTitle}" on "${project.title}" has been completed`,
    category: NotificationCategory.MILESTONE,
    action: NotificationAction.MILESTONE_COMPLETED,
    priority: 'normal',
    link: { view: 'project-details', entityId: project.id },
  });
};

/**
 * Notify when a document is uploaded.
 */
export const notifyDocumentUploaded = async (
  documentTitle: string,
  projectTitle: string,
  projectId: string,
  uploader: User,
  recipientIds: string[]
) => {
  const filtered = recipientIds.filter((id) => id !== uploader.id);
  if (filtered.length === 0) return;

  await createBulkNotifications(filtered, {
    senderId: uploader.id,
    senderName: uploader.name,
    title: 'New Document Uploaded',
    message: `"${documentTitle}" uploaded to "${projectTitle}"`,
    category: NotificationCategory.DOCUMENT,
    action: NotificationAction.DOCUMENT_UPLOADED,
    priority: 'low',
    link: { view: 'documents', entityId: projectId },
  });
};

/**
 * Notify when a calendar event is created.
 */
export const notifyEventCreated = async (
  eventTitle: string,
  eventDate: string,
  creator: User,
  recipientIds: string[]
) => {
  const filtered = recipientIds.filter((id) => id !== creator.id);
  if (filtered.length === 0) return;

  await createBulkNotifications(filtered, {
    senderId: creator.id,
    senderName: creator.name,
    title: 'New Calendar Event',
    message: `"${eventTitle}" scheduled for ${new Date(eventDate).toLocaleDateString()}`,
    category: NotificationCategory.CALENDAR,
    action: NotificationAction.EVENT_CREATED,
    priority: 'normal',
    link: { view: 'calendar' },
  });
};