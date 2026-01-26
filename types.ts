
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

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  clientId: string;
  contractorId: string;
  startDate: string;
  estimatedEndDate: string;
  budget: number;
  spent: number;
  updates: ProjectUpdate[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  projectId: string;
  content: string;
  timestamp: string;
}

export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
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
