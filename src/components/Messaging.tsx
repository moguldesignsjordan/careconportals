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
  projects: Project[];
  onSendMessage: (receiverId: string, content: string, projectId?: string) => Promise<void>;
  initialChatUser?: User | null;
  activeProjectId?: string | null;
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
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ============ CONTACTS FILTERING ============

  const allowedContacts = useMemo(() => {
    const otherUsers = users.filter((u) => u.id !== currentUser.id);

    if (currentUser.role === UserRole.ADMIN) {
      return otherUsers;
    }

    if (currentUser.role === UserRole.CLIENT) {
      const userProjects = projects.filter((p) => {
        const clientIds = p.clientIds?.length ? p.clientIds : p.clientId ? [p.clientId] : [];
        return clientIds.includes(currentUser.id);
      });

      const allowedContractorIds = new Set<string>();
      // Also allow admins to be contacted
      otherUsers.forEach((u) => {
        if (u.role === UserRole.ADMIN) allowedContractorIds.add(u.id);
      });
      userProjects.forEach((p) => {
        const contractorIds = p.contractorIds?.length ? p.contractorIds : p.contractorId ? [p.contractorId] : [];
        contractorIds.forEach((id) => allowedContractorIds.add(id));
      });

      return otherUsers.filter((u) => allowedContractorIds.has(u.id));
    }

    if (currentUser.role === UserRole.CONTRACTOR) {
      const userProjects = projects.filter((p) => {
        const contractorIds = p.contractorIds?.length ? p.contractorIds : p.contractorId ? [p.contractorId] : [];
        return contractorIds.includes(currentUser.id);
      });

      const allowedClientIds = new Set<string>();
      // Also allow admins
      otherUsers.forEach((u) => {
        if (u.role === UserRole.ADMIN) allowedClientIds.add(u.id);
      });
      userProjects.forEach((p) => {
        const clientIds = p.clientIds?.length ? p.clientIds : p.clientId ? [p.clientId] : [];
        clientIds.forEach((id) => allowedClientIds.add(id));
      });

      return otherUsers.filter((u) => allowedClientIds.has(u.id));
    }

    return [];
  }, [users, currentUser, projects]);

  // ============ CONTACT METADATA ============

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
          // Handle Firestore Timestamp objects, Date objects, or ISO strings
          const getTime = (ts: any): number => {
            if (!ts) return 0;
            if (typeof ts === 'number') return ts;
            if (typeof ts?.toMillis === 'function') return ts.toMillis(); // Firestore Timestamp
            if (typeof ts?.toDate === 'function') return ts.toDate().getTime(); // Firestore Timestamp alt
            if (ts instanceof Date) return ts.getTime();
            const parsed = new Date(ts).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getTime(b.lastMessage.timestamp) - getTime(a.lastMessage.timestamp);
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return a.user.name.localeCompare(b.user.name);
      });
  }, [messages, currentUser.id, allowedContacts]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contactsWithMeta;
    const q = searchQuery.toLowerCase();
    return contactsWithMeta.filter(
      ({ user }) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
    );
  }, [contactsWithMeta, searchQuery]);

  // ============ CHAT MESSAGES ============

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

  useEffect(() => {
    if (initialChatUser) {
      setActiveChat(initialChatUser);
      setShowContacts(false);
    }
  }, [initialChatUser]);

  // ============ @MENTION HANDLING ============

  const updateMentionQuery = (value: string) => {
    const atIndex = value.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionQuery('');
      setShowMentionDropdown(false);
      return;
    }

    const after = value.slice(atIndex + 1);
    const match = after.match(/^([^\s@]{0,30})/);
    const query = match ? match[1] : '';

    if (query.length === 0 && after.length === 0) {
      // Just typed '@', show all contacts
      setMentionQuery('');
      setShowMentionDropdown(true);
      setSelectedMentionIndex(0);
      return;
    }

    if (query.length === 0) {
      setMentionQuery('');
      setShowMentionDropdown(false);
      return;
    }

    setMentionQuery(query.toLowerCase());
    setShowMentionDropdown(true);
    setSelectedMentionIndex(0);
  };

  const handleInputChange = (value: string) => {
    setInputText(value);
    updateMentionQuery(value);
  };

  // Build mention suggestions: all users (not just allowed contacts) for broader tagging
  const mentionSuggestions = useMemo(() => {
    // Include all users except current user for mention suggestions
    const allOthers = users.filter((u) => u.id !== currentUser.id);
    
    if (!mentionQuery && showMentionDropdown) {
      // Show first 5 allowed contacts when just '@' is typed
      return allowedContacts.slice(0, 5);
    }
    
    if (!mentionQuery) return [];
    const q = mentionQuery.toLowerCase();
    return allOthers
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [mentionQuery, showMentionDropdown, users, currentUser.id, allowedContacts]);

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
    setMentionQuery('');
    textareaRef.current?.focus();
  };

  // ============ RENDER @MENTIONS IN MESSAGES ============

  /**
   * Parse message content and highlight @mentions as styled tags.
   * Matches @Name patterns against known users.
   */
  const renderMessageContent = (content: string, isMine: boolean) => {
    // Build a set of known user names for matching
    const userNames = users.map((u) => u.name);
    
    // Regex to find @mentions - matches @followed by 1-3 words (to handle "John Smith" etc.)
    const mentionRegex = /@(\S+(?:\s\S+){0,2})/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIdx = 0;

    while ((match = mentionRegex.exec(content)) !== null) {
      const fullMatch = match[0]; // e.g. "@John Smith"
      const afterAt = match[1]; // e.g. "John Smith"
      const matchStart = match.index;

      // Try to find the longest matching user name
      let matchedName = '';
      for (const name of userNames) {
        if (afterAt.startsWith(name) || afterAt.toLowerCase().startsWith(name.toLowerCase())) {
          if (name.length > matchedName.length) {
            matchedName = name;
          }
        }
      }

      if (matchedName) {
        // Add text before the mention
        if (matchStart > lastIndex) {
          parts.push(
            <span key={`t-${keyIdx++}`}>
              {content.slice(lastIndex, matchStart)}
            </span>
          );
        }

        // Add the highlighted mention
        parts.push(
          <span
            key={`m-${keyIdx++}`}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
              isMine
                ? 'bg-white/25 text-white'
                : 'bg-care-orange/15 text-care-orange'
            }`}
          >
            <AtSign size={10} className="flex-shrink-0" />
            {matchedName}
          </span>
        );

        // Advance past the matched mention (@ + name length)
        lastIndex = matchStart + 1 + matchedName.length;
      } else {
        // No matching user found — treat as plain text up through this match
        parts.push(
          <span key={`t-${keyIdx++}`}>
            {content.slice(lastIndex, matchStart + fullMatch.length)}
          </span>
        );
        lastIndex = matchStart + fullMatch.length;
      }
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`t-${keyIdx++}`}>{content.slice(lastIndex)}</span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  // ============ SEND / KEYBOARD ============

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
    // Navigate mention dropdown with arrow keys
    if (showMentionDropdown && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : mentionSuggestions.length - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(mentionSuggestions[selectedMentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ============ HELPERS ============

  const formatTime = (timestamp: any) => {
    try {
      let date: Date;
      if (typeof timestamp?.toDate === 'function') {
        date = timestamp.toDate(); // Firestore Timestamp
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

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

  // ============ RENDER ============

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
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${roleBadge.bg} ${roleBadge.text}`}
                    >
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
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
              <button
                onClick={() => setShowContacts(true)}
                className="md:hidden p-1 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700">
                {activeChat.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {activeChat.name}
                  </p>
                  {(() => {
                    const badge = getRoleBadge(activeChat.role);
                    return (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-[11px] text-gray-400 truncate">
                  {activeChat.email}
                </p>
              </div>

              {/* Mention hint */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
                <AtSign size={12} className="text-gray-400" />
                <span className="text-[10px] text-gray-400 font-medium">
                  Type @ to mention
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60">
              {chatMessages.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-12">
                  <MessageSquare
                    size={32}
                    className="mx-auto mb-3 opacity-40"
                  />
                  <p className="font-bold text-gray-500">No messages yet</p>
                  <p>Send a message to start the conversation.</p>
                </div>
              )}

              {chatMessages.map((m) => {
                const isMine = m.senderId === currentUser.id;
                return (
                  <div
                    key={m.id || `${m.senderId}-${m.timestamp}`}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMine
                          ? 'bg-care-orange text-white rounded-br-sm'
                          : 'bg-white text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      {/* ✅ ENHANCED: Render @mentions as highlighted tags */}
                      <p className="whitespace-pre-wrap break-words">
                        {renderMessageContent(m.content, isMine)}
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
              {/* Mention dropdown */}
              {showMentionDropdown && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-14 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Mention someone
                    </p>
                  </div>
                  {mentionSuggestions.map((u, idx) => {
                    const badge = getRoleBadge(u.role);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectMention(u)}
                        className={`w-full px-3 py-2.5 text-left text-xs flex items-center gap-2.5 transition-colors ${
                          idx === selectedMentionIndex
                            ? 'bg-care-orange/5'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-700">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-900 truncate">
                              {u.name}
                            </span>
                            <span
                              className={`text-[8px] px-1 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 truncate">
                            {u.email}
                          </span>
                        </div>
                        {idx === selectedMentionIndex && (
                          <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            ↵
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="w-full text-xs rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-9 resize-none focus:border-care-orange focus:ring-0"
                    placeholder={
                      activeProjectId
                        ? 'Message about this project... use @ to mention someone'
                        : 'Type a message... use @ to mention someone'
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
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50/60">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-40" />
              <p className="text-sm font-bold text-gray-700">
                Select a conversation
              </p>
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