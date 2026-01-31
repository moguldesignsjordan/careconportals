import React from 'react';
import { User, UserRole } from '../types';
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  MessageSquare,
  Users,
  FileText,
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
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      roles: [UserRole.ADMIN, UserRole.CONTRACTOR, UserRole.CLIENT],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      roles: [UserRole.ADMIN],
    },
  ];

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  const handleNavClick = (id: string) => {
    onNavigate(id);
    onClose(); // close drawer on mobile
  };

  const roleLabel =
    currentUser.role === UserRole.ADMIN
      ? 'Admin'
      : currentUser.role === UserRole.CONTRACTOR
      ? 'Contractor'
      : 'Client';

  return (
    <aside
      className={`
        bg-[#1A1A1A] text-white w-72
        fixed top-0 left-0 z-50 h-full
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0
        flex flex-col
      `}
    >
      {/* HEADER */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
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
          <X size={18} />
        </button>
      </div>

      {/* USER PILL */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-care-orange flex items-center justify-center text-xs font-bold">
            {currentUser.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate">
              {currentUser.name ?? 'User'}
            </span>
            <span className="text-[11px] font-medium text-white/50 uppercase tracking-[0.16em]">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* NAV – scrollable middle */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors
                ${
                  isActive
                    ? 'bg-care-orange text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <Icon size={18} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* SIGN OUT – pinned with padding */}
      <div className="border-t border-white/10 px-4 py-4">
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
    </aside>
  );
};

export default Sidebar;
