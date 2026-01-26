
import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, Search, MoreVertical, MessageSquare, ChevronLeft, ShieldCheck, HardHat, UserCircle, Plus, AtSign } from 'lucide-react';
import { User, Message, UserRole } from '../types';

interface MessagingProps {
  currentUser: User;
  users: User[];
  initialChatUser?: User | null;
  onClearInitialChat?: () => void;
}

const Messaging: React.FC<MessagingProps> = ({ currentUser, users, initialChatUser, onClearInitialChat }) => {
  const [activeChat, setActiveChat] = useState<User | null>(null);
  const [showContacts, setShowContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', senderId: 'u2', receiverId: currentUser.id, projectId: 'p1', content: 'Materials arrived for the kitchen demo. We are starting at 8 AM tomorrow.', timestamp: new Date(Date.now() - 86400000).toISOString() }
  ]);
  const [inputText, setInputText] = useState('');
  
  // Tagging State
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionListIndex, setMentionListIndex] = useState(0);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChat]);

  useEffect(() => {
    if (initialChatUser) {
      setActiveChat(initialChatUser);
      setShowContacts(false);
      onClearInitialChat?.();
    }
  }, [initialChatUser]);

  const chatPartners = users.filter(u => u.id !== currentUser.id);
  
  const filteredPartners = chatPartners.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.specialty && u.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter mention list based on current query after @
  const mentionSuggestions = users.filter(u => 
    u.name.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const selectionStart = e.target.selectionStart || 0;
    setInputText(value);

    // Detect @ for tagging
    const lastAtPos = value.lastIndexOf('@', selectionStart - 1);
    if (lastAtPos !== -1) {
      const textAfterAt = value.slice(lastAtPos + 1, selectionStart);
      // Only show if there's no space between @ and cursor
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setShowMentionList(true);
        setMentionCursorPos(lastAtPos);
        setMentionListIndex(0);
        return;
      }
    }
    setShowMentionList(false);
  };

  const selectMention = (user: User) => {
    const before = inputText.slice(0, mentionCursorPos);
    const after = inputText.slice(inputRef.current?.selectionStart || mentionCursorPos);
    const newText = `${before}@${user.name} ${after}`;
    setInputText(newText);
    setShowMentionList(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionListIndex(prev => (prev + 1) % mentionSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionListIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (mentionSuggestions[mentionListIndex]) {
          selectMention(mentionSuggestions[mentionListIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentionList(false);
      }
    } else if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const newMessage: Message = { 
      id: Math.random().toString(36).substring(7), 
      senderId: currentUser.id, 
      receiverId: activeChat.id, 
      projectId: 'p1', 
      content: inputText, 
      timestamp: new Date().toISOString() 
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowMentionList(false);
  };

  const handleSelectChat = (user: User) => {
    setActiveChat(user);
    setShowContacts(false);
    setSearchQuery('');
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <ShieldCheck size={12} />;
      case UserRole.CONTRACTOR: return <HardHat size={12} />;
      default: return <UserCircle size={12} />;
    }
  };

  const currentChatMessages = messages.filter(m => 
    (m.senderId === currentUser.id && m.receiverId === activeChat?.id) ||
    (m.senderId === activeChat?.id && m.receiverId === currentUser.id)
  );

  // Helper to highlight mentions in message text
  const formatMessage = (text: string) => {
    const parts = text.split(/(@[a-zA-Z\s]+(?:\s|$))/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.trim().substring(1);
        const exists = users.some(u => u.name === name);
        if (exists) {
          return <span key={i} className="text-care-orange font-black">@{name}</span>;
        }
      }
      return part;
    });
  };

  return (
    <div className="flex h-[calc(100vh-160px)] md:h-[calc(100vh-130px)] bg-white rounded-[2.5rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden relative">
      {/* Sidebar - Contacts */}
      <div className={`
        absolute inset-0 z-20 bg-white flex flex-col transition-transform duration-300
        md:relative md:w-80 md:translate-x-0 md:z-auto md:border-r md:border-gray-50
        ${showContacts ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black uppercase tracking-tight">Messages</h2>
            <button className="p-2 bg-gray-50 text-gray-400 hover:text-care-orange rounded-xl transition-all">
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search team..." 
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-care-orange/20" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {['Admins', 'Contractors', 'Clients'].map((group) => {
            const role = group === 'Admins' ? UserRole.ADMIN : group === 'Contractors' ? UserRole.CONTRACTOR : UserRole.CLIENT;
            const filtered = filteredPartners.filter(p => p.role === role);
            if (filtered.length === 0) return null;
            return (
              <div key={group} className="py-2">
                <p className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{group}</p>
                {filtered.map(partner => (
                  <button 
                    key={partner.id} 
                    onClick={() => handleSelectChat(partner)} 
                    className={`w-full px-6 py-4 flex items-center gap-4 transition-all border-l-4 ${
                      activeChat?.id === partner.id 
                        ? 'bg-care-orange/5 border-care-orange' 
                        : 'hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img src={partner.avatar} className="w-12 h-12 rounded-2xl border border-gray-100 object-cover" />
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm border border-gray-50`}>
                        {getRoleIcon(partner.role)}
                      </div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-black text-sm text-gray-900 truncate">{partner.name}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate mt-0.5">
                        {partner.specialty || partner.role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`
        flex-1 flex flex-col bg-gray-50/30 transition-transform duration-300
        ${!showContacts ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {activeChat ? (
          <>
            <div className="p-4 md:px-8 bg-white border-b border-gray-50 flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowContacts(true)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-care-orange transition-colors"><ChevronLeft size={24} /></button>
                <div className="relative">
                  <img src={activeChat.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <p className="font-black text-sm md:text-base text-gray-900">{activeChat.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-care-orange font-black uppercase tracking-widest px-2 py-0.5 bg-care-orange/10 rounded-full">{activeChat.role}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Active Now</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="hidden md:flex p-3 bg-gray-50 text-gray-400 hover:text-care-orange rounded-xl transition-all"><MoreVertical size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
              {currentChatMessages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] md:max-w-[65%] group`}>
                      <div className={`p-4 md:p-5 rounded-3xl shadow-sm ${
                        isMe 
                          ? 'bg-[#1A1A1A] text-white rounded-tr-none' 
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        <p className="text-sm font-medium leading-relaxed">{formatMessage(msg.content)}</p>
                      </div>
                      <p className={`text-[9px] font-black uppercase tracking-widest mt-2 flex items-center gap-2 ${isMe ? 'flex-row-reverse text-gray-400' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && <span className="text-care-orange">Delivered</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:p-8 bg-white border-t border-gray-50 relative">
              {/* Mention Suggestion List */}
              {showMentionList && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-4 md:left-8 mb-4 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30 animate-in slide-in-from-bottom-4">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <AtSign size={12} className="text-care-orange" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Tag Team Member</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {mentionSuggestions.map((u, idx) => (
                      <button
                        key={u.id}
                        onMouseEnter={() => setMentionListIndex(idx)}
                        onClick={() => selectMention(u)}
                        className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${mentionListIndex === idx ? 'bg-care-orange/5' : ''}`}
                      >
                        <img src={u.avatar} className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <p className="text-xs font-black text-gray-900">{u.name}</p>
                          <p className="text-[9px] font-bold text-care-orange uppercase tracking-widest">{u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-gray-50 rounded-[2rem] px-6 py-2 border-2 border-transparent focus-within:border-care-orange/20 transition-all">
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder={`Type a message to ${activeChat.name.split(' ')[0]}... (Type @ to tag)`} 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-4 font-bold text-gray-700" 
                  value={inputText} 
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                />
                <div className="flex items-center gap-2">
                  <button 
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-3.5 bg-care-orange text-white rounded-2xl shadow-xl shadow-care-orange/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white relative">
            <div className="w-28 h-28 bg-gray-50 rounded-[3rem] flex items-center justify-center mb-8 text-care-orange shadow-inner group">
               <MessageSquare size={44} className="group-hover:scale-110 transition-transform duration-500" />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tight mb-4 text-gray-900">Site Communications</h3>
            <p className="text-gray-400 max-w-sm font-medium text-base leading-relaxed mb-8">
              Stay connected with your project team. Select a contractor, admin, or client to start a secure conversation.
            </p>
            <button 
              onClick={() => setShowContacts(true)}
              className="md:hidden bg-care-orange text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-2xl transition-all"
            >
              View Contacts
            </button>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e2e2e2;
        }
      `}</style>
    </div>
  );
};

export default Messaging;
