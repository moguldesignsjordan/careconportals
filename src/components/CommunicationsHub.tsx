// src/components/CommunicationsHub.tsx
// Admin-only: View all SMS messages, call logs, and send new texts
// Requires: functions/src/twilioAdmin.ts deployed

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare,
  Phone,
  Send,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Loader2,
  User as UserIcon,
  Filter,
  X,
  MessageCircle,
  Smartphone,
  Hash,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { User, UserRole } from '../types';

// ============ TYPES ============

interface TwilioMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  status: string;
  direction: string;
  dateSent: string;
  dateCreated: string;
  numSegments: string;
  errorCode: string | null;
  errorMessage: string | null;
  price: string | null;
  priceUnit: string | null;
}

interface TwilioCall {
  sid: string;
  from: string;
  to: string;
  status: string;
  direction: string;
  duration: string;
  startTime: string;
  endTime: string;
  dateCreated: string;
  price: string | null;
  priceUnit: string | null;
  callerName: string | null;
}

interface MessagesResponse {
  messages: TwilioMessage[];
  nextPageToken: string | null;
  previousPageToken: string | null;
  total: number;
}

interface CallsResponse {
  calls: TwilioCall[];
  nextPageToken: string | null;
  previousPageToken: string | null;
  total: number;
}

type TabType = 'messages' | 'calls' | 'compose';

interface CommunicationsHubProps {
  users: User[];
  currentUser: User;
}

// ============ CLOUD FUNCTION REFS ============

const getTwilioMessagesFn = httpsCallable<any, MessagesResponse>(
  functions,
  'getTwilioMessages'
);
const getTwilioCallsFn = httpsCallable<any, CallsResponse>(
  functions,
  'getTwilioCalls'
);
const adminSendSMSFn = httpsCallable<any, { success: boolean; messageSid: string }>(
  functions,
  'adminSendSMS'
);

// ============ HELPERS ============

