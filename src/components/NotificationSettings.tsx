// src/components/NotificationSettings.tsx
// User-facing notification preferences panel (embed in Settings view)

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  Briefcase,
  MessageSquare,
  Receipt,
  Flag,
  FileText,
  Calendar,
  Info,
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  EmailNotificationPreferences,
  NotificationCategory,
  DEFAULT_EMAIL_PREFERENCES,
} from '../types/notification';

interface NotificationSettingsProps {
  userId: string;
}

const CATEGORY_META: {
  key: NotificationCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: NotificationCategory.PROJECT,
    label: 'Projects',
    description: 'New projects, status changes, and updates',
    icon: <Briefcase size={16} className="text-care-orange" />,
  },
  {
    key: NotificationCategory.MESSAGE,
    label: 'Messages',
    description: 'New messages and @mentions',
    icon: <MessageSquare size={16} className="text-blue-500" />,
  },
  {
    key: NotificationCategory.INVOICE,
    label: 'Invoices',
    description: 'New invoices, payments, and overdue alerts',
    icon: <Receipt size={16} className="text-green-500" />,
  },
  {
    key: NotificationCategory.MILESTONE,
    label: 'Milestones',
    description: 'Milestone completions and due date reminders',
    icon: <Flag size={16} className="text-purple-500" />,
  },
  {
    key: NotificationCategory.DOCUMENT,
    label: 'Documents',
    description: 'New document uploads and shares',
    icon: <FileText size={16} className="text-amber-500" />,
  },
  {
    key: NotificationCategory.CALENDAR,
    label: 'Calendar',
    description: 'New events and reminders',
    icon: <Calendar size={16} className="text-teal-500" />,
  },
  {
    key: NotificationCategory.SYSTEM,
    label: 'System',
    description: 'Important announcements and updates',
    icon: <Info size={16} className="text-gray-500" />,
  },
];

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId }) => {
  const [preferences, setPreferences] = useState<EmailNotificationPreferences>(
    DEFAULT_EMAIL_PREFERENCES
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load preferences from user doc
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.emailNotificationPreferences) {
            setPreferences({
              ...DEFAULT_EMAIL_PREFERENCES,
              ...data.emailNotificationPreferences,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPrefs();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'users', userId), {
        emailNotificationPreferences: preferences,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: NotificationCategory) => {
    setPreferences((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category],
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-care-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-care-orange/10 flex items-center justify-center">
          <Bell size={20} className="text-care-orange" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Notification Preferences</h3>
          <p className="text-xs text-gray-500">
            Control how and when you receive notifications
          </p>
        </div>
      </div>

      {/* Email notifications toggle */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-gray-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Email Notifications</p>
              <p className="text-xs text-gray-500">
                Receive email alerts for important updates
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              setPreferences((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            className={`relative w-11 h-6 rounded-full transition-colors ${
              preferences.enabled ? 'bg-care-orange' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                preferences.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Delivery mode */}
      {preferences.enabled && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Clock size={18} className="text-gray-500" />
            <p className="text-sm font-semibold text-gray-900">Delivery Mode</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['instant', 'daily'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() =>
                  setPreferences((prev) => ({ ...prev, digestMode: mode }))
                }
                className={`px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                  preferences.digestMode === mode
                    ? 'border-care-orange bg-care-orange/5 text-care-orange'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {mode === 'instant' ? '⚡ Instant' : '📬 Daily Digest'}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {mode === 'instant'
                    ? 'Email per notification'
                    : 'One summary email per day'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category toggles */}
      {preferences.enabled && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            Email me about…
          </p>
          <div className="space-y-1">
            {CATEGORY_META.map(({ key, label, description, icon }) => (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="shrink-0">{icon}</div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-medium text-gray-800">{label}</p>
                  <p className="text-[10px] text-gray-400">{description}</p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    preferences.categories[key] ? 'bg-care-orange' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      preferences.categories[key]
                        ? 'translate-x-[18px]'
                        : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-care-orange text-white text-sm font-semibold hover:bg-orange-500 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saved ? (
          <CheckCircle size={16} />
        ) : (
          <Save size={16} />
        )}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Preferences'}
      </button>
    </div>
  );
};

export default NotificationSettings;