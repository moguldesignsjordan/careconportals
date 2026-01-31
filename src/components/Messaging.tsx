import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, User as UserIcon, MessageSquare, ChevronLeft, ShieldCheck, HardHat, UserCircle, Loader2 } from 'lucide-react';
import { User, UserRole, Message } from '../types';

interface MessagingProps {
  currentUser: User;
  users: User[];
  messages: Message[];
  onSendMessage: (receiverId: string, content: string, projectId?: string) => Promise<void>;
  initialChatUser?: User | null;
}

const Messaging: React.FC<MessagingProps> = ({ currentUser, users, messages, onSendMessage, initialChatUser }) => {
  const [activeChat, setActiveChat] = useState<User | null>(initialChatUser || null);
  const [showContacts, setShowContacts] = useState(!initialChatUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Filter messages for active chat
  const chatMessages = activeChat ? messages.filter(
    m => (m.senderId === currentUser.id && m.receiverId === activeChat.id) ||
         (m.senderId === activeChat.id && m.receiverId === currentUser.id)
  ) : [];

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length, activeChat]);

  useEffect(() => {
    if (initialChatUser) {
      setActiveChat(initialChatUser);
      setShowContacts(false);
    }
  }, [initialChatUser]);

  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const filteredUsers = otherUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || sending) return;

    setSending(true);
    try {
      await onSendMessage(activeChat.id, inputText.trim());
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return <ShieldCheck size={12} className="text-purple-500" />;
      case UserRole.CONTRACTOR: return <HardHat size={12} className="text-care-orange" />;
      default: return <UserCircle size={12} className="text-green-500" />;
    }
  };

  // Get user avatar with fallback
  const getUserAvatar = (user: User) => {
    return user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=F15A2B&color=fff`;
  };

  return (
    <div className="h-[calc(100vh-12rem)] bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex">
      {/* Contacts Sidebar */}
      <div className={`
        w-full md:w-80 border-r border-gray-100 flex flex-col
        ${showContacts ? 'block' : 'hidden md:flex'}
      `}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-black mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  setActiveChat(user);
                  setShowContacts(false);
                }}
                className={`
                  w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-all text-left border-b border-gray-50
                  ${activeChat?.id === user.id ? 'bg-care-orange/5 border-l-4 border-l-care-orange' : ''}
                `}
              >
                <div className="relative">
                  <img 
                    src={getUserAvatar(user)} 
                    alt={user.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    {getRoleIcon(user.role)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.role}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">
              <UserIcon size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No contacts found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`
        flex-1 flex flex-col
        ${!showContacts ? 'block' : 'hidden md:flex'}
      `}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button 
                onClick={() => setShowContacts(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <img 
                src={getUserAvatar(activeChat)} 
                alt={activeChat.name}
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <p className="font-bold">{activeChat.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {getRoleIcon(activeChat.role)}
                  {activeChat.role}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {chatMessages.length > 0 ? (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[70%] p-4 rounded-2xl
                      ${msg.senderId === currentUser.id 
                        ? 'bg-care-orange text-white rounded-br-sm' 
                        : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'}
                    `}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.senderId === currentUser.id ? 'text-white/60' : 'text-gray-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
                    <p>Start a conversation with {activeChat.name}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="px-6 py-3 bg-care-orange text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-orange-600 transition-all"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-bold">Select a conversation</p>
              <p className="text-sm">Choose a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;
