// src/types.ts - UPDATED WITH FIXES

export enum UserRole {
  ADMIN = 'ADMIN',
  CONTRACTOR = 'CONTRACTOR',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  specialty?: string;
  experience?: string;
  bio?: string;
  location?: string;
  company?: string;
  createdAt?: string;
}

// FIXED: Added PENDING_APPROVAL status
export enum ProjectStatus {
  PENDING_APPROVAL = 'Pending Approval',  // ← ADDED
  PLANNING = 'Planning',
  DEMOLITION = 'Demolition',
  ROUGH_IN = 'Rough-in',
  FINISHING = 'Finishing',
  COMPLETED = 'Completed',
  ON_HOLD = 'On Hold'
}

export interface ProjectUpdate {
  id: string;
  timestamp: string;
  author: string;
  content: string;
  imageUrl?: string;
}

// Phase IDs for project timeline
export type PhaseId = 'planning' | 'demolition' | 'rough-in' | 'finishing' | 'completed';

// Comment on a milestone
export interface MilestoneComment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: string;
  imageUrl?: string;
}

// Enhanced milestone with phase tracking
export interface Milestone {
  id: string;
  phaseId: PhaseId;
  title: string;
  description?: string;
  date: string;
  dueDate?: string; // Legacy support
  completed?: boolean; // Legacy support
  completedAt?: string;
  imageUrl?: string;
  imageUrls?: string[]; // Multiple images support
  comments?: MilestoneComment[];
  status: 'pending' | 'in-progress' | 'completed';
  order?: number; // Legacy support
}

// FIXED: Added rejectionReason, contractorIds, clientIds
export interface Project {
  id: string;
  title: string;
  name?: string; // ← ADDED (alias for title in some contexts)
  description: string;
  location?: string;
  status: ProjectStatus | string; // Allow string for flexible status values
  progress: number;
  clientId: string;
  clientIds?: string[]; // ← ADDED (for multiple clients support)
  contractorId: string;
  contractorIds?: string[]; // ← ADDED (for multiple contractors support)
  startDate: string;
  estimatedEndDate: string;
  budget: number;
  spent: number;
  coverImage?: string; // Cover image for project cards
  updates: ProjectUpdate[]; // Already exists but ensuring it's here
  milestones?: Milestone[];
  createdAt?: string;
  rejectionReason?: string; // ← ADDED (for rejected projects)
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  projectId?: string;
  content: string;
  timestamp: string;
}

export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  projectId?: string;
  category: 'Contract' | 'Blueprint' | 'Permit' | 'Invoice' | 'Other';
}

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  category?: string;
}

// FIXED: Aligned CalendarEvent with CalendarPage.tsx expectations
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string; // ← ADDED
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // ← ADDED HH:MM format
  endTime?: string; // ← ADDED
  location?: string; // ← ADDED
  type: 'inspection' | 'meeting' | 'delivery' | 'site-visit' | 'deadline' | 'other'; // ← UPDATED
  projectId?: string;
  projectTitle?: string;
  attendeeIds: string[]; // ← ADDED (was missing)
  createdBy: string; // ← ADDED
  createdAt: string; // ← ADDED
  completed?: boolean; // Keep for backward compatibility
}