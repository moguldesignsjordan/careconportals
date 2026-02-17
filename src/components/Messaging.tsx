import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  Search,
  MessageSquare,
  ChevronLeft,
  AtSign,
  Tag,
  Users,
  User as UserIcon,
  Plus,
  X,
  Check,
  Hash,
} from 'lucide-react';
import { User, Message, Project, UserRole } from '../types';

// ============ GROUP CHAT TYPES ============

export interface GroupChat {
  id: string;
  name: string;
  projectId?: string;
  memberIds: string[];
  createdBy: string;
  createdAt: Date | any;
}

// Extended message type to support group messages
export interface GroupMessage extends Omit<Message, 'receiverId'> {
  receiverId?: string;
  groupId?: string;
}

interface MessagingProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  projects: Project[];
  onSendMessage: (receiverId: string, content: string, projectId?: string) => Promise<void>;
  onSendGroupMessage?: (groupId: string, content: string, projectId?: string) => Promise<void>;
  groupChats?: GroupChat[];
  groupMessages?: GroupMessage[];
  onCreateGroup?: (name: string, memberIds: string[], projectId?: string) => Promise<void>;
  initialChatUser?: User | null;
  activeProjectId?: string | null;
}

type ChatTab = 'direct' | 'groups';
type ActiveTarget = { type: 'user'; data: User } | { type: 'group'; data: GroupChat };

