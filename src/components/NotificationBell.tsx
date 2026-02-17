// src/components/NotificationBell.tsx
// Notification bell icon with unread badge + dropdown panel

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Archive,
  Briefcase,
  MessageSquare,
  Receipt,
  Flag,
  FileText,
  Calendar,
  Info,
  X,
  Loader2,
} from 'lucide-react';
import {
  AppNotification,
  NotificationCategory,
  NotificationAction,
} from '../types/notification';
import {
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  archiveAllNotifications,
} from '../services/notifications';

interface NotificationBellProps {
  notifications: AppNotification[];
  currentUserId: string;
  onNavigate?: (view: string, entityId?: string) => void;
}

// ── Icon mapping ────────────────────────────────────────
const getCategoryIcon = (category: NotificationCategory) => {
  switch (category) {
    case NotificationCategory.PROJECT:
      return <Briefcase size={16} className="text-care-orange" />;
    case NotificationCategory.MESSAGE:
      return <MessageSquare size={16} className="text-blue-500" />;
    case NotificationCategory.INVOICE:
      return <Receipt size={16} className="text-green-500" />;
    case NotificationCategory.MILESTONE:
      return <Flag size={16} className="text-purple-500" />;
    case NotificationCategory.DOCUMENT:
      return <FileText size={16} className="text-amber-500" />;
    case NotificationCategory.CALENDAR:
      return <Calendar size={16} className="text-teal-500" />;
    case NotificationCategory.SYSTEM:
    default:
      return <Info size={16} className="text-gray-500" />;
  }
};

// ── Relative time formatter ─────────────────────────────
const timeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

// ── Priority dot ────────────────────────────────────────
const PriorityDot: React.FC<{ priority: string }> = ({ priority }) => {
  if (priority === 'low' || priority === 'normal') return null;
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        priority === 'urgent' ? 'bg-red-500' : 'bg-amber-400'
      }`}
    />
  );
};

// ── Single notification row ─────────────────────────────
const NotificationRow: React.FC<{
  notification: AppNotification;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  onClick: (notification: AppNotification) => void;
}> = ({ notification, onRead, onArchive, onClick }) => {
  return (
    <div
      onClick={() => onClick(notification)}
      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
        notification.isRead
          ? 'bg-white hover:bg-gray-50'
          : 'bg-care-orange/5 hover:bg-care-orange/10'
      }`}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-care-orange" />
      )}

      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {getCategoryIcon(notification.category)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-xs leading-tight ${notification.isRead ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
            {notification.title}
          </p>
          <PriorityDot priority={notification.priority} />
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          {notification.senderName && (
            <span className="font-medium text-gray-500">{notification.senderName} · </span>
          )}
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Actions (visible on hover) */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification.id);
            }}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            title="Mark as read"
          >
            <Check size={14} className="text-gray-400" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchive(notification.id);
          }}
          className="p-1 rounded-md hover:bg-gray-200 transition-colors"
          title="Archive"
        >
          <Archive size={14} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
};

// ── Main NotificationBell component ─────────────────────
const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  currentUserId,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const displayNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleNotificationClick = async (notification: AppNotification) => {
    // Mark as read
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }
    // Navigate if link is present
    if (notification.link && onNavigate) {
      onNavigate(notification.link.view, notification.link.entityId);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(currentUserId);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleArchiveAll = async () => {
    try {
      await archiveAllNotifications(currentUserId);
    } catch (err) {
      console.error('Failed to archive all:', err);
    }
  };

  const handleRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveNotification(id);
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-gray-800' : 'text-gray-500'} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-care-orange text-white text-[10px] font-bold px-1 shadow-sm animate-in zoom-in-95 duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col animate-in slide-in-from-bottom fade-in duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-care-orange/10 text-care-orange text-[11px] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  {markingAll ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 py-2 border-b border-gray-50">
            {(['all', 'unread'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors ${
                  filter === tab
                    ? 'bg-care-orange/10 text-care-orange'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {displayNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Bell size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-gray-300 mt-1">
                  {filter === 'unread'
                    ? 'You have no unread notifications'
                    : "You'll see updates here as they happen"}
                </p>
              </div>
            ) : (
              displayNotifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onRead={handleRead}
                  onArchive={handleArchive}
                  onClick={handleNotificationClick}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
              <button
                onClick={handleArchiveAll}
                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                Clear all
              </button>
              <span className="text-[10px] text-gray-300">
                Showing {displayNotifications.length} of {notifications.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;