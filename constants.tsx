
import React from 'react';
import { User, Project, UserRole, ProjectStatus, Document } from './types';

export const COLORS = {
  primary: '#F15A2B', // Care Orange
  dark: '#1A1A1A',    // Deep Dark
  accent: '#FDEEE9',  // Light Orange tint
};

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@caregencon.com', role: UserRole.ADMIN, avatar: 'https://i.pravatar.cc/150?u=u1', bio: 'Lead coordinator.', phone: '(555) 123-4567' },
  { id: 'u2', name: 'John Smith', email: 'john@contractor.com', role: UserRole.CONTRACTOR, avatar: 'https://i.pravatar.cc/150?u=u2', specialty: 'Carpentry', experience: '15 Years', bio: 'Precision craftsman.', phone: '(555) 987-6543', location: 'Oakland, CA' },
  { id: 'u3', name: 'Sarah Connor', email: 'sarah@client.com', role: UserRole.CLIENT, avatar: 'https://i.pravatar.cc/150?u=u3', phone: '(555) 456-7890', bio: 'Residential homeowner.' },
  { id: 'u4', name: 'Michael Scott', email: 'michael@contractor.com', role: UserRole.CONTRACTOR, avatar: 'https://i.pravatar.cc/150?u=u4', specialty: 'Electrical', experience: '8 Years', bio: 'Smart home expert.', phone: '(555) 222-3333', location: 'San Jose, CA' }
];

export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', title: 'Kitchen Remodel - Connor', description: 'Full kitchen renovation.', status: ProjectStatus.ROUGH_IN, progress: 45, clientId: 'u3', contractorId: 'u2', startDate: '2024-01-15', estimatedEndDate: '2024-03-20', budget: 45000, spent: 22000, updates: [{ id: 'up1', timestamp: '2024-02-01T10:00:00Z', author: 'John Smith', content: 'Demo complete.', imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=800' }] },
  { id: 'p2', title: 'Basement Finishing', description: 'Theater and gym space.', status: ProjectStatus.PLANNING, progress: 10, clientId: 'u3', contractorId: 'u4', startDate: '2024-02-10', estimatedEndDate: '2024-05-15', budget: 65000, spent: 5000, updates: [] }
];

export const MOCK_DOCUMENTS: Document[] = [
  { id: 'd1', title: 'Final Contract', fileName: 'contract.pdf', fileSize: '2.4 MB', uploadedBy: 'Admin', uploadedAt: '2024-01-10T09:00:00Z', projectId: 'p1', category: 'Contract' }
];

export const Logo = ({ light = false, compact = false }: { light?: boolean, compact?: boolean }) => (
  <div className="flex items-center gap-3">
    <div className={`relative ${compact ? 'w-10 h-10' : 'w-12 h-12'} ${light ? 'bg-white' : 'bg-[#F15A2B]'} rounded-xl flex items-center justify-center shadow-lg shadow-black/10 transition-all`}>
        <svg viewBox="0 0 24 24" className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} ${light ? 'text-[#F15A2B]' : 'text-white'} fill-current`}>
          <path d="M12 3L4 9V21H20V9L12 3ZM12 17.5C10.5 17.5 9 16.5 9 15C9 14.1 9.4 13.5 10 13C10.6 12.5 11 11.9 11 11H13C13 11.9 13.4 12.5 14 13C14.6 13.5 15 14.1 15 15C15 16.5 13.5 17.5 12 17.5Z" />
        </svg>
    </div>
    {!compact && (
      <div className="flex flex-col leading-[1.1]">
        <span className={`text-2xl font-black tracking-tighter uppercase ${light ? 'text-white' : 'text-[#1A1A1A]'}`}>Care</span>
        <span className={`text-[11px] uppercase font-bold tracking-widest ${light ? 'text-white/70' : 'text-gray-500'}`}>Construction</span>
      </div>
    )}
  </div>
);
