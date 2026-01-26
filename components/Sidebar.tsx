
import React from 'react';
import { LayoutDashboard, Briefcase, MessageSquare, Settings, LogOut, Users, FileText, X, Calendar } from 'lucide-react';
import { User, UserRole } from '../types';
import { Logo } from '../constants';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT] },
    { id: 'projects', label: 'Projects', icon: Briefcase, roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT] },
    { id: 'calendar', label: 'Calendar', icon: Calendar, roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT] },
    { id: 'messages', label: 'Messages', icon: MessageSquare, roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT] },
    { id: 'users', label: 'Directory', icon: Users, roles: [UserRole.ADMIN, UserRole.CONTRACTOR] },
    { id: 'documents', label: 'Documents', icon: FileText, roles: [UserRole.ADMIN, UserRole.CONTRACTOR] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed left-0 top-0 h-full w-72 bg-[#1A1A1A] text-white flex flex-col z-[70]
        transition-transform duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:w-64
      `}>
        <div className="p-6 flex justify-between items-center">
          <Logo />
          <button onClick={onClose} className="md:hidden p-2 text-white/50 hover:text-white"><X size={24} /></button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-care-orange text-white shadow-lg shadow-care-orange/20' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-bold text-sm uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-6">
          <div className="flex items-center gap-4">
            <img src={user.avatar} className="w-10 h-10 rounded-xl border border-white/10" />
            <div className="overflow-hidden">
              <p className="text-sm font-black truncate">{user.name}</p>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 text-white/30 hover:text-care-orange transition-colors font-bold uppercase text-[10px] tracking-widest">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