const Messaging: React.FC<MessagingProps> = ({
  currentUser,
  users,
  messages,
  projects,
  onSendMessage,
  onSendGroupMessage,
  groupChats = [],
  groupMessages = [],
  onCreateGroup,
  initialChatUser,
  activeProjectId,
}) => {
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(
    initialChatUser ? { type: 'user', data: initialChatUser } : null
  );
  const [showContacts, setShowContacts] = useState(!initialChatUser);
  const [chatTab, setChatTab] = useState<ChatTab>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Group creation state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Backward compat: derive activeChat for DM logic
  const activeChat = activeTarget?.type === 'user' ? activeTarget.data : null;
  const activeGroup = activeTarget?.type === 'group' ? activeTarget.data : null;

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

  // ============ PROJECT-BASED AUTO GROUPS ============

  const projectGroups = useMemo((): GroupChat[] => {
    return projects
      .filter((p) => {
        const contractorIds = p.contractorIds?.length ? p.contractorIds : p.contractorId ? [p.contractorId] : [];
        const clientIds = p.clientIds?.length ? p.clientIds : p.clientId ? [p.clientId] : [];
        const allMembers = [...contractorIds, ...clientIds];
        return (
          currentUser.role === UserRole.ADMIN ||
          allMembers.includes(currentUser.id)
        );
      })
      .map((p) => {
        const contractorIds = p.contractorIds?.length ? p.contractorIds : p.contractorId ? [p.contractorId] : [];
        const clientIds = p.clientIds?.length ? p.clientIds : p.clientId ? [p.clientId] : [];
        const adminIds = users.filter((u) => u.role === UserRole.ADMIN).map((u) => u.id);
        const memberIds = [...new Set([...contractorIds, ...clientIds, ...adminIds])];

        return {
          id: `project-${p.id}`,
          name: p.title || p.name || `Project ${p.id}`,
          projectId: p.id,
          memberIds,
          createdBy: 'system',
          createdAt: p.createdAt || new Date(),
        };
      });
  }, [projects, currentUser, users]);

  const allGroups = useMemo(() => {
    const userGroups = groupChats.filter((g) => g.memberIds.includes(currentUser.id));
    return [...projectGroups, ...userGroups];
  }, [projectGroups, groupChats, currentUser.id]);

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
          const getTime = (ts: any): number => {
            if (!ts) return 0;
            if (typeof ts === 'number') return ts;
            if (typeof ts?.toMillis === 'function') return ts.toMillis();
            if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
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

  const groupsWithMeta = useMemo(() => {
    return allGroups
      .map((group) => {
        const msgs = groupMessages.filter((m) => m.groupId === group.id);
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
        return { group, lastMessage: lastMsg };
      })
      .sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          const getTime = (ts: any): number => {
            if (!ts) return 0;
            if (typeof ts === 'number') return ts;
            if (typeof ts?.toMillis === 'function') return ts.toMillis();
            if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
            if (ts instanceof Date) return ts.getTime();
            const parsed = new Date(ts).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getTime(b.lastMessage.timestamp) - getTime(a.lastMessage.timestamp);
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return a.group.name.localeCompare(b.group.name);
      });
  }, [allGroups, groupMessages]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contactsWithMeta;
    const q = searchQuery.toLowerCase();
    return contactsWithMeta.filter(
      ({ user }) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
    );
  }, [contactsWithMeta, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupsWithMeta;
    const q = searchQuery.toLowerCase();
    return groupsWithMeta.filter(({ group }) =>
      group.name.toLowerCase().includes(q)
    );
  }, [groupsWithMeta, searchQuery]);

  // ============ CHAT MESSAGES ============

  const chatMessages = useMemo(() => {
    if (activeGroup) {
      return groupMessages
        .filter((m) => m.groupId === activeGroup.id)
        .sort((a, b) => {
          const getTime = (ts: any): number => {
            if (!ts) return 0;
            if (typeof ts === 'number') return ts;
            if (typeof ts?.toMillis === 'function') return ts.toMillis();
            if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
            if (ts instanceof Date) return ts.getTime();
            const parsed = new Date(ts).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getTime(a.timestamp) - getTime(b.timestamp);
        });
    }

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
  }, [messages, groupMessages, currentUser.id, activeChat, activeGroup, activeProjectId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length]);

  useEffect(() => {
    if (initialChatUser) {
      setActiveTarget({ type: 'user', data: initialChatUser });
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

  const mentionSuggestions = useMemo(() => {
    const pool = activeGroup
      ? users.filter((u) => u.id !== currentUser.id && activeGroup.memberIds.includes(u.id))
      : users.filter((u) => u.id !== currentUser.id);

    if (!mentionQuery && showMentionDropdown) {
      return (activeGroup ? pool : allowedContacts).slice(0, 5);
    }

    if (!mentionQuery) return [];
    const q = mentionQuery.toLowerCase();
    return pool
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [mentionQuery, showMentionDropdown, users, currentUser.id, allowedContacts, activeGroup]);

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

  const renderMessageContent = (content: string, isMine: boolean) => {
    const userNames = users.map((u) => u.name);
    const mentionRegex = /@(\S+(?:\s\S+){0,2})/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIdx = 0;

    while ((match = mentionRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const afterAt = match[1];
      const matchStart = match.index;

      let matchedName = '';
      for (const name of userNames) {
        if (afterAt.startsWith(name) || afterAt.toLowerCase().startsWith(name.toLowerCase())) {
          if (name.length > matchedName.length) {
            matchedName = name;
          }
        }
      }

      if (matchedName) {
        if (matchStart > lastIndex) {
          parts.push(
            <span key={`t-${keyIdx++}`}>
              {content.slice(lastIndex, matchStart)}
            </span>
          );
        }

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

        lastIndex = matchStart + 1 + matchedName.length;
      } else {
        parts.push(
          <span key={`t-${keyIdx++}`}>
            {content.slice(lastIndex, matchStart + fullMatch.length)}
          </span>
        );
        lastIndex = matchStart + fullMatch.length;
      }
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`t-${keyIdx++}`}>{content.slice(lastIndex)}</span>
      );
    }

    return parts.length > 0 ? parts : content;
  };

  // ============ SEND / KEYBOARD ============

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    if (activeGroup) {
      if (!onSendGroupMessage) {
        console.warn('onSendGroupMessage prop is required for group messaging');
        return;
      }
      const content = inputText.trim();
      setSending(true);
      try {
        await onSendGroupMessage(activeGroup.id, content, activeGroup.projectId || activeProjectId || undefined);
        setInputText('');
        setShowMentionDropdown(false);
        setMentionQuery('');
      } finally {
        setSending(false);
      }
      return;
    }

    if (!activeChat) return;
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

  // ============ GROUP CREATION ============

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0 || !onCreateGroup) return;
    try {
      await onCreateGroup(
        newGroupName.trim(),
        [...selectedMembers, currentUser.id],
        selectedProject || undefined
      );
      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedMembers([]);
      setSelectedProject('');
      setMemberSearchQuery('');
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredMemberOptions = useMemo(() => {
    const pool = allowedContacts;
    if (!memberSearchQuery.trim()) return pool;
    const q = memberSearchQuery.toLowerCase();
    return pool.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [allowedContacts, memberSearchQuery]);

  // ============ HELPERS ============

  const formatTime = (timestamp: any) => {
    try {
      let date: Date;
      if (typeof timestamp?.toDate === 'function') {
        date = timestamp.toDate();
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

  const getUserById = (id: string) => users.find((u) => u.id === id);

  const getGroupMemberCount = (group: GroupChat) => group.memberIds.length;

  // ============ RENDER ============

  return (
    <div className="h-full flex flex-col md:flex-row bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* CONTACTS / GROUPS PANEL */}
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
          {/* Create Group Button */}
          {onCreateGroup && (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="h-7 w-7 rounded-lg bg-care-orange/10 flex items-center justify-center text-care-orange hover:bg-care-orange/20 transition-colors"
              title="New Group"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Tab Toggle: Direct | Groups */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setChatTab('direct')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                chatTab === 'direct'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserIcon size={12} />
              Direct
            </button>
            <button
              onClick={() => setChatTab('groups')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                chatTab === 'groups'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={12} />
              Groups
              {allGroups.length > 0 && (
                <span className="text-[9px] bg-care-orange/10 text-care-orange px-1.5 py-0.5 rounded-full font-bold">
                  {allGroups.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-3 pt-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={chatTab === 'direct' ? 'Search contacts' : 'Search groups'}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:border-care-orange focus:ring-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* DIRECT MESSAGES TAB */}
          {chatTab === 'direct' && (
            <>
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
                      setActiveTarget({ type: 'user', data: user });
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
            </>
          )}

          {/* GROUPS TAB */}
          {chatTab === 'groups' && (
            <>
              {filteredGroups.length === 0 && (
                <div className="p-6 text-xs text-gray-400 text-center">
                  <Users size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-gray-500">No groups yet</p>
                  <p className="mt-1">
                    {onCreateGroup
                      ? 'Project channels appear automatically. Tap + to create a custom group.'
                      : 'Groups will appear when you are assigned to projects.'}
                  </p>
                </div>
              )}

              {filteredGroups.map(({ group, lastMessage }) => {
                const isProjectGroup = group.id.startsWith('project-');
                const senderName = lastMessage
                  ? getUserById(lastMessage.senderId)?.name?.split(' ')[0] || 'Unknown'
                  : '';

                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setActiveTarget({ type: 'group', data: group });
                      setShowContacts(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      activeGroup?.id === group.id ? 'bg-care-orange/5' : ''
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-semibold ${
                        isProjectGroup
                          ? 'bg-care-orange/10 text-care-orange'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isProjectGroup ? <Hash size={16} /> : <Users size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {group.name}
                        </p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {getGroupMemberCount(group)}
                        </span>
                      </div>
                      {lastMessage ? (
                        <p className="text-[11px] text-gray-500 truncate">
                          {lastMessage.senderId === currentUser.id ? 'You' : senderName}:{' '}
                          {lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400 truncate italic">
                          {isProjectGroup ? 'Project channel' : 'No messages yet'}
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
            </>
          )}
        </div>
      </div>

      {/* ============ CREATE GROUP MODAL ============ */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">Create Group</p>
                <p className="text-[11px] text-gray-400">Add members for a group conversation</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateGroup(false);
                  setNewGroupName('');
                  setSelectedMembers([]);
                  setSelectedProject('');
                  setMemberSearchQuery('');
                }}
                className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Group Name */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Kitchen Renovation Team"
                  className="w-full mt-1.5 text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:border-care-orange focus:ring-0"
                />
              </div>

              {/* Optional Project Link */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Link to Project (optional)
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full mt-1.5 text-xs rounded-xl border border-gray-200 py-2.5 px-3 focus:border-care-orange focus:ring-0 bg-white"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || p.name || p.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Member Selection */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Members ({selectedMembers.length} selected)
                </label>

                {/* Selected Members Chips */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                    {selectedMembers.map((id) => {
                      const user = getUserById(id);
                      if (!user) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 bg-care-orange/10 text-care-orange text-[10px] font-bold px-2 py-1 rounded-lg"
                        >
                          {user.name}
                          <button
                            onClick={() => toggleMember(id)}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Member Search */}
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:border-care-orange focus:ring-0"
                  />
                </div>

                {/* Member List */}
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
                  {filteredMemberOptions.map((user) => {
                    const isSelected = selectedMembers.includes(user.id);
                    const roleBadge = getRoleBadge(user.role);
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleMember(user.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-care-orange/5' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-care-orange border-care-orange'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                        <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-900 truncate">
                              {user.name}
                            </span>
                            <span
                              className={`text-[8px] px-1 py-0.5 rounded-full ${roleBadge.bg} ${roleBadge.text}`}
                            >
                              {roleBadge.label}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateGroup(false);
                  setNewGroupName('');
                  setSelectedMembers([]);
                  setSelectedProject('');
                  setMemberSearchQuery('');
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-care-orange rounded-xl hover:bg-care-orange/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-care-orange/30 transition-all"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ CHAT PANEL ============ */}
      <div className="flex-1 flex flex-col bg-white">
        {(activeChat || activeGroup) ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
              <button
                onClick={() => setShowContacts(true)}
                className="md:hidden p-1 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Avatar */}
              {activeChat && (
                <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700">
                  {activeChat.name.charAt(0).toUpperCase()}
                </div>
              )}
              {activeGroup && (
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                    activeGroup.id.startsWith('project-')
                      ? 'bg-care-orange/10 text-care-orange'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {activeGroup.id.startsWith('project-') ? (
                    <Hash size={16} />
                  ) : (
                    <Users size={16} />
                  )}
                </div>
              )}

              {/* Title */}
              <div className="flex-1 min-w-0">
                {activeChat && (
                  <>
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
                  </>
                )}
                {activeGroup && (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {activeGroup.name}
                      </p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {getGroupMemberCount(activeGroup)} members
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      {activeGroup.memberIds
                        .map((id) => getUserById(id)?.name?.split(' ')[0])
                        .filter(Boolean)
                        .slice(0, 4)
                        .join(', ')}
                      {activeGroup.memberIds.length > 4 && ` +${activeGroup.memberIds.length - 4} more`}
                    </p>
                  </>
                )}
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
                  {activeGroup ? (
                    <>
                      <Users size={32} className="mx-auto mb-3 opacity-40" />
                      <p className="font-bold text-gray-500">No messages yet</p>
                      <p>Be the first to post in this group.</p>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
                      <p className="font-bold text-gray-500">No messages yet</p>
                      <p>Send a message to start the conversation.</p>
                    </>
                  )}
                </div>
              )}

              {chatMessages.map((m) => {
                const isMine = m.senderId === currentUser.id;
                const sender = activeGroup ? getUserById(m.senderId) : null;

                return (
                  <div
                    key={m.id || `${m.senderId}-${m.timestamp}`}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Group avatar for other people's messages */}
                    {activeGroup && !isMine && (
                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-semibold text-gray-600 mr-2 mt-1 flex-shrink-0">
                        {sender?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}

                    <div className="max-w-[75%]">
                      {/* Sender name in group chats */}
                      {activeGroup && !isMine && sender && (
                        <p className="text-[10px] font-bold text-gray-500 mb-0.5 ml-1">
                          {sender.name}
                          {(() => {
                            const badge = getRoleBadge(sender.role);
                            return (
                              <span
                                className={`ml-1.5 text-[8px] px-1 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}
                        </p>
                      )}

                      <div
                        className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isMine
                            ? 'bg-care-orange text-white rounded-br-sm'
                            : 'bg-white text-gray-900 rounded-bl-sm'
                        }`}
                      >
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
                      activeGroup
                        ? `Message ${activeGroup.name}... use @ to mention`
                        : activeProjectId
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
                  disabled={!inputText.trim() || sending || (!activeChat && !activeGroup)}
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
                  ? 'Choose a contact or group from the left to start messaging.'
                  : 'Choose a contact or project group to start messaging.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;