const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatTime = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDuration = (seconds: string | number): string => {
  const s = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  if (!s || s === 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const getStatusColor = (status: string) => {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    sent: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    received: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    queued: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    sending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    undelivered: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    busy: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    'no-answer': { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    canceled: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    ringing: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    'in-progress': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  };
  return map[status] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
};

// ============ COMPONENT ============

const CommunicationsHub: React.FC<CommunicationsHubProps> = ({ users, currentUser }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('messages');

  // Messages state
  const [messages, setMessages] = useState<TwilioMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesNextPage, setMessagesNextPage] = useState<string | null>(null);
  const [messagesPrevPage, setMessagesPrevPage] = useState<string | null>(null);
  const [messageDirection, setMessageDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [messageSearch, setMessageSearch] = useState('');
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  // Calls state
  const [calls, setCalls] = useState<TwilioCall[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsError, setCallsError] = useState<string | null>(null);
  const [callsNextPage, setCallsNextPage] = useState<string | null>(null);
  const [callsPrevPage, setCallsPrevPage] = useState<string | null>(null);
  const [callStatusFilter, setCallStatusFilter] = useState<string>('all');
  const [callSearch, setCallSearch] = useState('');

  // Compose state
  const [composePhone, setComposePhone] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeSent, setComposeSent] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const composeInputRef = useRef<HTMLTextAreaElement>(null);

  // Build phone → user map for display names
  const phoneToUser = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => {
      const phone = (u as any).phone || (u as any).phoneNumber;
      if (phone) {
        map[phone] = u;
        // Also map without country code
        const digits = phone.replace(/\D/g, '');
        map[`+${digits}`] = u;
        if (digits.startsWith('1')) map[`+${digits.slice(1)}`] = u;
      }
    });
    return map;
  }, [users]);

  const resolveContactName = (phone: string): string | null => {
    return phoneToUser[phone]?.name || null;
  };

  const contactsWithPhone = useMemo(() => {
    return users.filter((u) => {
      const phone = (u as any).phone || (u as any).phoneNumber;
      return !!phone;
    });
  }, [users]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contactsWithPhone;
    const q = contactSearch.toLowerCase();
    return contactsWithPhone.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ((u as any).phone || (u as any).phoneNumber || '').includes(q)
    );
  }, [contactsWithPhone, contactSearch]);

  // ============ DATA FETCHING ============

  const fetchMessages = async (pageToken?: string | null) => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const result = await getTwilioMessagesFn({
        pageSize: 25,
        pageToken: pageToken || undefined,
        direction: messageDirection === 'all' ? undefined : messageDirection,
        searchPhone: messageSearch || undefined,
      });
      setMessages(result.data.messages);
      setMessagesNextPage(result.data.nextPageToken);
      setMessagesPrevPage(result.data.previousPageToken);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      const msg = error?.message || error?.code || 'Failed to fetch messages';
      if (msg.includes('internal') || msg.includes('CORS') || msg.includes('not-found')) {
        setMessagesError(
          'Twilio functions not deployed or not configured. Deploy with: firebase deploy --only functions'
        );
      } else if (msg.includes('permission-denied')) {
        setMessagesError('Admin access required to view SMS logs.');
      } else {
        setMessagesError(msg);
      }
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchCalls = async (pageToken?: string | null) => {
    setCallsLoading(true);
    setCallsError(null);
    try {
      const result = await getTwilioCallsFn({
        pageSize: 25,
        pageToken: pageToken || undefined,
        status: callStatusFilter === 'all' ? undefined : callStatusFilter,
        searchPhone: callSearch || undefined,
      });
      setCalls(result.data.calls);
      setCallsNextPage(result.data.nextPageToken);
      setCallsPrevPage(result.data.previousPageToken);
    } catch (error: any) {
      console.error('Error fetching calls:', error);
      const msg = error?.message || error?.code || 'Failed to fetch calls';
      if (msg.includes('internal') || msg.includes('CORS') || msg.includes('not-found')) {
        setCallsError(
          'Twilio functions not deployed or not configured. Deploy with: firebase deploy --only functions'
        );
      } else if (msg.includes('permission-denied')) {
        setCallsError('Admin access required to view call logs.');
      } else {
        setCallsError(msg);
      }
    } finally {
      setCallsLoading(false);
    }
  };

  // Only fetch once per tab — don't re-fetch on error (prevents retry storms)
  const messagesLoaded = useRef(false);
  const callsLoaded = useRef(false);

  useEffect(() => {
    if (activeTab === 'messages' && !messagesLoaded.current) {
      messagesLoaded.current = true;
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Re-fetch when direction filter changes (but only if initial load succeeded)
  useEffect(() => {
    if (activeTab === 'messages' && messagesLoaded.current && !messagesError) {
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageDirection]);

  useEffect(() => {
    if (activeTab === 'calls' && !callsLoaded.current) {
      callsLoaded.current = true;
      fetchCalls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'calls' && callsLoaded.current && !callsError) {
      fetchCalls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatusFilter]);

  // ============ SEND SMS ============

  const handleSendSMS = async () => {
    if (!composePhone.trim() || !composeMessage.trim()) return;

    setComposeSending(true);
    setComposeError(null);
    setComposeSent(false);

    try {
      // Ensure E.164 format
      let phone = composePhone.trim();
      if (!phone.startsWith('+')) {
        const digits = phone.replace(/\D/g, '');
        phone = digits.length === 10 ? `+1${digits}` : `+${digits}`;
      }

      const recipientName = resolveContactName(phone) || undefined;

      await adminSendSMSFn({
        to: phone,
        message: composeMessage.trim(),
        recipientName,
      });

      setComposeSent(true);
      setComposeMessage('');

      // Auto-refresh messages
      setTimeout(() => {
        fetchMessages();
        setComposeSent(false);
      }, 2000);
    } catch (error: any) {
      console.error('Send SMS error:', error);
      setComposeError(error.message || 'Failed to send SMS');
    } finally {
      setComposeSending(false);
    }
  };

  const selectContact = (user: User) => {
    const phone = (user as any).phone || (user as any).phoneNumber || '';
    setComposePhone(phone);
    setShowContactPicker(false);
    setContactSearch('');
    composeInputRef.current?.focus();
  };

  // ============ ROLE BADGE ============

  const getRoleBadge = (role: UserRole) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      admin: { bg: 'bg-care-orange/10', text: 'text-care-orange', label: 'Admin' },
      contractor: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Contractor' },
      client: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Client' },
    };
    return config[role] || config.client;
  };

  // ============ TAB BUTTONS ============

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'messages',
      label: 'Text Messages',
      icon: <MessageSquare size={16} />,
      count: messages.length,
    },
    {
      id: 'calls',
      label: 'Call Log',
      icon: <Phone size={16} />,
      count: calls.length,
    },
    {
      id: 'compose',
      label: 'Send SMS',
      icon: <Send size={16} />,
    },
  ];

  // ============ RENDER ============

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-care-orange/10 flex items-center justify-center">
            <Smartphone size={20} className="text-care-orange" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              Communications Hub
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              SMS messages, call logs & outbound texting
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && activeTab === tab.id && (
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============ MESSAGES TAB ============ */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMessages()}
                placeholder="Search by phone number..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:border-care-orange focus:ring-0 placeholder:text-gray-300"
              />
            </div>

            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-0.5">
              {(['all', 'inbound', 'outbound'] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setMessageDirection(dir)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    messageDirection === dir
                      ? 'bg-care-orange text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {dir === 'all' ? 'All' : dir === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setMessagesError(null);
                fetchMessages();
              }}
              disabled={messagesLoading}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-care-orange/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={`text-gray-500 ${messagesLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Messages List */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {messagesError ? (
              <div className="text-center py-16 px-6">
                <AlertCircle size={40} className="mx-auto mb-3 text-amber-400" />
                <p className="text-sm font-semibold text-gray-700 mb-1">Connection Issue</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  {messagesError}
                </p>
                <button
                  onClick={() => {
                    setMessagesError(null);
                    fetchMessages();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-care-orange/10 text-care-orange rounded-xl text-xs font-semibold hover:bg-care-orange/20 transition-colors"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            ) : messagesLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-care-orange" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircle size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-semibold text-gray-500">No messages found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Messages will appear here once Twilio is configured
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {messages.map((msg) => {
                  const isOutbound =
                    msg.direction === 'outbound-api' || msg.direction === 'outbound';
                  const contactPhone = isOutbound ? msg.to : msg.from;
                  const contactName = resolveContactName(contactPhone);
                  const statusColor = getStatusColor(msg.status);
                  const isExpanded = expandedMessage === msg.sid;

                  return (
                    <button
                      key={msg.sid}
                      onClick={() =>
                        setExpandedMessage(isExpanded ? null : msg.sid)
                      }
                      className="w-full text-left px-5 py-4 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Direction icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isOutbound ? 'bg-blue-50' : 'bg-emerald-50'
                          }`}
                        >
                          {isOutbound ? (
                            <ArrowUpRight size={16} className="text-blue-500" />
                          ) : (
                            <ArrowDownLeft size={16} className="text-emerald-500" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {contactName || formatPhoneDisplay(contactPhone)}
                            </span>
                            {contactName && (
                              <span className="text-[10px] text-gray-400">
                                {formatPhoneDisplay(contactPhone)}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs text-gray-600 ${
                              isExpanded ? '' : 'line-clamp-2'
                            }`}
                          >
                            {msg.body}
                          </p>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-gray-400">SID:</span>{' '}
                                <span className="text-gray-600 font-mono">
                                  {msg.sid.slice(0, 20)}...
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Segments:</span>{' '}
                                <span className="text-gray-600">{msg.numSegments}</span>
                              </div>
                              {msg.price && (
                                <div>
                                  <span className="text-gray-400">Cost:</span>{' '}
                                  <span className="text-gray-600">
                                    ${Math.abs(parseFloat(msg.price)).toFixed(4)}{' '}
                                    {msg.priceUnit}
                                  </span>
                                </div>
                              )}
                              {msg.errorCode && (
                                <div className="col-span-2">
                                  <span className="text-red-400">Error:</span>{' '}
                                  <span className="text-red-600">
                                    {msg.errorCode} — {msg.errorMessage}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right side */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="text-[11px] text-gray-400">
                            {formatDate(msg.dateSent || msg.dateCreated)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor.bg} ${statusColor.text}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`}
                            />
                            {msg.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {(messagesNextPage || messagesPrevPage) && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => fetchMessages(messagesPrevPage)}
                  disabled={!messagesPrevPage || messagesLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-[11px] text-gray-400">
                  {messages.length} messages shown
                </span>
                <button
                  onClick={() => fetchMessages(messagesNextPage)}
                  disabled={!messagesNextPage || messagesLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ CALLS TAB ============ */}
      {activeTab === 'calls' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={callSearch}
                onChange={(e) => setCallSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchCalls()}
                placeholder="Search by phone number..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:border-care-orange focus:ring-0 placeholder:text-gray-300"
              />
            </div>

            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-0.5">
              {[
                { value: 'all', label: 'All' },
                { value: 'completed', label: 'Completed' },
                { value: 'busy', label: 'Busy' },
                { value: 'no-answer', label: 'Missed' },
                { value: 'failed', label: 'Failed' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCallStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    callStatusFilter === opt.value
                      ? 'bg-care-orange text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setCallsError(null);
                fetchCalls();
              }}
              disabled={callsLoading}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-care-orange/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={`text-gray-500 ${callsLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* Calls List */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {callsError ? (
              <div className="text-center py-16 px-6">
                <AlertCircle size={40} className="mx-auto mb-3 text-amber-400" />
                <p className="text-sm font-semibold text-gray-700 mb-1">Connection Issue</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                  {callsError}
                </p>
                <button
                  onClick={() => {
                    setCallsError(null);
                    fetchCalls();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-care-orange/10 text-care-orange rounded-xl text-xs font-semibold hover:bg-care-orange/20 transition-colors"
                >
                  <RefreshCw size={14} />
                  Retry
                </button>
              </div>
            ) : callsLoading && calls.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-care-orange" />
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-16">
                <Phone size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-semibold text-gray-500">No calls found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Call logs will appear here once Twilio voice is configured
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {calls.map((call) => {
                  const isInbound =
                    call.direction === 'inbound';
                  const contactPhone = isInbound ? call.from : call.to;
                  const contactName = resolveContactName(contactPhone);
                  const statusColor = getStatusColor(call.status);
                  const durationSec = parseInt(call.duration || '0', 10);

                  let CallIcon = PhoneCall;
                  if (isInbound && call.status === 'completed') CallIcon = PhoneIncoming;
                  else if (!isInbound && call.status === 'completed')
                    CallIcon = PhoneOutgoing;
                  else if (
                    call.status === 'no-answer' ||
                    call.status === 'busy' ||
                    call.status === 'failed'
                  )
                    CallIcon = PhoneMissed;

                  const iconBg =
                    call.status === 'completed'
                      ? isInbound
                        ? 'bg-emerald-50'
                        : 'bg-blue-50'
                      : 'bg-red-50';
                  const iconColor =
                    call.status === 'completed'
                      ? isInbound
                        ? 'text-emerald-500'
                        : 'text-blue-500'
                      : 'text-red-500';

                  return (
                    <div
                      key={call.sid}
                      className="px-5 py-4 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
                        >
                          <CallIcon size={16} className={iconColor} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {contactName || formatPhoneDisplay(contactPhone)}
                            </span>
                            {contactName && (
                              <span className="text-[10px] text-gray-400">
                                {formatPhoneDisplay(contactPhone)}
                              </span>
                            )}
                            {call.callerName && !contactName && (
                              <span className="text-[10px] text-gray-400">
                                {call.callerName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor.bg} ${statusColor.text}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`}
                              />
                              {call.status}
                            </span>
                            {durationSec > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                <Clock size={10} />
                                {formatDuration(call.duration)}
                              </span>
                            )}
                            <span className="text-[11px] text-gray-400">
                              {isInbound ? 'Inbound' : 'Outbound'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[11px] text-gray-400">
                            {formatDate(call.startTime || call.dateCreated)}
                          </span>
                          <span className="text-[10px] text-gray-300">
                            {formatTime(call.startTime || call.dateCreated)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {(callsNextPage || callsPrevPage) && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => fetchCalls(callsPrevPage)}
                  disabled={!callsPrevPage || callsLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-[11px] text-gray-400">
                  {calls.length} calls shown
                </span>
                <button
                  onClick={() => fetchCalls(callsNextPage)}
                  disabled={!callsNextPage || callsLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ COMPOSE TAB ============ */}
      {activeTab === 'compose' && (
        <div className="max-w-xl space-y-4">
          {/* Recipient */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Recipient
              </label>
              <div className="relative">
                <Smartphone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="tel"
                  value={composePhone}
                  onChange={(e) => setComposePhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full pl-9 pr-24 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-care-orange focus:ring-0 placeholder:text-gray-300"
                />
                <button
                  onClick={() => setShowContactPicker(!showContactPicker)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1.5 bg-care-orange/10 text-care-orange rounded-lg text-[11px] font-semibold hover:bg-care-orange/20 transition-colors"
                >
                  <UserIcon size={12} />
                  Contacts
                </button>
              </div>

              {/* Resolved name */}
              {composePhone && resolveContactName(composePhone) && (
                <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  {resolveContactName(composePhone)}
                </p>
              )}

              {/* Contact Picker Dropdown */}
              {showContactPicker && (
                <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search
                        size={12}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Search contacts..."
                        className="w-full pl-8 pr-3 py-2 bg-gray-50 border-0 rounded-lg text-xs focus:ring-0 placeholder:text-gray-300"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    {filteredContacts.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-xs text-gray-400">
                          No contacts with phone numbers
                        </p>
                      </div>
                    ) : (
                      filteredContacts.map((u) => {
                        const phone = (u as any).phone || (u as any).phoneNumber;
                        const badge = getRoleBadge(u.role);
                        return (
                          <button
                            key={u.id}
                            onClick={() => selectContact(u)}
                            className="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                              {u.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-900 truncate">
                                  {u.name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.bg} ${badge.text}`}
                                >
                                  {badge.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 truncate">
                                {formatPhoneDisplay(phone)}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Message
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    composeMessage.length > 160
                      ? composeMessage.length > 320
                        ? 'text-red-500'
                        : 'text-amber-500'
                      : 'text-gray-400'
                  }`}
                >
                  {composeMessage.length}/160
                  {composeMessage.length > 160 && (
                    <span className="ml-1">
                      ({Math.ceil(composeMessage.length / 160)} segments)
                    </span>
                  )}
                </span>
              </div>
              <textarea
                ref={composeInputRef}
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                rows={4}
                maxLength={1600}
                placeholder="Type your message..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:border-care-orange focus:ring-0 placeholder:text-gray-300"
              />
            </div>

            {/* Error / Success */}
            {composeError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{composeError}</p>
                <button
                  onClick={() => setComposeError(null)}
                  className="ml-auto"
                >
                  <X size={14} className="text-red-400" />
                </button>
              </div>
            )}

            {composeSent && (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <p className="text-xs text-emerald-700 font-medium">
                  Message sent successfully!
                </p>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSendSMS}
              disabled={
                !composePhone.trim() ||
                !composeMessage.trim() ||
                composeSending
              }
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-care-orange text-white font-bold text-sm rounded-xl shadow-md shadow-care-orange/30 hover:shadow-care-orange/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {composeSending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send SMS
                </>
              )}
            </button>
          </div>

          {/* Quick tips */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              SMS Tips
            </p>
            <ul className="space-y-1.5 text-xs text-gray-500">
              <li className="flex items-start gap-2">
                <Hash size={10} className="mt-0.5 text-gray-400 flex-shrink-0" />
                Phone numbers must include country code (+1 for US)
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle size={10} className="mt-0.5 text-gray-400 flex-shrink-0" />
                Messages over 160 characters are sent as multiple segments
              </li>
              <li className="flex items-start gap-2">
                <Clock size={10} className="mt-0.5 text-gray-400 flex-shrink-0" />
                All outbound messages are logged for audit in Firestore
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationsHub;