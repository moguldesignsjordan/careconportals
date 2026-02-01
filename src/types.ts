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

export enum ProjectStatus {
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

export interface Project {
  id: string;
  title: string;
  description: string;
  location?: string;
  status: ProjectStatus | string; // Allow string for flexible status values
  progress: number;
  clientId: string;
  contractorId: string;
  startDate: string;
  estimatedEndDate: string;
  budget: number;
  spent: number;
  coverImage?: string; // Cover image for project cards
  updates: ProjectUpdate[];
  milestones?: Milestone[];
  createdAt?: string;
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

// Calendar Event type for the calendar module
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'milestone' | 'deadline' | 'start' | 'meeting';
  projectId?: string;
  projectTitle?: string;
  completed?: boolean;
}