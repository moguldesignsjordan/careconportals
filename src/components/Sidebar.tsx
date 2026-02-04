import React from 'react';
import { User, UserRole } from '../types';
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { Logo } from '../constants';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  onNavigate: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT],
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: Briefcase,
      roles: [UserRole.ADMIN, UserRole.CONTRACTOR],
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      roles: [UserRole.ADMIN, UserRole.CONTRACTOR],
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT],
    },
    {
      id: 'directory',
      label: 'Directory',
      icon: Users,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT],
    },
  ];

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  const handleNavClick = (id: string) => {
    onNavigate(id);
    onClose();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#050816] border-r border-white/10 lg:static lg:translate-x-0 transform transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Logo />
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.18em]">
              CareCon
            </span>
            <span className="text-sm font-semibold">Construction Ops</span>
          </div>
        </div>

        {/* Mobile close */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={18} className="text-white/70" />
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-white">
              {currentUser.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">
              {currentUser.name}
            </span>
            <span className="text-[11px] text-white/50 uppercase tracking-[0.18em]">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 space-y-1 overflow-y-auto h-[calc(100%-140px)]">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-[#050816]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Sign out */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => onNavigate('logout')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                     text-white/70 hover:text-care-orange hover:bg-care-orange/10 transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
