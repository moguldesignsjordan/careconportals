import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  Search,
  MessageSquare,
  ChevronLeft,
  AtSign,
  Tag,
} from 'lucide-react';
import { User, Message, Project, UserRole } from '../types';

interface MessagingProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  projects: Project[]; // Added: needed to filter contacts by shared projects
  onSendMessage: (receiverId: string, content: string, projectId?: string) => Promise<void>;
  initialChatUser?: User | null;
  activeProjectId?: string | null; // when opened from a project
}

const Messaging: React.FC<MessagingProps> = ({
  currentUser,
  users,
  messages,
  projects,
  onSendMessage,
  initialChatUser,
  activeProjectId,
}) => {
  const [activeChat, setActiveChat] = useState<User | null>(initialChatUser || null);
  const [showContacts, setShowContacts] = useState(!initialChatUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /**
   * Filter users based on shared projects:
   * - ADMIN: Can see all users (clients + contractors)
   * - CLIENT: Can only see contractors who share at least one project
   * - CONTRACTOR: Can only see clients who share at least one project
   */
  const allowedContacts = useMemo(() => {
    const otherUsers = users.filter((u) => u.id !== currentUser.id);

    // Admins can message anyone
    if (currentUser.role === UserRole.ADMIN) {
      return otherUsers;
    }

    // For clients: find all projects they're on, then get contractors from those projects
    if (currentUser.role === UserRole.CLIENT) {
      // Get all projects where current user is a client
      const userProjects = projects.filter((p) => {
        const clientIds = p.clientIds?.length ? p.clientIds : p.clientId ? [p.clientId] : [];
        return clientIds.includes(currentUser.id);
      });

      // Collect all contractor IDs from those projects
      const allowedContractorIds = new Set<string>();
      userProjects.forEach((p) => {
        const contractorIds = p.contractorIds?.length ? p.contractorIds : p.contractorId ? [p.contractorId] : [];
        contractorIds.forEach((id) => allowedContractorIds.add(id));
      });

      // Return only contractors who are in the allowed set
      return otherUsers.filter(
        (u) => u.role === UserRole.CONTRACTOR && allowedContractorIds.has(u.id)
      );
    }

    // For contractors: find all projects they're on, then get clients from those projects
    if (currentUser.role === UserRole.CONTRACTOR) {
      // Get all projects where current user is a contractor
      const userProjects = projects.filter((p) => {
        const contractorIds = p.contractorIds?.length ? p.contractorIds : p.contractorId ? [p.contractorId] : [];
        return contractorIds.includes(currentUser.id);
      });

      // Collect all client IDs from those projects
      const allowedClientIds = new Set<string>();
      userProjects.forEach((p) => {
        const clientIds = p.clientIds?.length ? p.clientIds : p.clientId ? [p.clientId] : [];
        clientIds.forEach((id) => allowedClientIds.add(id));
      });

      // Return only clients who are in the allowed set
      return otherUsers.filter(
        (u) => u.role === UserRole.CLIENT && allowedClientIds.has(u.id)
      );
    }

    // Fallback: no contacts
    return [];
  }, [users, currentUser, projects]);

  // Group messages by contact to compute last message
  const contactsWithMeta = useMemo(() => {
    const map = new Map<string, Message[]>();

    messages.forEach((m) => {
      const isCurrentSender = m.senderId === currentUser.id;
      const isCurrentReceiver = m.receiverId === currentUser.id;
      if (!isCurrentSender && !isCurrentReceiver) return;

      const otherId = isCurrentSender ? m.receiverId : m.senderId;
      if (!otherId) return;

      if (!map.has(otherId)) map.set(otherId, []);
      map.get(otherId)!.push(m);
    });

    return allowedContacts
      .map((user) => {
        const msgs = map.get(user.id) || [];
        const last = msgs[msgs.length - 1];
        return { user, lastMessage: last };
      })
      .sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          return b.lastMessage.timestamp.localeCompare(a.lastMessage.timestamp); // Most recent first
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return a.user.name.localeCompare(b.user.name);
      });
  }, [messages, currentUser.id, allowedContacts]);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contactsWithMeta;
    const q = searchQuery.toLowerCase();
    return contactsWithMeta.filter(
      ({ user }) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
    );
  }, [contactsWithMeta, searchQuery]);

  // Messages for active chat (and optional project)
  const chatMessages = useMemo(() => {
    if (!activeChat) return [];
    return messages.filter((m) => {
      const isPair =
        (m.senderId === currentUser.id && m.receiverId === activeChat.id) ||
        (m.senderId === activeChat.id && m.receiverId === currentUser.id);

      if (!isPair) return false;
      if (activeProjectId) {
        return m.projectId === activeProjectId;
      }
      return true;
    });
  }, [messages, currentUser.id, activeChat, activeProjectId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length]);

  // If initialChatUser changes (e.g. coming from a user directory), sync
  useEffect(() => {
    if (initialChatUser) {
      setActiveChat(initialChatUser);
      setShowContacts(false);
    }
  }, [initialChatUser]);

  // Handle @ mention query extraction
  const updateMentionQuery = (value: string) => {
    const atIndex = value.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionQuery('');
      setShowMentionDropdown(false);
      return;
    }

    const after = value.slice(atIndex + 1);
    const match = after.match(/^([^\s@]{1,30})/); // up to first space/@
    const query = match ? match[1] : '';

    if (query.length === 0) {
      setMentionQuery('');
      setShowMentionDropdown(false);
      return;
    }

    setMentionQuery(query.toLowerCase());
    setShowMentionDropdown(true);
  };

  const handleInputChange = (value: string) => {
    setInputText(value);
    updateMentionQuery(value);
  };

  // Mention suggestions limited to allowed contacts only
  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.toLowerCase();
    return allowedContacts
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [mentionQuery, allowedContacts]);

  const handleSelectMention = (user: User) => {
    const value = inputText;
    const atIndex = value.lastIndexOf('@');
    if (atIndex === -1) return;

    const before = value.slice(0, atIndex);
    const after = value.slice(atIndex);
    const match = after.match(/^@[^\s@]*/);
    const rest = match ? after.slice(match[0].length) : '';

    const newValue = `${before}@${user.name}${rest || ' '}`;
    setInputText(newValue);
    setShowMentionDropdown(false);
  };

  const handleSend = async () => {
    if (!activeChat || !inputText.trim() || sending) return;
    const content = inputText.trim();
    setSending(true);
    try {
      await onSendMessage(activeChat.id, content, activeProjectId || undefined);
      setInputText('');
      setShowMentionDropdown(false);
      setMentionQuery('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Helper to get role badge color
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.CLIENT:
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Client' };
      case UserRole.CONTRACTOR:
        return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Contractor' };
      case UserRole.ADMIN:
        return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'User' };
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* CONTACTS PANEL */}
      <div
        className={`w-full md:w-72 border-r border-gray-100 bg-white flex-shrink-0 flex flex-col ${
          showContacts ? 'block' : 'hidden md:flex'
        }`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em]">
              Inbox
            </p>
            <p className="text-sm font-bold text-gray-900">Messages</p>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:border-care-orange focus:ring-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 && (
            <div className="p-6 text-xs text-gray-400 text-center">
              {currentUser.role === UserRole.ADMIN
                ? 'No contacts found.'
                : 'No contacts found. You can only message users who share a project with you.'}
            </div>
          )}

          {filteredContacts.map(({ user, lastMessage }) => {
            const roleBadge = getRoleBadge(user.role);
            return (
              <button
                key={user.id}
                onClick={() => {
                  setActiveChat(user);
                  setShowContacts(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  activeChat?.id === user.id ? 'bg-care-orange/5' : ''
                }`}
              >
                <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {user.name}
                    </p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${roleBadge.bg} ${roleBadge.text}`}>
                      {roleBadge.label}
                    </span>
                  </div>
                  {lastMessage && (
                    <p className="text-[11px] text-gray-500 truncate">
                      {lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                      {lastMessage.content}
                    </p>
                  )}
                </div>
                {lastMessage && (
                  <span className="text-[10px] text-gray-400 ml-2">
                    {formatTime(lastMessage.timestamp)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CHAT PANEL */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button
                onClick={() => setShowContacts(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                {activeChat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900">
                  {activeChat.name}
                </span>
                <span className="text-[11px] text-gray-500">{activeChat.email}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {activeProjectId && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-care-orange/10 text-care-orange text-[10px] font-semibold">
                    <Tag size={12} />
                    Project thread
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/60">
              {chatMessages.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  No messages yet. Start the conversation.
                </div>
              )}

              {chatMessages.map((m) => {
                const isMine = m.senderId === currentUser.id;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                        isMine
                          ? 'bg-care-orange text-white rounded-br-sm'
                          : 'bg-white text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                      <div
                        className={`mt-1 text-[10px] ${
                          isMine ? 'text-white/80 text-right' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(m.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-3 bg-white relative">
              {/* mention dropdown */}
              {showMentionDropdown && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-14 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-10">
                  {mentionSuggestions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectMention(u)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-700">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-900">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {u.email}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full text-xs rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-9 resize-none focus:border-care-orange focus:ring-0"
                    placeholder={
                      activeProjectId
                        ? "Message about this project... use @ to mention someone"
                        : "Type a message... use @ to mention someone"
                    }
                  />
                  <span className="absolute right-2 bottom-2 text-gray-400">
                    <AtSign size={14} />
                  </span>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending || !activeChat}
                  className="h-9 w-9 rounded-full bg-care-orange flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-care-orange/40 hover:shadow-care-orange/60 transition-all"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          // No chat selected
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50/60">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-sm font-bold text-gray-700">Select a conversation</p>
              <p className="text-xs text-gray-400">
                {currentUser.role === UserRole.ADMIN
                  ? 'Choose a contact from the left to start messaging.'
                  : 'Choose a contact from your shared projects to start messaging.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;