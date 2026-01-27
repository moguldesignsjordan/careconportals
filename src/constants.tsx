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
  <div className="flex items-center gap-4">
    {/* UPDATED: Using care.png from public folder instead of SVG */}
    <img 
      src="/care.png" 
      alt="Care General Construction" 
      className={`${compact ? 'w-20 h-20' : 'w-20 h-20'} object-contain`}
    />
    

  </div>
);